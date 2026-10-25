use rusqlite::{Connection, OptionalExtension};
use serde_json::{json, Value};
use std::{path::Path, time::Duration};

pub struct Store { pub(super) db: Connection, pub(super) root: std::path::PathBuf, pub(super) pending: Option<crate::backup::Prepared>, pub(super) policy:crate::license_state::Policy }
pub(super) fn database_error(_: rusqlite::Error) -> String { "Local database operation failed".into() }
pub(super) fn arg(args: &[Value], index: usize) -> Result<&Value, String> {
    args.get(index).ok_or_else(|| "Missing operation argument".into())
}

impl Store {
    pub fn open(path: &Path) -> Result<Self, String> {
        let db=Connection::open(path).map_err(database_error)?;
        db.busy_timeout(Duration::from_secs(5)).map_err(database_error)?;
        let version:i64=db.query_row("PRAGMA user_version",[],|row|row.get(0)).map_err(database_error)?;
        if version>1 { return Err("This workspace requires a newer application".into()); }
        db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; BEGIN IMMEDIATE;
            CREATE TABLE IF NOT EXISTS records (entity TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(entity,id));
            PRAGMA user_version=1; COMMIT;").map_err(database_error)?;
        let root=path.parent().ok_or("Invalid workspace directory")?.to_path_buf();
        crate::managed_paths::directory(&root,"media")?;
        Ok(Self{db,root,pending:None,policy:crate::license_state::Policy::compiled()})
    }

    pub(super) fn records(&self,entity:&str)->Result<Vec<Value>,String> {
        let schemas:Value=serde_json::from_str(include_str!("../../server/entity-schemas.json")).map_err(|_|"Entity schema unavailable")?;
        if schemas.get(entity).is_none() { return Err("Unknown or server-only entity".into()); }
        let mut statement=self.db.prepare("SELECT data FROM records WHERE entity=? ORDER BY id").map_err(database_error)?;
        let rows=statement.query_map([entity],|row|row.get::<_,String>(0)).map_err(database_error)?;
        rows.map(|row| {
            let mut value:Value=serde_json::from_str(&row.map_err(database_error)?).map_err(|_|"Workspace contains an unreadable record")?;
            if entity=="MediaAsset" {value["file_url"]=json!(self.media_path(&value)?.to_string_lossy());}
            if entity=="SocialAccount" && value["connection_status"]=="connected" && value["expires_at"].as_i64().is_none_or(|expiry|expiry<=chrono::Utc::now().timestamp_millis()) {value["connection_status"]=json!("expired");}
            Ok(value)
        }).collect()
    }

    pub(super) fn get_record(&self,entity:&str,id:&str)->Result<Value,String> {
        let row:Option<String>=self.db.query_row("SELECT data FROM records WHERE entity=? AND id=?",[entity,id],|row|row.get(0)).optional().map_err(database_error)?;
        serde_json::from_str(&row.ok_or("Record not found")?).map_err(|_|"Workspace contains an unreadable record".into())
    }

    pub fn request(&mut self,path:&str,args:&[Value])->Result<Value,String> {
        if path.len()>100 || args.len()>3 || serde_json::to_vec(args).map_err(|_|"Invalid arguments")?.len()>256*1024 { return Err("Request too large".into()); }
        if path=="session" { return Ok(json!({"id":"local-owner","full_name":"Local workspace owner","mode":"desktop-local"})); }
        if path=="publishing/check" { return Ok(json!({"unavailable":true,"queued":0,"nextDue":null,"message":"Publishing is not included in this desktop prototype. No posts are sent."})); }
        if path=="publishing/status" {
            let id=arg(args,0)?.as_str().ok_or("Invalid post ID")?;
            let post=self.get_record("Post",id)?;
            return Ok(json!({"postId":id,"status":"calendar_plan","items":[],"scheduledAt":post["scheduled_at"]}));
        }
        let parts=path.split('/').collect::<Vec<_>>();
        if parts.len()==3 && parts[0]=="entities" && parts[2]=="all" { return Ok(json!(self.records(parts[1])?)); }
        self.policy.require(&self.root,"write")?;
        // Relation checks and all multi-record operations share the same SQLite write lock.
        self.db.execute_batch("BEGIN IMMEDIATE").map_err(database_error)?;
        let result=self.mutate(path,args);
        match result {
            Ok(value)=>{
                if let Err(error)=self.db.execute_batch("COMMIT") { let _=self.db.execute_batch("ROLLBACK");return Err(database_error(error)); }
                Ok(value)
            },
            Err(error)=>{self.db.execute_batch("ROLLBACK").map_err(database_error)?;Err(error)}
        }
    }
}
