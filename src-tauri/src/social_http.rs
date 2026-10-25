use reqwest::{blocking::Client,redirect::Policy,Url};
use serde_json::Value;
use std::{io::Read,time::Duration};
use zeroize::Zeroizing;

pub fn broker_origin()->Result<Url,String>{parse_origin(option_env!("SOCIALCHOICE_AUTH_BROKER_ORIGIN").unwrap_or(""))}
pub fn parse_origin(value:&str)->Result<Url,String>{
    let url=Url::parse(value).map_err(|_|"The desktop login service is not configured. Contact the software owner.")?;
    if url.scheme()!="https"||url.username()!=""||url.password().is_some()||url.query().is_some()||url.fragment().is_some()||url.path()!="/"||url.origin().ascii_serialization()!=value {return Err("Invalid desktop login service origin".into());}Ok(url)
}
pub fn client()->Result<Client,String>{Client::builder().timeout(Duration::from_secs(60)).connect_timeout(Duration::from_secs(15)).redirect(Policy::none()).no_proxy().build().map_err(|_|"Cannot initialize sign-in".to_owned())}
pub fn response(mut response:reqwest::blocking::Response)->Result<Zeroizing<Vec<u8>>,String>{
    if !response.status().is_success(){return Err("Sign-in or account verification could not be confirmed. Reconnect or check service setup.".into());}
    let mut bytes=Zeroizing::new(Vec::new());response.by_ref().take(2*1024*1024+1).read_to_end(&mut bytes).map_err(|_|"Cannot read sign-in response")?;
    if bytes.len()>2*1024*1024{return Err("Sign-in response is too large".into());}Ok(bytes)
}
pub fn confirmed_invalid(mut response:reqwest::blocking::Response)->bool {
    let mut bytes=Zeroizing::new(Vec::new());
    if response.by_ref().take(4097).read_to_end(&mut bytes).is_err()||bytes.len()>4096{return false;}
    serde_json::from_slice::<Value>(&bytes).is_ok_and(|value|value["error"]=="connection_expired")
}
pub fn json(client:&Client,url:Url,input:Option<&Value>)->Result<Value,String>{
    let request=if let Some(input)=input{client.post(url).header("Content-Type","application/json").body(serde_json::to_vec(input).map_err(|_|"Invalid sign-in request")?)}else{client.get(url)};
    let bytes=response(request.send().map_err(|_|"Cannot reach the login service. Check your internet connection.")?)?;
    serde_json::from_slice(&bytes).map_err(|_|"Invalid login service response".into())
}
