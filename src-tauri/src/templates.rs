use crate::store::{Store,arg};
use serde_json::{json,Value,Map};

const CONTENT:[&str;11]=["brand_id","title","caption","media_ids","platform_media_ids","platform_captions","pillar_id","angle_id","account_ids","destination_settings","is_demo"];

impl Store {
    pub(super) fn save_template(&self,input:&Value)->Result<Value,String>{
        let fields=input.as_object().ok_or("Valid template name and content required")?;
        if fields.keys().any(|key|!["id","name","data"].contains(&key.as_str())){return Err("Invalid template request".into());}
        let data=input["data"].as_object().ok_or("Template content required")?;
        let mut content=Map::new();
        for key in CONTENT {if let Some(value)=data.get(key){content.insert(key.into(),value.clone());}}
        content.insert("name".into(),input.get("name").cloned().ok_or("Template name required")?);
        let id=match input.get("id"){None=>None,Some(value)=>Some(value.as_str().filter(|id|!id.is_empty()).ok_or("Template ID required")?)};
        self.write_record("PostTemplate",&Value::Object(content),id)
    }
    pub(super) fn template_draft(&self,args:&[Value])->Result<Value,String>{
        let id=arg(args,0)?.as_str().ok_or("Template ID required")?;
        let template=self.get_record("PostTemplate",id)?;
        let brand=self.get_record("Brand",template["brand_id"].as_str().ok_or("Invalid template brand")?)?;
        if brand["status"]!="active" {return Err("Choose an active brand".into());}
        let mut content=Map::new();let mut warnings=Vec::new();
        for key in CONTENT {if let Some(value)=template.get(key){content.insert(key.into(),value.clone());}}
        let pillar=template["pillar_id"].as_str().filter(|id|!id.is_empty());
        let angle=template["angle_id"].as_str().filter(|id|!id.is_empty());
        if pillar.is_some_and(|id|self.get_record("ContentPillar",id).is_ok_and(|record|record["status"]!="active")){
            content.remove("pillar_id");content.remove("angle_id");warnings.push("Archived pillar and angle were cleared. Choose active content strategy.");
        }else if angle.is_some_and(|id|self.get_record("ContentAngle",id).is_ok_and(|record|record["status"]!="active")){
            content.remove("angle_id");warnings.push("Archived angle was cleared. Choose an active content angle.");
        }
        if content.get("title").and_then(Value::as_str).is_none_or(|title|title.trim().is_empty()){content.insert("title".into(),template["name"].clone());}
        content.insert("status".into(),json!("draft"));content.insert("timezone".into(),brand["timezone"].clone());
        let post=self.write_record("Post",&Value::Object(content),None)?;
        Ok(json!({"post":post,"warnings":warnings}))
    }
}
