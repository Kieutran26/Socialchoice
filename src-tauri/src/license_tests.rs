use crate::{license_signature::{self, DOMAIN},license_state::Policy,store::Store};
use base64::{Engine,engine::general_purpose::URL_SAFE_NO_PAD};
use ed25519_dalek::{Signer,SigningKey};
use serde_json::{json,Value};

fn claims()->Value {json!({"schema":2,"product":"socialchoice-desktop","license_id":uuid::Uuid::new_v4().to_string(),"licensed_to":"Test owner","edition":"starter","issued_at":"2026-10-25T00:00:00Z","machine_id":format!("SCM1-{}","A".repeat(64)),"reissued_from_machine_id":null,"reissue_reason":null,"rights":{"ai":false,"media_import":false,"backup_restore":false,"max_active_brands":1}})}
fn token(key:&SigningKey,value:&Value)->String {
    let payload=serde_json::to_vec(value).unwrap();let mut message=DOMAIN.to_vec();message.extend_from_slice(&payload);
    format!("SC2.{}.{}",URL_SAFE_NO_PAD.encode(payload),URL_SAFE_NO_PAD.encode(key.sign(&message).to_bytes()))
}

#[test]
fn signatures_reject_tampering_wrong_issuer_and_unsupported_claims() {
    let key=SigningKey::from_bytes(&[41;32]);let value=claims();let valid=token(&key,&value);
    assert!(license_signature::verify(&valid,&key.verifying_key()).is_ok());
    assert!(license_signature::verify(&valid,&SigningKey::from_bytes(&[42;32]).verifying_key()).is_err());
    let mut pieces=valid.split('.').map(str::to_owned).collect::<Vec<_>>();pieces[1]=URL_SAFE_NO_PAD.encode(b"{}");
    assert!(license_signature::verify(&pieces.join("."),&key.verifying_key()).is_err());
    for (field,bad) in [("schema",json!(1)),("product",json!("other")),("edition",json!("enterprise")),("licensed_to",json!("bad\u{0085}owner")),("extra",json!(true))] {
        let mut changed=value.clone();changed[field]=bad;assert!(license_signature::verify(&token(&key,&changed),&key.verifying_key()).is_err());
    }
    assert!(license_signature::verify(&"X".repeat(16385),&key.verifying_key()).is_err());
}

#[test]
fn native_license_gates_preserve_records_and_valid_activation() {
    let dir=tempfile::tempdir().unwrap();let mut store=Store::open(&dir.path().join("test.sqlite")).unwrap();
    let key=SigningKey::from_bytes(&[43;32]);store.policy=Policy::trusted(key.verifying_key());
    assert!(store.request("entities/Brand/create",&[json!({"name":"blocked"})]).is_err());
    let valid=token(&key,&claims());assert_eq!(store.policy.activate(dir.path(),&valid).unwrap()["activated"],true);
    let brand=store.request("entities/Brand/create",&[json!({"name":"First"})]).unwrap();
    assert!(store.request("entities/Brand/create",&[json!({"name":"Second"})]).is_err());
    for capability in ["ai","media","restore"] {assert!(store.policy.require(dir.path(),capability).is_err());}
    assert!(store.policy.activate(dir.path(),"invalid").is_err());assert_eq!(store.policy.status(dir.path()).unwrap()["activated"],true);
    store.request("entities/Brand/update",&[brand["id"].clone(),json!({"status":"archived"})]).unwrap();
    store.request("entities/Brand/create",&[json!({"name":"Second"})]).unwrap();
    assert!(store.request("entities/Brand/update",&[brand["id"].clone(),json!({"status":"active"})]).is_err());
    let mut unlimited=claims();unlimited["rights"]["max_active_brands"]=Value::Null;
    store.policy.activate(dir.path(),&token(&key,&unlimited)).unwrap();
    store.request("entities/Brand/update",&[brand["id"].clone(),json!({"status":"active"})]).unwrap();
    store.policy.activate(dir.path(),&valid).unwrap();
    store.request("entities/Brand/update",&[brand["id"].clone(),json!({"name":"Still editable after downgrade"})]).unwrap();
    assert!(store.import_media(&dir.path().join("missing.png"),brand["id"].as_str().unwrap()).unwrap_err().contains("license"));
    assert!(store.restore_backup("unused").unwrap_err().contains("license"));
    let backup=dir.path().join("test.scbackup");store.export_backup(&backup).unwrap();
    let archive=zip::ZipArchive::new(std::fs::File::open(backup).unwrap()).unwrap();
    assert_eq!(archive.len(),1);assert!(archive.file_names().all(|name|name=="workspace.json"));
    store.policy.clear(dir.path()).unwrap();assert_eq!(store.request("entities/Brand/all",&[]).unwrap().as_array().unwrap().len(),2);
    assert!(store.request("entities/Brand/delete",&[brand["id"].clone()]).is_err());
}

#[test]
fn binding_survives_reinstall_and_rejects_other_or_unavailable_hardware() {
    let first=tempfile::tempdir().unwrap();let fresh_install=tempfile::tempdir().unwrap();let key=SigningKey::from_bytes(&[44;32]);let policy=Policy::trusted(key.verifying_key());
    let valid=token(&key,&claims());policy.activate(first.path(),&valid).unwrap();
    policy.activate(fresh_install.path(),&valid).unwrap();
    let other=Policy::for_machine(key.verifying_key(),Ok(format!("SCM1-{}","B".repeat(64))));
    assert!(other.activate(first.path(),&valid).unwrap_err().contains("another computer"));
    assert!(other.require(first.path(),"write").is_err());assert_eq!(other.status(first.path()).unwrap()["activated"],false);
    let unavailable=Policy::for_machine(key.verifying_key(),Err("hardware unavailable".into()));
    assert!(unavailable.activate(first.path(),&valid).is_err());assert_eq!(unavailable.status(first.path()).unwrap()["machine_id"],Value::Null);
    assert!(unavailable.require(first.path(),"ai").is_err());assert_eq!(policy.status(first.path()).unwrap()["activated"],true);
    let mut unbound=claims();unbound.as_object_mut().unwrap().remove("machine_id");
    assert!(policy.activate(first.path(),&token(&key,&unbound)).is_err());
    assert!(policy.activate(first.path(),&valid.replacen("SC2.","SC1.",1)).is_err());
    let mut replacement=claims();replacement["reissued_from_machine_id"]=replacement["machine_id"].clone();replacement["machine_id"]=json!(format!("SCM1-{}","B".repeat(64)));replacement["reissue_reason"]=json!("Verified motherboard repair");
    let reissued=token(&key,&replacement);other.activate(first.path(),&reissued).unwrap();
    assert!(policy.require(first.path(),"write").is_err());other.require(first.path(),"write").unwrap();
}
