use crate::{media::{self, io_error, MAX_FILE}, store::{database_error, Store}};
use chrono::Utc;
use serde_json::{json, Value};
use std::{collections::HashSet, fs::File, io::{Read, Write}, path::Path};
use uuid::Uuid;
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};

pub const ENTITIES:[&str;7]=["Brand","ContentPillar","ContentAngle","MediaAsset","Post","PostTemplate","SocialAccount"];
const MAX_TOTAL:u64=2*1024*1024*1024;
pub struct Prepared { pub token:String, pub directory:tempfile::TempDir, pub manifest:Value }

impl Store {
    pub fn export_backup(&self,path:&Path)->Result<(),String> {
        let mut rows=Vec::new();
        let mut statement=self.db.prepare("SELECT entity,data FROM records ORDER BY entity,id").map_err(database_error)?;
        let records=statement.query_map([],|row|Ok((row.get::<_,String>(0)?,row.get::<_,String>(1)?))).map_err(database_error)?;
        for row in records {
            let (entity,data)=row.map_err(database_error)?;
            if !ENTITIES.contains(&entity.as_str()) { return Err("Workspace contains unsupported records; use a newer app".into()); }
            let mut value=serde_json::from_str::<Value>(&data).map_err(io_error)?;
            if entity=="SocialAccount"{value=crate::social_accounts::portable(&value)?;}
            rows.push(json!({"entity":entity,"data":value}));
        }
        if rows.len()>10000 { return Err("Backup supports up to 10000 records".into()); }
        let manifest=json!({"format":"socialchoice-workspace","version":1,"created_at":Utc::now().to_rfc3339(),"records":rows});
        let manifest_bytes=serde_json::to_vec(&manifest).map_err(io_error)?;
        if manifest_bytes.len()>32*1024*1024 {return Err("Backup record data is too large".into());}
        let parent=path.parent().ok_or("Choose a backup directory")?;
        let mut temp=tempfile::NamedTempFile::new_in(parent).map_err(io_error)?;
        {
            let mut archive=ZipWriter::new(temp.as_file_mut());
            let options=SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
            archive.start_file("workspace.json",options).map_err(io_error)?;archive.write_all(&manifest_bytes).map_err(io_error)?;
            let mut seen=HashSet::new();let mut total=0u64;
            for row in manifest["records"].as_array().unwrap().iter().filter(|row|row["entity"]=="MediaAsset") {
                let record=&row["data"];let name=media::filename(record)?;
                if !seen.insert(name.to_owned()) {continue;}
                let bytes=media::read_bounded(&self.media_path(record)?,MAX_FILE)?;
                if media::hash(&bytes)!=record["sha256"].as_str().ok_or("Invalid media hash")? {return Err("Cannot back up damaged media".into());}
                total+=bytes.len() as u64;if total>MAX_TOTAL {return Err("Backup media exceeds 2 GiB".into());}
                archive.start_file(format!("media/{name}"),options).map_err(io_error)?;archive.write_all(&bytes).map_err(io_error)?;
            }
            archive.finish().map_err(io_error)?;
        }
        temp.as_file().sync_all().map_err(io_error)?;temp.persist(path).map_err(io_error)?;Ok(())
    }

    pub fn inspect_backup(&mut self,path:&Path)->Result<Value,String> {
        self.pending=None;
        let file=File::open(path).map_err(io_error)?;
        if file.metadata().map_err(io_error)?.len()>MAX_TOTAL+40*1024*1024 {return Err("Backup exceeds 2 GiB media limit".into());}
        let mut archive=ZipArchive::new(file).map_err(|_|"Choose a valid Socialchoice backup")?;
        if archive.len()>10001 {return Err("Too many archive entries".into());}
        let mut bytes=Vec::new();archive.by_name("workspace.json").map_err(|_|"Backup manifest missing")?.take(32*1024*1024+1).read_to_end(&mut bytes).map_err(io_error)?;
        if bytes.len()>32*1024*1024 {return Err("Backup manifest too large".into());}
        let manifest:Value=serde_json::from_slice(&bytes).map_err(|_|"Invalid backup manifest")?;
        if manifest["format"]!="socialchoice-workspace" || manifest["version"]!=1 {return Err("Unsupported backup format or version".into());}
        let rows=manifest["records"].as_array().filter(|rows|rows.len()<=10000).ok_or("Invalid backup records")?;
        let directory=tempfile::tempdir().map_err(io_error)?;let mut expected=HashSet::from(["workspace.json".to_owned()]);
        for row in rows.iter().filter(|row|row["entity"]=="MediaAsset") {expected.insert(format!("media/{}",media::filename(&row["data"])?));}
        let mut seen=HashSet::new();let mut total=0u64;
        for index in 0..archive.len() {
            let mut entry=archive.by_index(index).map_err(io_error)?;let name=entry.name().to_owned();
            if !expected.contains(&name) || !seen.insert(name.clone()) || entry.is_dir() || entry.unix_mode().is_some_and(|mode|mode&0o170000==0o120000) {return Err("Unexpected or unsafe archive entry".into());}
            if name=="workspace.json" {continue;}
            if entry.size()>MAX_FILE {return Err("Backup media file too large".into());}
            let mut bytes=Vec::new();entry.by_ref().take(MAX_FILE+1).read_to_end(&mut bytes).map_err(io_error)?;
            if bytes.len() as u64>MAX_FILE {return Err("Backup media file too large".into());}
            total+=bytes.len() as u64;if total>MAX_TOTAL {return Err("Backup media exceeds 2 GiB".into());}
            std::fs::write(directory.path().join(name.strip_prefix("media/").unwrap()),bytes).map_err(io_error)?;
        }
        if seen!=expected {return Err("Backup media file missing".into());}
        crate::backup_validation::validate(&manifest,directory.path())?;
        let token=Uuid::new_v4().to_string();
        let counts=ENTITIES.iter().map(|entity|((*entity).to_owned(),json!(rows.iter().filter(|row|row["entity"]==*entity).count()))).collect::<serde_json::Map<_,_>>();
        let summary=json!({"token":token,"created_at":manifest["created_at"],"counts":counts,"media_bytes":total});
        self.pending=Some(Prepared{token,directory,manifest});Ok(summary)
    }

    pub fn restore_backup(&mut self,token:&str)->Result<Value,String> {
        self.policy.require(&self.root,"restore")?;
        let prepared=self.pending.take().ok_or("Select and inspect a backup first")?;
        if prepared.token!=token {return Err("Backup confirmation expired; select it again".into());}
        // Validate again before installing immutable files; no archive extraction touches the live workspace.
        crate::backup_validation::validate(&prepared.manifest,prepared.directory.path())?;
        let recovery=crate::managed_paths::directory(&self.root,"backups")?;
        let recovery_path=recovery.join(format!("before-restore-{}.scbackup",Uuid::new_v4()));self.export_backup(&recovery_path)?;
        let rows=prepared.manifest["records"].as_array().ok_or("Invalid backup")?;
        for row in rows.iter().filter(|row|row["entity"]=="MediaAsset") {
            let record=&row["data"];let bytes=media::read_bounded(&prepared.directory.path().join(media::filename(record)?),MAX_FILE)?;self.ensure_media(record,&bytes)?;
        }
        let transaction=self.db.transaction().map_err(database_error)?;
        transaction.execute("DELETE FROM records",[]).map_err(database_error)?;
        for row in rows {transaction.execute("INSERT INTO records VALUES (?,?,?)",rusqlite::params![row["entity"].as_str(),row["data"]["id"].as_str(),row["data"].to_string()]).map_err(database_error)?;}
        transaction.commit().map_err(database_error)?;
        Ok(json!({"restored":rows.len(),"recovery_path":recovery_path.to_string_lossy()}))
    }
}
