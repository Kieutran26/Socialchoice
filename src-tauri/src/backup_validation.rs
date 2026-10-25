use crate::{backup::ENTITIES, entities, media::{self, io_error, MAX_FILE}, store::{database_error, Store}};
use serde_json::Value;
use std::path::Path;

pub fn validate(manifest:&Value,media_root:&Path)->Result<(),String> {
    let directory=tempfile::tempdir().map_err(io_error)?;
    let store=Store::open(&directory.path().join("validate.sqlite"))?;
    let rows=manifest["records"].as_array().ok_or("Invalid backup records")?;
    for row in rows {
        let entity=row["entity"].as_str().filter(|entity|ENTITIES.contains(entity)).ok_or("Unsupported backup entity")?;
        let record=&row["data"];
        let id=record["id"].as_str().filter(|id|!id.is_empty()&&id.len()<=100).ok_or("Invalid backup record ID")?;
        for key in ["created_date","updated_date"] {chrono::DateTime::parse_from_rfc3339(record[key].as_str().ok_or("Invalid backup timestamp")?).map_err(|_|"Invalid backup timestamp")?;}
        store.db.execute("INSERT INTO records VALUES (?,?,?)",rusqlite::params![entity,id,record.to_string()]).map_err(|_|"Duplicate or invalid backup record")?;
    }
    for row in rows {
        let entity=row["entity"].as_str().unwrap();let record=&row["data"];
        if entity=="MediaAsset" {
            let name=media::filename(record)?;
            let bytes=media::read_bounded(&media_root.join(name),MAX_FILE)?;let metadata=media::inspect(&bytes)?;
            if media::hash(&bytes)!=record["sha256"].as_str().ok_or("Invalid hash")? || record["size_bytes"].as_u64()!=Some(bytes.len() as u64) || record["is_demo"]!=false || record["file_url"]!="" {return Err("Damaged or invalid backup media".into());}
            for key in ["file_type","mime_type","width","height","duration_seconds"] {if record.get(key)!=metadata.get(key) {return Err("Backup media metadata mismatch".into());}}
            if !name.ends_with(&format!(".{}",metadata["extension"].as_str().unwrap())) {return Err("Backup media extension mismatch".into());}
            if record["name"].as_str().is_none_or(|name|name.is_empty()||name.chars().count()>240) {return Err("Invalid media name".into());}
            if record["filename"].as_str().is_none_or(|name|name.is_empty()||name.chars().count()>240) {return Err("Invalid media filename".into());}
            let allowed=["id","created_date","updated_date","brand_id","name","filename","file_url","storage_id","sha256","size_bytes","is_demo","file_type","mime_type","width","height","duration_seconds"];
            if record.as_object().ok_or("Invalid media")?.keys().any(|key|!allowed.contains(&key.as_str())) {return Err("Unsupported media fields".into());}
        } else {
            let mut fields=record.as_object().ok_or("Invalid record")?.clone();for key in ["id","created_date","updated_date"] {fields.remove(key);}
            let normalized=entities::prepare(entity,&Value::Object(fields),Some(record))?;
            if entity=="Post" && normalized["scheduled_at"]!=record["scheduled_at"] {return Err("Backup plan time is not normalized".into());}
        }
        store.validate_links(entity,record,Some(record))?;
    }
    // No delivery entities, remote URLs, secret configuration or executable paths are accepted by this format.
    let invalid:i64=store.db.query_row("SELECT COUNT(*) FROM records WHERE json_extract(data,'$.is_demo') != 0",[],|row|row.get(0)).map_err(database_error)?;
    if invalid!=0 {return Err("Demo data cannot be restored".into());}Ok(())
}
