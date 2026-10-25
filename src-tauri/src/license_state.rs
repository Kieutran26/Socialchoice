use crate::{license_signature::{self,Claims,MAX_TOKEN},managed_paths,media::{io_error,read_bounded}};
use ed25519_dalek::VerifyingKey;
use serde_json::{json,Value};
use std::{io::Write,path::{Path,PathBuf}};

#[derive(Clone)]
pub struct Policy {key:Option<VerifyingKey>,invalid:bool,#[cfg(test)] machine:Option<Result<String,String>>}
impl Policy {
    fn new(key:Option<VerifyingKey>,invalid:bool)->Self {Self{key,invalid,#[cfg(test)] machine:None}}
    pub fn compiled()->Self {
        match option_env!("SOCIALCHOICE_LICENSE_PUBLIC_KEY") {
            None=>Self::new(None,false),
            Some(hex)=>match license_signature::public_key(hex){Ok(key)=>Self::new(Some(key),false),Err(_)=>Self::new(None,true)}
        }
    }
    #[cfg(test)]
    pub fn trusted(key:VerifyingKey)->Self{Self::for_machine(key,Ok(format!("SCM1-{}","A".repeat(64))))}
    #[cfg(test)]
    pub fn for_machine(key:VerifyingKey,machine:Result<String,String>)->Self{let mut policy=Self::new(Some(key),false);policy.machine=Some(machine);policy}
    fn machine_id(&self)->Result<String,String>{
        #[cfg(test)]
        if let Some(id)=&self.machine{return id.clone();}
        crate::machine_identity::current()
    }
    pub fn is_prototype(&self)->bool{self.key.is_none()&&!self.invalid}
    pub fn activation_request(&self)->Result<Value,String>{crate::activation_request::create(&self.machine_id()?)}
    fn claims(&self,root:&Path)->Result<Claims,String> {
        let key=self.key.as_ref().ok_or("License issuer is not configured. Contact the software owner.")?;
        let token=read_bounded(&path(root,"license.sclicense")?,MAX_TOKEN as u64).map_err(|_|"Activate a valid license to change this workspace. Reading and backup export remain available.")?;
        self.verify(std::str::from_utf8(&token).map_err(|_|"Invalid license encoding")?.trim(),key)
    }
    fn verify(&self,token:&str,key:&VerifyingKey)->Result<Claims,String> {
        let claims=license_signature::verify(token,key)?;
        if claims.machine_id!=self.machine_id()? {return Err("This license belongs to another computer. Each additional computer requires a separate license. Contact support for a repair/reinstall reissue.".into());}
        Ok(claims)
    }
    pub fn require(&self,root:&Path,capability:&str)->Result<(),String> {
        if self.is_prototype(){return Ok(());}
        let claims=self.claims(root)?;
        let enabled=match capability{"write"=>true,"ai"=>claims.rights.ai,"media"=>claims.rights.media_import,"restore"=>claims.rights.backup_restore,_=>false};
        if !enabled {return Err("This license does not include this feature. Existing data can still be viewed and exported.".into());}Ok(())
    }
    pub fn brand_limit(&self,root:&Path)->Result<Option<u32>,String>{if self.is_prototype(){Ok(None)}else{Ok(self.claims(root)?.rights.max_active_brands)}}
    pub fn status(&self,root:&Path)->Result<Value,String> {
        let identity=self.machine_id();
        let id=identity.as_ref().ok();
        if self.is_prototype(){return Ok(json!({"mode":"prototype","activated":false,"machine_id":id,"machine_error":identity.as_ref().err(),"one_machine_per_license":true,"message":"Prototype build: issuer not configured; no commercial limits are applied."}));}
        match self.claims(root) {
            Ok(claims)=>Ok(json!({"mode":"licensed","activated":true,"machine_id":id,"machine_error":identity.as_ref().err(),"one_machine_per_license":true,"license":claims})),
            Err(error)=>Ok(json!({"mode":"licensed","activated":false,"machine_id":id,"machine_error":identity.as_ref().err(),"one_machine_per_license":true,"message":error}))
        }
    }
    pub fn activate(&self,root:&Path,token:&str)->Result<Value,String> {
        let key=self.key.as_ref().ok_or("This prototype has no issuer public key. Build a licensed edition before activation.")?;
        let token=token.trim();self.verify(token,key)?;
        let target=path(root,"license.sclicense")?;atomic_write(&target,token.as_bytes())?;self.status(root)
    }
    pub fn clear(&self,root:&Path)->Result<Value,String>{let target=path(root,"license.sclicense")?;if target.exists(){std::fs::remove_file(target).map_err(io_error)?;}self.status(root)}
}
fn path(root:&Path,name:&str)->Result<PathBuf,String> {
    let target=managed_paths::directory(root,"licensing")?.join(name);if target.symlink_metadata().is_ok(){managed_paths::reject_link(&target)?;}Ok(target)
}
fn atomic_write(target:&Path,bytes:&[u8])->Result<(),String> {
    let mut temp=tempfile::NamedTempFile::new_in(target.parent().ok_or("Invalid license directory")?).map_err(io_error)?;
    temp.write_all(bytes).map_err(io_error)?;temp.as_file().sync_all().map_err(io_error)?;temp.persist(target).map_err(io_error)?;Ok(())
}
