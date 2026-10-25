use base64::{Engine,engine::general_purpose::URL_SAFE_NO_PAD};
use ed25519_dalek::{Signature,VerifyingKey};

pub const DOMAIN:&[u8]=b"Socialchoice offline license v2\0";
pub const MAX_TOKEN:usize=16384;
#[derive(Clone,serde::Serialize,serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rights {pub ai:bool,pub media_import:bool,pub backup_restore:bool,pub max_active_brands:Option<u32>}
#[derive(Clone,serde::Serialize,serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Claims {
    pub schema:u32,pub product:String,pub license_id:String,pub licensed_to:String,pub edition:String,
    pub issued_at:String,pub machine_id:String,pub reissued_from_machine_id:Option<String>,pub reissue_reason:Option<String>,pub rights:Rights
}
impl Claims {
    pub fn validate(&self)->Result<(),String> {
        if self.schema!=2 || self.product!="socialchoice-desktop" || !["starter","professional","business"].contains(&self.edition.as_str()) {return Err("Unsupported license product, version or edition".into());}
        uuid::Uuid::parse_str(&self.license_id).map_err(|_|"Invalid license ID")?;
        chrono::DateTime::parse_from_rfc3339(&self.issued_at).map_err(|_|"Invalid license issue date")?;
        if self.licensed_to.trim().is_empty() || self.licensed_to.chars().count()>160 || self.licensed_to.chars().any(char::is_control) {return Err("Invalid license owner".into());}
        if !crate::machine_identity::valid(&self.machine_id) || self.reissued_from_machine_id.as_ref().is_some_and(|id|!crate::machine_identity::valid(id)) {return Err("A valid machine binding is required for every license".into());}
        if self.rights.max_active_brands.is_some_and(|limit|limit==0 || limit>1_000_000) {return Err("Invalid license brand limit".into());}
        if self.reissue_reason.as_ref().is_some_and(|reason|reason.trim().is_empty() || reason.chars().count()>240 || reason.chars().any(char::is_control)) {return Err("Invalid license reissue reason".into());}
        Ok(())
    }
}
pub fn public_key(hex:&str)->Result<VerifyingKey,String> {
    if hex.len()!=64 || !hex.is_ascii(){return Err("License issuer public key is not configured correctly".into());}
    let mut bytes=[0u8;32];
    for (index,byte) in bytes.iter_mut().enumerate(){*byte=u8::from_str_radix(&hex[index*2..index*2+2],16).map_err(|_|"Invalid license issuer public key")?;}
    let key=VerifyingKey::from_bytes(&bytes).map_err(|_|"Invalid license issuer public key")?;
    if key.is_weak(){return Err("Invalid license issuer public key".into());}Ok(key)
}
pub fn verify(token:&str,key:&VerifyingKey)->Result<Claims,String> {
    if token.len()>MAX_TOKEN || token.is_empty(){return Err("License is empty or too large".into());}
    let parts=token.split('.').collect::<Vec<_>>();if parts.len()!=3 || parts[0]!="SC2"{return Err("This license format is unsupported. Request a machine-bound license from the software owner.".into());}
    let payload=URL_SAFE_NO_PAD.decode(parts[1]).map_err(|_|"Invalid license encoding")?;
    if payload.len()>8192{return Err("License payload is too large".into());}
    let signature=URL_SAFE_NO_PAD.decode(parts[2]).map_err(|_|"Invalid license encoding")?;
    let signature=Signature::from_slice(&signature).map_err(|_|"Invalid license signature")?;
    let mut message=DOMAIN.to_vec();message.extend_from_slice(&payload);
    key.verify_strict(&message,&signature).map_err(|_|"License signature is invalid or belongs to another issuer")?;
    let claims:Claims=serde_json::from_slice(&payload).map_err(|_|"Invalid license fields")?;claims.validate()?;Ok(claims)
}
