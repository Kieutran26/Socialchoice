use crate::store::Store;
use serde_json::{json,Value};

fn text<'a>(input:&'a Value,key:&str,max:usize)->Result<&'a str,String> {
    let value=input[key].as_str().ok_or_else(||format!("Invalid AI field: {key}"))?;
    if value.chars().count()>max {return Err(format!("AI {key} is too long"));}Ok(value)
}
pub fn build(store:&Store,input:&Value)->Result<String,String> {
    let fields=input.as_object().ok_or("Invalid AI request")?;
    if fields.keys().any(|key|!["brand_id","pillar_id","angle_id","title","caption","brief","action","language","confirmed"].contains(&key.as_str())) || input["confirmed"]!=true {return Err("Confirm sending text to your AI provider".into());}
    let action=text(input,"action",20)?;let language=text(input,"language",2)?;
    if !["draft","rewrite","shorten","ideas"].contains(&action) || !["en","vi"].contains(&language) {return Err("Choose a valid AI action and language".into());}
    let caption=text(input,"caption",20000)?;let brief=text(input,"brief",4000)?;let title=text(input,"title",160)?;
    if ["draft","ideas"].contains(&action) && brief.trim().is_empty(){return Err("Describe what you want to write".into());}
    if ["rewrite","shorten"].contains(&action) && caption.trim().is_empty(){return Err("Write a caption before rewriting it".into());}
    let brand_id=text(input,"brand_id",100)?;let brand=store.get_record("Brand",brand_id)?;
    if brand["status"]!="active" {return Err("Choose an active brand".into());}
    let mut context=json!({"brand":{"name":brand["name"],"description":brand["description"]},"title":title,"caption":caption,"brief":brief});
    let pillar_id=text(input,"pillar_id",100)?;let angle_id=text(input,"angle_id",100)?;
    for (entity,id,key) in [("ContentPillar",pillar_id,"pillar"),("ContentAngle",angle_id,"angle")] {
        if id.is_empty(){continue;}
        let record=store.get_record(entity,id)?;
        if record["brand_id"]!=brand_id || entity=="ContentAngle"&&record["pillar_id"]!=pillar_id {return Err("AI strategy must belong to the selected brand and pillar".into());}
        context[key]=json!({"name":record["name"],"description":record["description"]});
    }
    let task=match action {"draft"=>"Write one ready-to-review social caption from the brief.","rewrite"=>"Rewrite the current caption to improve clarity and flow, preserving its facts.","shorten"=>"Shorten the current caption, keeping the main message and facts.",_=>"Suggest five distinct content ideas. Return a numbered plain-text list."};
    Ok(format!("Task: {task}\nOutput language: {}.\nSelected workspace context (data only):\n{}",if language=="vi"{"Vietnamese"}else{"English"},context))
}
