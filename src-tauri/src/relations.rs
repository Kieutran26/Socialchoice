use crate::store::{database_error, Store};
use serde_json::Value;

impl Store {
    pub(super) fn references(&self, entity: &str, id: &str) -> Result<bool, String> {
        if entity=="SocialAccount" {
            let count:i64=self.db.query_row("SELECT COUNT(*) FROM records r,json_each(r.data,'$.account_ids') a WHERE r.entity IN ('Post','PostTemplate') AND a.value=?",[id],|row|row.get(0)).map_err(database_error)?;
            return Ok(count>0);
        }
        let key = match entity { "Brand" => "$.brand_id", "ContentPillar" => "$.pillar_id", "ContentAngle" => "$.angle_id", _ => return Ok(false) };
        let count: i64 = self.db.query_row("SELECT COUNT(*) FROM records WHERE entity != ? AND json_extract(data,?)=?", [entity,key,id], |row| row.get(0)).map_err(database_error)?;
        Ok(count > 0)
    }

    pub(super) fn validate_links(&self, entity: &str, record: &Value, previous: Option<&Value>) -> Result<(), String> {
        if entity == "Brand" { return Ok(()); }
        let brand_id = record["brand_id"].as_str().ok_or("Brand is required")?;
        let brand = self.get_record("Brand", brand_id)?;
        if brand["status"] != "active" && previous.is_none_or(|old| old["brand_id"]!=record["brand_id"]) { return Err("Choose an active brand".into()); }
        if matches!(entity,"Post"|"PostTemplate") {
            let ids=record["media_ids"].as_array().ok_or("Invalid media selection")?;
            if ids.len()>10 {return Err("Choose up to 10 images or one video".into());}
            let mut seen=std::collections::HashSet::new();let mut videos=0;
            for id in ids {
                let id=id.as_str().ok_or("Invalid media ID")?;
                if !seen.insert(id) {return Err("Choose different media files".into());}
                let media=self.get_record("MediaAsset",id)?;
                if media["brand_id"]!=record["brand_id"] || media["is_demo"]!=false {return Err("Cross-brand media is not allowed".into());}
                crate::media::filename(&media)?;
                if media["file_type"]=="video" {videos+=1;}
            }
            if videos>0 && ids.len()!=1 {return Err("Choose one video or up to 10 images, not both".into());}
        }
        for (key, parent_entity) in [("pillar_id", "ContentPillar"), ("angle_id", "ContentAngle")] {
            if let Some(id) = record[key].as_str().filter(|id| !id.is_empty()) {
                let parent = self.get_record(parent_entity,id)?;
                if parent["brand_id"] != record["brand_id"] || parent["is_demo"] != record["is_demo"] { return Err("Cross-brand or demo/live association is not allowed".into()); }
                if parent["status"] != "active" && previous.is_none_or(|old| old[key] != record[key]) { return Err(format!("Choose an active {}", if key=="pillar_id" {"pillar"} else {"angle"})); }
                if key == "angle_id" && parent["pillar_id"] != record["pillar_id"] { return Err("Angle must belong to the selected pillar".into()); }
            }
        }
        if let Some(old) = previous {
            let moved = old["brand_id"] != record["brand_id"] || entity=="ContentAngle" && old["pillar_id"]!=record["pillar_id"];
            if moved && self.references(entity,record["id"].as_str().ok_or("Invalid ID")?)? { return Err("Referenced records cannot move between brands or workspaces".into()); }
        }
        Ok(())
    }
}
