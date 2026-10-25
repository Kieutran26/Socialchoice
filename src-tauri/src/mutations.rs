use crate::{entities, store::{arg, database_error, Store}};
use rusqlite::params;
use serde_json::{json, Value};
use std::collections::HashSet;

fn ids(value: &Value) -> Result<Vec<&str>, String> {
    let values=value.as_array().ok_or("Invalid post selection")?;
    let result=values.iter().map(|id| id.as_str().filter(|id| !id.is_empty()).ok_or("Invalid post ID")).collect::<Result<Vec<_>,_>>()?;
    if result.is_empty() || result.len()>100 || result.iter().collect::<HashSet<_>>().len()!=result.len() { return Err("Invalid post selection".into()); }
    Ok(result)
}

impl Store {
    pub(super) fn write_record(&self, entity: &str, input: &Value, id: Option<&str>) -> Result<Value, String> {
        let previous=id.map(|id| self.get_record(entity,id)).transpose()?;
        let value=entities::prepare(entity,input,previous.as_ref())?;
        self.validate_links(entity,&value,previous.as_ref())?;
        if entity=="Brand" && value["status"]=="active" && previous.as_ref().is_none_or(|old|old["status"]!="active") {
            if let Some(limit)=self.policy.brand_limit(&self.root)? {
                let count:u32=self.db.query_row("SELECT COUNT(*) FROM records WHERE entity='Brand' AND json_extract(data,'$.status')='active'",[],|row|row.get(0)).map_err(database_error)?;
                if count>=limit{return Err("Active brand limit reached. Archive a brand or change the license; existing data is preserved.".into());}
            }
        }
        self.db.execute("INSERT INTO records VALUES (?,?,?) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data",params![entity,value["id"].as_str().ok_or("Invalid ID")?,value.to_string()]).map_err(database_error)?;
        Ok(value)
    }

    fn remove_record(&self, entity: &str, id: &str) -> Result<Value, String> {
        if !entities::writable(entity) { return Err("Entity is read-only in desktop planning".into()); }
        let record=self.get_record(entity,id)?;
        if self.references(entity,id)? { return Err("Record is in use; archive instead".into()); }
        if entity=="Post" && !["draft","cancelled"].contains(&record["status"].as_str().unwrap_or("")) { return Err("Only drafts can be deleted. Cancel calendar plans instead.".into()); }
        self.db.execute("DELETE FROM records WHERE entity=? AND id=?",[entity,id]).map_err(database_error)?;
        Ok(json!({"success":true}))
    }

    pub(super) fn mutate(&self, path: &str, args: &[Value]) -> Result<Value, String> {
        if path=="templates/save" {return self.save_template(arg(args,0)?);}
        if path=="templates/createDraft" {return self.template_draft(args);}
        if path=="posts/save" {
            let plan=arg(args,0)?.as_object().ok_or("Invalid calendar plan")?;
            if plan.keys().any(|key| !["id","data"].contains(&key.as_str())) { return Err("Invalid calendar plan".into()); }
            let id=match plan.get("id") { None | Some(Value::Null)=>None,Some(value)=>Some(value.as_str().ok_or("Invalid post ID")?) };
            let data=plan.get("data").ok_or("Missing post data")?;
            if !["draft","scheduled"].contains(&data["status"].as_str().unwrap_or("")) { return Err("Only drafts and calendar plans can be saved here".into()); }
            return self.write_record("Post",data,id);
        }
        if path=="posts/cancel" {
            let selected=ids(arg(args,0)?)?;
            for id in &selected {
                if self.get_record("Post",id)?["status"]!="scheduled" { return Err("Only scheduled posts can be cancelled".into()); }
                self.write_record("Post",&json!({"status":"cancelled"}),Some(id))?;
            }
            return Ok(json!({"cancelled":selected.len()}));
        }
        let parts=path.split('/').collect::<Vec<_>>();
        if parts.len()!=3 || parts[0]!="entities" { return Err("Feature unavailable in this desktop prototype".into()); }
        let (entity,operation)=(parts[1],parts[2]);
        if entity=="SocialAccount" {return crate::social_accounts::mutate(self,operation,args);}
        if entity=="MediaAsset" && operation=="delete" {return self.delete_media(arg(args,0)?.as_str().ok_or("Invalid media ID")?);}
        if !entities::writable(entity) { return Err("Entity is read-only in desktop planning".into()); }
        match operation {
            "create"=>self.write_record(entity,arg(args,0)?,None),
            "update"=>self.write_record(entity,arg(args,1)?,Some(arg(args,0)?.as_str().ok_or("Invalid ID")?)),
            "delete"=>self.remove_record(entity,arg(args,0)?.as_str().ok_or("Invalid ID")?),
            "deleteMany" if entity=="Post" => {
                let query=arg(args,0)?.as_object().ok_or("Invalid post selection")?;
                if query.len()!=1 || query.get("id").and_then(Value::as_object).is_none_or(|rule| rule.len()!=1 || !rule.contains_key("$in")) { return Err("Select posts by ID".into()); }
                let selected=ids(&query["id"]["$in"])?;
                for id in &selected { self.remove_record("Post",id)?; }
                Ok(json!({"deleted":selected.len()}))
            }
            _=>Err("Unsupported desktop entity operation".into()),
        }
    }
}
