use crate::{managed_paths,media::{io_error,read_bounded},protected_data};
use serde_json::{json,Value};
use std::{io::Write,path::Path};
use zeroize::{Zeroize,Zeroizing};

#[derive(serde::Serialize,serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {pub provider:String,pub model:String,pub key:String}
impl Drop for Config {fn drop(&mut self){self.key.zeroize();}}

pub fn validate(config:&Config)->Result<(),String> {
    if !["openai","gemini"].contains(&config.provider.as_str()) {return Err("Choose OpenAI or Gemini".into());}
    if config.model.is_empty() || config.model.len()>100 || !config.model.bytes().all(|c|c.is_ascii_alphanumeric()||b"-_.".contains(&c)) {return Err("Enter a valid model ID from your AI provider".into());}
    if config.key.len()<10 || config.key.len()>512 || !config.key.bytes().all(|c|c.is_ascii_graphic()) {return Err("Enter a valid API key".into());}Ok(())
}
fn path(root:&Path)->Result<std::path::PathBuf,String> {
    let path=managed_paths::directory(root,"credentials")?.join("ai.dpapi");
    if path.symlink_metadata().is_ok(){managed_paths::reject_link(&path)?;}Ok(path)
}
pub fn load(root:&Path)->Result<Option<Config>,String> {
    let path=path(root)?;if !path.exists(){return Ok(None);}
    let encrypted=read_bounded(&path,16384)?;let plain=protected_data::transform(&encrypted,false)?;
    let config:Config=serde_json::from_slice(&plain).map_err(|_|"AI settings are unreadable. Re-enter your API key.")?;
    validate(&config)?;Ok(Some(config))
}
pub fn status(root:&Path)->Result<Value,String> {
    Ok(match load(root)? {Some(config)=>json!({"configured":true,"provider":config.provider,"model":config.model}),None=>json!({"configured":false,"provider":"openai","model":""})})
}
pub fn save(root:&Path,input:&Value)->Result<Value,String> {
    let fields=input.as_object().ok_or("Invalid AI settings")?;
    if fields.keys().any(|key|!["provider","model","key"].contains(&key.as_str())) {return Err("Invalid AI settings".into());}
    let provider=input["provider"].as_str().ok_or("Choose OpenAI or Gemini")?.to_owned();
    let model=input["model"].as_str().ok_or("Enter a model ID")?.trim().to_owned();
    let key=input["key"].as_str().ok_or("Enter a valid API key")?.trim();
    let key=if key.is_empty(){
        let old=load(root)?.filter(|old|old.provider==provider).ok_or("Enter an API key for this provider")?;old.key.clone()
    }else{key.to_owned()};
    let config=Config{provider,model,key};validate(&config)?;
    let bytes=Zeroizing::new(serde_json::to_vec(&config).map_err(|_|"Cannot encode AI settings")?);
    let encrypted=protected_data::transform(&bytes,true)?;let path=path(root)?;
    let mut file=tempfile::NamedTempFile::new_in(path.parent().ok_or("Invalid AI directory")?).map_err(io_error)?;
    file.write_all(&encrypted).map_err(io_error)?;file.as_file().sync_all().map_err(io_error)?;file.persist(path).map_err(io_error)?;
    status(root)
}
pub fn clear(root:&Path)->Result<Value,String> {
    let path=path(root)?;if path.exists(){std::fs::remove_file(path).map_err(io_error)?;}status(root)
}
