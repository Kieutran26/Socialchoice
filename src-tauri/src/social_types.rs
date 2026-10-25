use serde::{Deserialize,Serialize};
use serde_json::{json,Value};
use zeroize::Zeroize;

pub const PROVIDERS:[&str;5]=["facebook","instagram","threads","linkedin","tiktok"];
#[derive(Clone,Serialize,Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Destination {
    pub id:String,pub name:String,#[serde(default)]pub username:String,
    #[serde(default)]pub page_id:String,#[serde(default)]pub page_name:String,
    pub scopes:Vec<String>,#[serde(default)]pub tasks:Vec<String>,pub token:String,
    #[serde(default)]pub appsecret_proof:String,pub expires_at:i64,
}
impl Drop for Destination {fn drop(&mut self){self.token.zeroize();self.appsecret_proof.zeroize();}}
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Verified {pub profile_name:String,pub destinations:Vec<Destination>,#[serde(default)]pub version:Option<String>}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Envelope {pub protocol:u32,pub provider:String,pub verified:Verified}

pub fn identifier(value:&str)->bool{!value.is_empty()&&value.len()<=256&&value.bytes().all(|b|b.is_ascii_alphanumeric()||b"_.-".contains(&b))}
pub fn required(provider:&str)->&'static [&'static str] {
    match provider {
        "facebook"=>&["pages_show_list","pages_manage_posts","pages_read_engagement"],
        "instagram"=>&["pages_show_list","pages_read_engagement","instagram_basic","instagram_content_publish"],
        "threads"=>&["threads_basic","threads_content_publish"],"linkedin"=>&["openid","profile","w_member_social"],
        "tiktok"=>&["user.info.basic","video.publish"],_=>&[]
    }
}
impl Destination {
    pub fn validate(&self,provider:&str)->Result<(),String> {
        let now=chrono::Utc::now().timestamp_millis();
        let no_scheduled_expiry=["facebook","instagram"].contains(&provider)&&self.expires_at==0;
        if !PROVIDERS.contains(&provider)||!identifier(&self.id)||self.name.trim().is_empty()||self.name.chars().count()>256||self.name.chars().any(char::is_control)||self.username.len()>256||self.page_name.len()>256
            ||self.token.is_empty()||self.token.len()>16384||!self.token.bytes().all(|b|b.is_ascii_graphic())||(!no_scheduled_expiry&&(self.expires_at<=now||self.expires_at>now+366*86400000))
            ||self.scopes.len()>100||self.scopes.iter().any(|s|!identifier(s))||!required(provider).iter().all(|s|self.scopes.iter().any(|g|g==s))||self.tasks.len()>100||self.tasks.iter().any(|s|!identifier(s))
        {return Err("Account identity or publishing permissions could not be confirmed. Reconnect.".into());}
        if ["facebook","instagram"].contains(&provider) && (!identifier(&self.page_id)||self.appsecret_proof.len()!=64||!self.appsecret_proof.bytes().all(|b|b.is_ascii_hexdigit())||!self.tasks.iter().any(|s|["CREATE_CONTENT","MANAGE","PROFILE_PLUS_CREATE_CONTENT","PROFILE_PLUS_FULL_CONTROL"].contains(&s.as_str()))) {return Err("Page content access could not be confirmed".into());}Ok(())
    }
    pub fn public(&self)->Value{json!({"id":self.id,"name":self.name,"username":self.username,"pageName":self.page_name})}
}
impl Envelope {
    pub fn validate(&self,provider:&str)->Result<(),String>{
        if self.protocol!=1||self.provider!=provider||self.verified.profile_name.len()>256||self.verified.destinations.len()>300 {return Err("Invalid login response".into());}
        let mut ids=std::collections::HashSet::new();
        for destination in &self.verified.destinations {destination.validate(provider)?;if !ids.insert(&destination.id){return Err("Duplicate destination identity".into());}}
        if ["facebook","instagram"].contains(&provider)&&self.verified.version.as_ref().is_none_or(|v|v.len()<4||v.len()>10||!v.starts_with('v')||!v.ends_with(".0")||!v[1..v.len()-2].bytes().all(|b|b.is_ascii_digit())){return Err("Invalid provider API version".into());}Ok(())
    }
}
