use crate::{social_loopback::Login,social_types::{Destination,Envelope,Verified},social_accounts,social_service::{self,Pending,Runtime},social_vault,store::Store};
use serde_json::json;
use std::{sync::{Arc,Mutex,atomic::AtomicBool},time::{Instant,Duration},io::{Read,Write},net::TcpStream};

fn destination()->Destination{Destination{id:"profile-1".into(),name:"Hồ sơ thử".into(),username:"Test".into(),page_id:"".into(),page_name:"".into(),scopes:vec!["openid".into(),"profile".into(),"w_member_social".into()],tasks:vec![],token:"fixture-token-not-live".into(),appsecret_proof:"".into(),expires_at:chrono::Utc::now().timestamp_millis()+3600000}}
fn request(login:&Login,query:&str)->String{format!("GET /socialchoice/oauth/callback?{query} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\n\r\n",login.listener.local_addr().unwrap().port())}

#[test]
fn callback_rejects_wrong_state_duplicate_parameters_host_and_paths(){
    let login=Login::create().unwrap();
    assert_eq!(login.challenge.len(),43);assert_eq!(login.verifier.len(),64);
    assert_eq!(login.callback(&request(&login,&format!("state={}&ticket=opaque.ticket",login.state))).unwrap(),"opaque.ticket");
    for query in ["state=wrong&ticket=opaque.ticket".to_owned(),format!("state={}&state={}&ticket=x",login.state,login.state),format!("state={}&ticket=x&extra=y",login.state),format!("state={}&ticket=https://evil.example",login.state)]{assert!(login.callback(&request(&login,&query)).is_err());}
    let valid=request(&login,&format!("state={}&ticket=x",login.state));
    assert!(login.callback(&valid.replace("Host: 127.0.0.1","Host: attacker.example")).is_err());
    assert!(login.callback(&valid.replace("GET ","POST ")).is_err());
    assert!(login.callback(&request(&login,&format!("state={}&error=authorization_denied",login.state))).unwrap_err().contains("cancelled"));
    let cancelled=AtomicBool::new(true);assert!(login.wait(&cancelled,Duration::from_secs(1)).unwrap_err().contains("cancelled"));
}

#[test]
fn loopback_accepts_a_valid_callback_without_echoing_ticket_and_closes_listener(){
    let login=Login::create().unwrap();let address=login.listener.local_addr().unwrap();let request=request(&login,&format!("state={}&ticket=private-ticket",login.state));
    let client=std::thread::spawn(move||{let mut stream=TcpStream::connect(address).unwrap();stream.write_all(request.as_bytes()).unwrap();let mut output=String::new();stream.read_to_string(&mut output).unwrap();output});
    assert_eq!(login.wait(&AtomicBool::new(false),Duration::from_secs(5)).unwrap(),"private-ticket");
    let output=client.join().unwrap();assert!(output.starts_with("HTTP/1.1 200"));assert!(!output.contains("private-ticket"));assert!(output.contains("Cache-Control: no-store"));drop(login);assert!(TcpStream::connect(address).is_err());
}

#[test]
fn verified_account_import_is_explicit_encrypted_persistent_and_backup_contains_only_references(){
    let dir=tempfile::tempdir().unwrap();let path=dir.path().join("test.sqlite");let mut store=Store::open(&path).unwrap();
    let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();let brand_id=brand["id"].as_str().unwrap().to_owned();
    let d=destination();let imported=social_accounts::import(&mut store,"linkedin",&brand_id,&None,&[&d]).unwrap();let account=imported["items"][0].clone();
    assert_eq!(account["connection_status"],"connected");assert!(!account.to_string().contains("fixture-token"));
    let credential_id=account["credential_id"].as_str().unwrap();let raw=std::fs::read(dir.path().join("credentials").join(format!("social-{credential_id}.dpapi"))).unwrap();assert!(!raw.windows(d.token.len()).any(|window|window==d.token.as_bytes()));
    assert_eq!(social_vault::load(dir.path(),credential_id).unwrap().destination.token,d.token);
    assert!(store.request("entities/SocialAccount/create",&[json!({"name":"Forged","brand_id":brand_id,"platform":"linkedin","connection_status":"connected","credential_id":"fake"})]).is_err());
    assert!(store.request("entities/SocialAccount/update",&[account["id"].clone(),json!({"name":"Forged identity"})]).is_err());
    let archive=dir.path().join("test.scbackup");store.export_backup(&archive).unwrap();
    let target=tempfile::tempdir().unwrap();let mut restored=Store::open(&target.path().join("restored.sqlite")).unwrap();let prepared=restored.inspect_backup(&archive).unwrap();restored.restore_backup(prepared["token"].as_str().unwrap()).unwrap();
    let restored_account=restored.records("SocialAccount").unwrap().remove(0);assert_eq!(restored_account["connection_status"],"disconnected");assert_eq!(restored_account["credential_id"],"");
    drop(store);let reopened=Store::open(&path).unwrap();assert_eq!(reopened.records("SocialAccount").unwrap()[0]["id"],account["id"]);
    social_accounts::disconnect(&reopened,account["id"].as_str().unwrap(),"linkedin").unwrap();assert!(social_vault::load(dir.path(),credential_id).is_err());assert_eq!(reopened.records("SocialAccount").unwrap()[0]["connection_status"],"disconnected");
}

#[test]
fn pending_selection_has_no_credentials_and_cannot_import_unverified_or_wrong_platform_accounts(){
    let dir=tempfile::tempdir().unwrap();let mut store=Store::open(&dir.path().join("test.sqlite")).unwrap();let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();
    let runtime=Runtime::new();*runtime.pending.lock().unwrap()=Some(Pending{brand:brand["id"].as_str().unwrap().into(),envelope:Envelope{protocol:1,provider:"linkedin".into(),verified:Verified{profile_name:"Test".into(),destinations:vec![destination()],version:None}},created:Instant::now()});
    let public=social_service::pending(&runtime,"linkedin").unwrap();assert_eq!(public["pending"],true);for secret in ["fixture-token","token","scopes","appsecretProof"]{assert!(!public.to_string().contains(secret));}
    let workspace=Arc::new(Mutex::new(store));assert!(social_service::run(&runtime,&workspace,"linkedin/import",&[json!("forged")]).is_err());assert!(social_service::run(&runtime,&workspace,"threads/import",&[json!("profile-1")]).is_err());
    social_service::run(&runtime,&workspace,"linkedin/import",&[json!("profile-1")]).unwrap();assert_eq!(social_service::pending(&runtime,"linkedin").unwrap()["pending"],false);assert!(social_service::run(&runtime,&workspace,"linkedin/import",&[json!("profile-1")]).is_err());
}

#[test]
fn invalid_expired_and_underprivileged_credentials_and_unsafe_broker_origins_fail_closed(){
    let mut d=destination();d.validate("linkedin").unwrap();d.scopes.clear();assert!(d.validate("linkedin").is_err());d=destination();d.expires_at=0;assert!(d.validate("linkedin").is_err());
    for value in ["", "http://example.com", "https://user@example.com", "https://example.com/path", "https://example.com/", "https://example.com?token=x", "https://example.com#"]{assert!(crate::social_http::parse_origin(value).is_err());}
    assert!(crate::social_http::parse_origin("https://login.example.com").is_ok());
}

#[test]
fn meta_no_scheduled_expiry_requires_verified_page_proof_tasks_and_permissions(){
    for provider in ["facebook","instagram"] {
        let mut d=destination();d.page_id="555".into();d.appsecret_proof="a".repeat(64);d.tasks=vec!["CREATE_CONTENT".into()];d.scopes=crate::social_types::required(provider).iter().map(|s|s.to_string()).collect();d.expires_at=0;
        assert!(d.validate(provider).is_ok());
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("test.sqlite");let mut store=Store::open(&path).unwrap();let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();
        social_accounts::import(&mut store,provider,brand["id"].as_str().unwrap(),&Some("v26.0".into()),&[&d]).unwrap();
        assert_eq!(store.records("SocialAccount").unwrap()[0]["connection_status"],"connected");drop(store);
        let store=Store::open(&path).unwrap();let mut account=store.records("SocialAccount").unwrap().remove(0);assert_eq!(account["connection_status"],"connected");assert_eq!(account["expires_at"],0);
        for expiry in [-1,chrono::Utc::now().timestamp_millis()-1000] {account["expires_at"]=json!(expiry);store.db.execute("UPDATE records SET data=? WHERE entity='SocialAccount'",[account.to_string()]).unwrap();assert_eq!(store.records("SocialAccount").unwrap()[0]["connection_status"],"expired");}
        account["platform"]=json!("linkedin");account["expires_at"]=json!(0);store.db.execute("UPDATE records SET data=? WHERE entity='SocialAccount'",[account.to_string()]).unwrap();assert_eq!(store.records("SocialAccount").unwrap()[0]["connection_status"],"expired");
        d.expires_at=-1;assert!(d.validate(provider).is_err());d.expires_at=chrono::Utc::now().timestamp_millis()-1000;assert!(d.validate(provider).is_err());
        d.expires_at=0;d.tasks.clear();assert!(d.validate(provider).is_err());d.tasks=vec!["CREATE_CONTENT".into()];d.scopes.clear();assert!(d.validate(provider).is_err());
    }
    for provider in ["linkedin","threads","tiktok"] {let mut d=destination();d.expires_at=0;assert!(d.validate(provider).is_err());}
}

#[test]
fn unsupported_login_platforms_remain_editable_planning_references_without_fake_connections(){
    let dir=tempfile::tempdir().unwrap();let mut store=Store::open(&dir.path().join("test.sqlite")).unwrap();let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();
    for platform in ["youtube","x","reddit"]{
        let account=store.request("entities/SocialAccount/create",&[json!({"brand_id":brand["id"],"name":"Reference","platform":platform})]).unwrap();
        assert_eq!(account["connection_status"],"configuration_required");
        let updated=store.request("entities/SocialAccount/update",&[account["id"].clone(),json!({"name":"Edited reference","connection_status":"configuration_required","brand_id":brand["id"],"external_id":"test","username":"handle"})]).unwrap();
        social_accounts::validate_portable(&social_accounts::portable(&updated).unwrap()).unwrap();
        assert!(store.request("entities/SocialAccount/update",&[account["id"].clone(),json!({"connection_status":"connected"})]).is_err());
    }
    let runtime=Runtime::new();let workspace=Arc::new(Mutex::new(store));assert!(social_service::run(&runtime,&workspace,"youtube/start",&[brand["id"].clone()]).is_err());
}

#[test]
fn cancellation_clears_pending_credentials_and_expiry_does_not_reactivate_disconnected_accounts(){
    let dir=tempfile::tempdir().unwrap();let mut store=Store::open(&dir.path().join("test.sqlite")).unwrap();let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();
    let runtime=Runtime::new();*runtime.pending.lock().unwrap()=Some(Pending{brand:brand["id"].as_str().unwrap().into(),envelope:Envelope{protocol:1,provider:"linkedin".into(),verified:Verified{profile_name:"Test".into(),destinations:vec![destination()],version:None}},created:Instant::now()});
    let workspace=Arc::new(Mutex::new(store));social_service::run(&runtime,&workspace,"social/cancel",&[]).unwrap();assert_eq!(social_service::pending(&runtime,"linkedin").unwrap()["pending"],false);assert!(social_service::run(&runtime,&workspace,"linkedin/import",&[json!("profile-1")]).is_err());
    let mut store=workspace.lock().unwrap();let imported=social_accounts::import(&mut store,"linkedin",brand["id"].as_str().unwrap(),&None,&[&destination()]).unwrap();let account=&imported["items"][0];let id=account["id"].as_str().unwrap();let credential_id=account["credential_id"].as_str().unwrap();
    social_accounts::expire(&store,id,credential_id).unwrap();assert_eq!(store.records("SocialAccount").unwrap()[0]["connection_status"],"expired");
    social_accounts::disconnect(&store,id,"linkedin").unwrap();social_accounts::expire(&store,id,credential_id).unwrap();assert_eq!(store.records("SocialAccount").unwrap()[0]["connection_status"],"disconnected");
}

#[test]
fn instagram_import_is_a_profile_linked_to_its_verified_facebook_page(){
    let dir=tempfile::tempdir().unwrap();let mut store=Store::open(&dir.path().join("test.sqlite")).unwrap();let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();let mut d=destination();d.page_id="555".into();d.appsecret_proof="a".repeat(64);d.tasks=vec!["CREATE_CONTENT".into()];d.scopes=crate::social_types::required("instagram").iter().map(|s|s.to_string()).collect();
    let account=social_accounts::import(&mut store,"instagram",brand["id"].as_str().unwrap(),&Some("v24.0".into()),&[&d]).unwrap();assert_eq!(account["items"][0]["account_type"],"profile");
}

#[test]
fn access_expiry_requires_the_broker_error_contract_and_never_accepts_generic_unauthorized_pages(){
    for (body,invalid) in [("{\"error\":\"connection_expired\"}".to_owned(),true),("<html>Service login required</html>".to_owned(),false),("{\"error\":\"other\"}".to_owned(),false),("x".repeat(4097),false)] {
        let listener=std::net::TcpListener::bind("127.0.0.1:0").unwrap();let url=format!("http://{}",listener.local_addr().unwrap());
        let server=std::thread::spawn(move||{let(mut stream,_)=listener.accept().unwrap();let mut input=[0u8;2048];let _=stream.read(&mut input);write!(stream,"HTTP/1.1 401 Unauthorized\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",body.len(),body).unwrap();});
        let response=crate::social_http::client().unwrap().get(url).send().unwrap();assert_eq!(crate::social_http::confirmed_invalid(response),invalid);server.join().unwrap();
    }
}
