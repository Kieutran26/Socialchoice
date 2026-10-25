use crate::{social_types::{Destination,identifier},social_vault::{self,Credential},store::{Store,database_error}};
use serde_json::{json,Value};
use chrono::Utc;
pub const REFERENCE_PLATFORMS:[&str;8]=["facebook","instagram","threads","linkedin","tiktok","youtube","x","reddit"];

pub fn active_brand(store:&Store,id:&str)->Result<(),String>{
    let brand=store.get_record("Brand",id)?;
    if brand["status"]!="active"||brand["is_demo"]!=false{return Err("Choose an active real brand".into());}Ok(())
}
fn write(store:&Store,record:&Value)->Result<(),String>{
    store.db.execute("INSERT INTO records VALUES ('SocialAccount',?,?) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data",rusqlite::params![record["id"].as_str().ok_or("Invalid account")?,record.to_string()]).map_err(database_error)?;Ok(())
}
pub fn import(store:&mut Store,provider:&str,brand:&str,version:&Option<String>,destinations:&[&Destination])->Result<Value,String>{
    store.policy.require(&store.root,"write")?;active_brand(store,brand)?;
    let all=store.records("SocialAccount")?;let now=Utc::now().to_rfc3339();let mut added=Vec::new();let mut old_credentials=Vec::new();let mut items=Vec::new();
    store.db.execute_batch("BEGIN IMMEDIATE").map_err(database_error)?;
    let result=(||{
        for destination in destinations {
            destination.validate(provider)?;
            let old=all.iter().find(|a|a["platform"]==provider&&a["external_id"]==destination.id&&a["brand_id"]==brand);
            let id=old.and_then(|a|a["id"].as_str()).map(str::to_owned).unwrap_or_else(||uuid::Uuid::new_v4().to_string());
            let credential_id=uuid::Uuid::new_v4().to_string();
            social_vault::save(&store.root,&credential_id,&Credential{provider:provider.to_owned(),brand_id:brand.to_owned(),destination:(*destination).clone(),version:version.clone()})?;added.push(credential_id.clone());
            let record=json!({"id":id,"created_date":old.map(|v|v["created_date"].clone()).unwrap_or(json!(now)),"updated_date":now,"last_synced_at":now,"brand_id":brand,"is_demo":false,"platform":provider,"account_type":if provider=="facebook"{"page"}else{"profile"},"name":destination.name,"username":destination.username,"external_id":destination.id,"credential_id":credential_id,"connection_status":"connected","scopes":destination.scopes,"expires_at":destination.expires_at});
            write(store,&record)?;items.push(record);
            if let Some(old_id)=old.and_then(|a|a["credential_id"].as_str()).filter(|id|!id.is_empty()){old_credentials.push(old_id.to_owned());}
        }
        store.db.execute_batch("COMMIT").map_err(database_error)?;Ok(json!({"items":items,"imported":items.len()}))
    })();
    if result.is_err(){let _=store.db.execute_batch("ROLLBACK");for id in added{let _=social_vault::remove(&store.root,&id);}}
    else{for id in old_credentials{let _=social_vault::remove(&store.root,&id);}}result
}
pub fn disconnect(store:&Store,id:&str,provider:&str)->Result<Value,String>{
    store.policy.require(&store.root,"write")?;
    let mut record=store.get_record("SocialAccount",id)?;
    if record["platform"]!=provider&&!(provider=="meta"&&["facebook","instagram"].iter().any(|p|record["platform"]==*p)){return Err("Account platform mismatch".into());}
    let credential=record["credential_id"].as_str().unwrap_or("").to_owned();
    record["credential_id"]=json!("");record["connection_status"]=json!("disconnected");record["updated_date"]=json!(Utc::now().to_rfc3339());write(store,&record)?;
    if !credential.is_empty(){social_vault::remove(&store.root,&credential)?;}Ok(json!({"disconnected":true}))
}
pub fn mutate(store:&Store,operation:&str,args:&[Value])->Result<Value,String>{
    let arg=|index|args.get(index).ok_or("Missing account argument".to_owned());
    if operation=="create" {
        let fields=arg(0)?.as_object().ok_or("Invalid account")?;
        if fields.keys().any(|key|!["brand_id","platform","account_type","name","username","external_id","is_demo","connection_status"].contains(&key.as_str()))||fields.get("is_demo").is_some_and(|v|v!=false)||fields.get("connection_status").is_some_and(|v|v!="configuration_required"){return Err("Accounts must be connected through verified sign-in".into());}
        let brand=arg(0)?["brand_id"].as_str().ok_or("Choose brand")?;active_brand(store,brand)?;
        let platform=arg(0)?["platform"].as_str().ok_or("Invalid platform")?;if !REFERENCE_PLATFORMS.contains(&platform){return Err("Unsupported platform".into());}
        let name=arg(0)?["name"].as_str().ok_or("Invalid name")?.trim();if name.is_empty()||name.chars().count()>256||name.chars().any(char::is_control){return Err("Invalid account name".into());}
        for key in ["username","external_id"]{if arg(0)?.get(key).is_some_and(|v|v.as_str().is_none_or(|s|s.len()>256||s.chars().any(char::is_control))){return Err("Invalid account reference".into());}}
        let now=Utc::now().to_rfc3339();let record=json!({"id":uuid::Uuid::new_v4().to_string(),"created_date":now,"updated_date":now,"brand_id":brand,"name":name,"platform":platform,"account_type":if platform=="facebook"{"page"}else{"profile"},"username":arg(0)?["username"].as_str().unwrap_or(""),"external_id":arg(0)?["external_id"].as_str().unwrap_or(""),"is_demo":false,"connection_status":"configuration_required","credential_id":"","scopes":[]});write(store,&record)?;return Ok(record);
    }
    let id=arg(0)?.as_str().filter(|s|identifier(s)).ok_or("Invalid account ID")?;let mut record=store.get_record("SocialAccount",id)?;
    if operation=="delete" {
        if record["credential_id"].as_str().is_some_and(|s|!s.is_empty()){return Err("Disconnect this account before removing it".into());}
        if store.references("SocialAccount",id)?{return Err("This account is referenced by content".into());}
        store.db.execute("DELETE FROM records WHERE entity='SocialAccount' AND id=?",[id]).map_err(database_error)?;return Ok(json!({"success":true}));
    }
    if operation=="update" {
        let fields=arg(1)?.as_object().ok_or("Invalid account update")?;
        if fields.len()==1&&fields.get("connection_status")==Some(&json!("disconnected")){return disconnect(store,id,record["platform"].as_str().unwrap_or(""));}
        if fields.is_empty()||fields.keys().any(|key|!["brand_id","name","username","external_id","connection_status"].contains(&key.as_str()))||fields.get("connection_status").is_some_and(|status|status!="configuration_required"){return Err("Reconnect to change verified account details".into());}
        if record["credential_id"].as_str().is_some_and(|s|!s.is_empty()){return Err("Disconnect and reconnect to move a verified account to another brand".into());}
        for (key,value) in fields {
            let text=value.as_str().ok_or("Invalid account reference")?;
            if text.chars().count()>256||text.chars().any(char::is_control)||["name","brand_id"].contains(&key.as_str())&&text.trim().is_empty(){return Err("Invalid account reference".into());}
            if ["brand_id","external_id"].contains(&key.as_str())&&record[key]!=*value&&store.references("SocialAccount",id)?{return Err("Referenced accounts cannot move between brands".into());}
            record[key]=value.clone();
        }
        active_brand(store,record["brand_id"].as_str().ok_or("Choose brand")?)?;record["updated_date"]=json!(Utc::now().to_rfc3339());write(store,&record)?;return Ok(record);
    }Err("Unsupported account operation".into())
}
pub fn portable(record:&Value)->Result<Value,String>{
    let allowed=["id","created_date","updated_date","brand_id","name","platform","account_type","username","external_id","is_demo"];
    let mut value=serde_json::Map::new();for key in allowed {if let Some(item)=record.get(key){value.insert(key.to_owned(),item.clone());}}
    value.insert("connection_status".into(),json!("disconnected"));value.insert("credential_id".into(),json!(""));value.insert("scopes".into(),json!([]));Ok(Value::Object(value))
}

pub fn validate_portable(record:&Value)->Result<(),String>{
    if portable(record)?!=*record||record["is_demo"]!=false||record["platform"].as_str().is_none_or(|p|!REFERENCE_PLATFORMS.contains(&p))||record["account_type"].as_str().is_none_or(|p|!["page","profile"].contains(&p)){return Err("Backup accounts must be disconnected references without credentials".into());}
    for key in ["id","brand_id","name","platform","account_type","username","external_id"] {
        let text=record[key].as_str().ok_or("Invalid backup account field")?;
        if text.chars().count()>256||text.chars().any(char::is_control)||["id","brand_id","name"].contains(&key)&&text.trim().is_empty(){return Err("Invalid backup account field".into());}
    }Ok(())
}

pub fn expire(store:&Store,id:&str,credential_id:&str)->Result<(),String>{
    let mut record=store.get_record("SocialAccount",id)?;
    if record["credential_id"]==credential_id&&record["connection_status"]=="connected" {record["connection_status"]=json!("expired");record["updated_date"]=json!(Utc::now().to_rfc3339());write(store,&record)?;}Ok(())
}
