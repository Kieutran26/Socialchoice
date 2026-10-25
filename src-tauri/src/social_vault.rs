use crate::{managed_paths,media::{io_error,read_bounded},protected_data,social_types::Destination};
use serde::{Serialize,Deserialize};
use std::{path::{Path,PathBuf},io::Write};
use zeroize::Zeroizing;

#[derive(Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Credential {pub provider:String,pub brand_id:String,pub destination:Destination,pub version:Option<String>}
fn path(root:&Path,id:&str)->Result<PathBuf,String>{
    uuid::Uuid::parse_str(id).map_err(|_|"Invalid connection ID")?;
    let path=managed_paths::directory(root,"credentials")?.join(format!("social-{id}.dpapi"));
    if path.symlink_metadata().is_ok(){managed_paths::reject_link(&path)?;}Ok(path)
}
pub fn save(root:&Path,id:&str,credential:&Credential)->Result<(),String>{
    credential.destination.validate(&credential.provider)?;
    let bytes=Zeroizing::new(serde_json::to_vec(credential).map_err(|_|"Cannot protect connection")?);
    let encrypted=protected_data::transform_scoped(&bytes,true,b"Socialchoice Desktop Social v1")?;
    let target=path(root,id)?;let mut temp=tempfile::NamedTempFile::new_in(target.parent().ok_or("Invalid credential directory")?).map_err(io_error)?;
    temp.write_all(&encrypted).map_err(io_error)?;temp.as_file().sync_all().map_err(io_error)?;temp.persist(target).map_err(io_error)?;Ok(())
}
pub fn load(root:&Path,id:&str)->Result<Credential,String>{
    let encrypted=read_bounded(&path(root,id)?,65536).map_err(|_|"Connection credentials are unavailable. Reconnect.")?;
    let plain=protected_data::transform_scoped(&encrypted,false,b"Socialchoice Desktop Social v1")?;
    serde_json::from_slice(&plain).map_err(|_|"Connection credentials are unreadable. Reconnect.".into())
}
pub fn remove(root:&Path,id:&str)->Result<(),String>{let target=path(root,id)?;if target.exists(){std::fs::remove_file(target).map_err(io_error)?;}Ok(())}
