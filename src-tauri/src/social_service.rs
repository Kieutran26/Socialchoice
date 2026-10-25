use crate::{social_accounts,social_http,social_loopback,social_types::{Envelope,PROVIDERS},social_vault,store::{Store,database_error},Workspace};
use serde_json::{json,Value};
use std::{sync::{Arc,Mutex,atomic::{AtomicBool,Ordering}},time::{Duration,Instant}};

pub struct Pending {pub brand:String,pub envelope:Envelope,pub created:Instant}
pub struct Runtime {pub pending:Mutex<Option<Pending>>,pub gate:Mutex<()>,pub cancel:AtomicBool}
impl Runtime {pub fn new()->Self{Self{pending:Mutex::new(None),gate:Mutex::new(()),cancel:AtomicBool::new(false)}}}
pub struct State(pub Arc<Runtime>);
fn provider<'a>(service:&'a str,args:&'a [Value])->Result<&'a str,String>{
    let value=if service=="meta"{args.get(1).and_then(Value::as_str).unwrap_or("facebook")}else{service};
    if !PROVIDERS.contains(&value){return Err("Unsupported connection platform".into());}Ok(value)
}
pub fn pending(runtime:&Runtime,service:&str)->Result<Value,String>{
    let mut pending=runtime.pending.lock().map_err(|_|"Connection selection is unavailable")?;
    if pending.as_ref().is_some_and(|p|p.created.elapsed()>Duration::from_secs(600)){pending.take();}
    let Some(pending)=pending.as_ref().filter(|p|p.envelope.provider==service||service=="meta"&&["facebook","instagram"].contains(&p.envelope.provider.as_str()))else{return Ok(json!({"pending":false}));};
    let items=pending.envelope.verified.destinations.iter().map(|v|v.public()).collect::<Vec<_>>();
    Ok(json!({"pending":true,"platform":pending.envelope.provider,"brandId":pending.brand,"profileName":pending.envelope.verified.profile_name,"pages":items,"profile":items.first()}))
}
pub fn run(runtime:&Runtime,workspace:&Arc<Mutex<Store>>,path:&str,args:&[Value])->Result<Value,String>{
    let parts=path.split('/').collect::<Vec<_>>();if parts.len()!=2{return Err("Invalid connection request".into());}
    let (service,operation)=(parts[0],parts[1]);
    if service=="social"&&operation=="cancel" {let mut pending=runtime.pending.lock().map_err(|_|"Connection selection is unavailable")?;runtime.cancel.store(true,Ordering::Release);pending.take();return Ok(json!({"cancelled":true}));}
    if !["meta","threads","linkedin","tiktok"].contains(&service){return Err("Unsupported connection platform".into());}
    if operation=="pages"||operation=="profile"{return pending(runtime,service);}
    if operation=="status" {
        let Ok(origin)=social_http::broker_origin()else{return Ok(json!({"ready":false,"desktop":true,"reason":"login_service_not_configured"}));};
        let health=social_http::json(&social_http::client()?,origin.join("/status").map_err(|_|"Invalid login service")?,None)?;
        if health["protocol"]!=1{return Err("Unsupported login service protocol".into());}
        let p=if service=="meta"{"facebook"}else{service};
        return Ok(json!({"ready":health["providers"][p]==true,"platforms":health["providers"],"desktop":true,"mode":if service=="tiktok"{"sandbox"}else{"standard"}}));
    }
    {let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;store.policy.require(&store.root,"write")?;}
    if operation=="start" {
        let _gate=runtime.gate.try_lock().map_err(|_|"Another sign-in is already running")?;
        runtime.cancel.store(false,Ordering::Release);
        let selected=provider(service,args)?;
        let brand=args.first().and_then(Value::as_str).ok_or("Choose brand")?.to_owned();
        {let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;social_accounts::active_brand(&store,&brand)?;}
        runtime.pending.lock().map_err(|_|"Connection selection is unavailable")?.take();
        let origin=social_http::broker_origin()?;let login=social_loopback::Login::create()?;
        let mut url=origin.join("/start").map_err(|_|"Invalid login service")?;
        url.query_pairs_mut().extend_pairs([("provider",selected),("state",login.state.as_str()),("challenge",login.challenge.as_str()),("redirect",login.redirect.as_str())]);
        social_loopback::open_browser(&url)?;
        let ticket=zeroize::Zeroizing::new(login.wait(&runtime.cancel,Duration::from_secs(600))?);
        if runtime.cancel.load(Ordering::Acquire){return Err("Sign-in cancelled".into());}
        let input=zeroize::Zeroizing::new(serde_json::to_vec(&json!({"ticket":ticket.as_str(),"verifier":login.verifier.as_str()})).map_err(|_|"Invalid sign-in proof")?);
        let response=social_http::client()?.post(origin.join("/exchange").map_err(|_|"Invalid login service")?).header("Content-Type","application/json").body(input.to_vec()).send().map_err(|_|"Sign-in exchange could not be confirmed. Start a new login.")?;
        let bytes=social_http::response(response)?;let envelope:Envelope=serde_json::from_slice(&bytes).map_err(|_|"Invalid sign-in response")?;envelope.validate(selected)?;
        if runtime.cancel.load(Ordering::Acquire){return Err("Sign-in cancelled".into());}
        {let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;store.policy.require(&store.root,"write")?;social_accounts::active_brand(&store,&brand)?;}
        {let mut holder=runtime.pending.lock().map_err(|_|"Connection selection is unavailable")?;if runtime.cancel.load(Ordering::Acquire){return Err("Sign-in cancelled".into());}*holder=Some(Pending{brand,envelope,created:Instant::now()});}
        let mut value=pending(runtime,service)?;value["native"]=json!(true);return Ok(value);
    }
    if operation=="import" {
        let mut holder=runtime.pending.lock().map_err(|_|"Connection selection is unavailable")?;
        if runtime.cancel.load(Ordering::Acquire){holder.take();return Err("Sign-in cancelled".into());}
        let selection=holder.as_ref().filter(|p|p.created.elapsed()<Duration::from_secs(600)).ok_or("Sign in again before selecting accounts")?;
        let platform=&selection.envelope.provider;
        if !(service==platform||service=="meta"&&["facebook","instagram"].contains(&platform.as_str())){return Err("Connection platform mismatch".into());}
        let ids=if service=="meta"{args.first().and_then(Value::as_array).ok_or("Select accounts")?.iter().map(|id|id.as_str().ok_or("Invalid account ID")).collect::<Result<Vec<_>,_>>()?}else{vec![args.first().and_then(Value::as_str).ok_or("Select an account")?]};
        if ids.is_empty()||ids.len()>30||ids.iter().collect::<std::collections::HashSet<_>>().len()!=ids.len(){return Err("Select 1–30 different accounts".into());}
        let destinations=ids.iter().map(|id|selection.envelope.verified.destinations.iter().find(|d|d.id==*id).ok_or("Account was not returned by sign-in")).collect::<Result<Vec<_>,_>>()?;
        let mut store=workspace.lock().map_err(|_|"Workspace is unavailable")?;
        let result=social_accounts::import(&mut store,platform,&selection.brand,&selection.envelope.verified.version,&destinations)?;holder.take();return Ok(result);
    }
    let id=args.first().and_then(Value::as_str).ok_or("Invalid account ID")?;
    if operation=="disconnect" {
        let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;
        return social_accounts::disconnect(&store,id,service);
    }
    if operation=="check" {
        let (credential,credential_id)={
            let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;let account=store.get_record("SocialAccount",id)?;
            let platform=account["platform"].as_str().ok_or("Invalid platform")?;
            if !(service==platform||service=="meta"&&["facebook","instagram"].contains(&platform)){return Err("Account platform mismatch".into());}
            let credential_id=account["credential_id"].as_str().filter(|v|!v.is_empty()).ok_or("Reconnect this account")?.to_owned();
            let credential=social_vault::load(&store.root,&credential_id)?;
            if credential.provider!=platform||credential.brand_id!=account["brand_id"].as_str().unwrap_or("")||credential.destination.id!=account["external_id"]{return Err("Connection identity mismatch. Reconnect.".into());}
            credential.destination.validate(platform)?;(credential,credential_id)
        };
        let input=json!({"provider":credential.provider,"token":credential.destination.token,"id":credential.destination.id,"pageId":credential.destination.page_id,"appsecretProof":credential.destination.appsecret_proof});
        let response=social_http::client()?.post(social_http::broker_origin()?.join("/check").map_err(|_|"Invalid login service")?).json(&input).send().map_err(|_|"Cannot reach the login service. Check your internet connection.")?;
        if response.status()==reqwest::StatusCode::UNAUTHORIZED {
            if social_http::confirmed_invalid(response){
                let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;social_accounts::expire(&store,id,&credential_id)?;
                return Err("Account access expired or permissions changed. Reconnect.".into());
            }
            return Err("Sign-in or account verification could not be confirmed. Reconnect or check service setup.".into());
        }
        let result:Value=serde_json::from_slice(&social_http::response(response)?).map_err(|_|"Invalid login service response")?;
        if result["checked"]!=true||result["id"]!=credential.destination.id{return Err("Account access could not be confirmed".into());}
        let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;let mut account=store.get_record("SocialAccount",id)?;
        store.policy.require(&store.root,"write")?;
        if account["credential_id"]!=credential_id||account["connection_status"]!="connected"{return Err("Connection changed during verification. Try again.".into());}
        account["last_synced_at"]=json!(chrono::Utc::now().to_rfc3339());
        store.db.execute("UPDATE records SET data=? WHERE entity='SocialAccount' AND id=?",rusqlite::params![account.to_string(),id]).map_err(database_error)?;return Ok(json!({"verified":true}));
    }
    Err("Unsupported connection operation".into())
}

#[tauri::command]
pub async fn workspace_social(app:tauri::AppHandle,state:tauri::State<'_,State>,workspace:tauri::State<'_,Workspace>,path:String,args:Vec<Value>)->Result<Value,String>{
    if path.len()>64||args.len()>2||serde_json::to_vec(&args).map_err(|_|"Invalid connection request")?.len()>8192{return Err("Invalid connection request".into());}
    let runtime=state.0.clone();let workspace=workspace.0.clone();
    let status=path.ends_with("/status");let application_id=app.config().identifier.clone();
    let mut result=tauri::async_runtime::spawn_blocking(move||run(&runtime,&workspace,&path,&args)).await.map_err(|_|"Connection operation failed".to_owned())??;
    if status{result["applicationId"]=json!(application_id);}Ok(result)
}
