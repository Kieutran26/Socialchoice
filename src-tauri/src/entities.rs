use chrono::{DateTime, SecondsFormat, Utc};
use serde_json::{json, Value};
use uuid::Uuid;

pub fn writable(entity: &str) -> bool {
    ["Brand", "ContentPillar", "ContentAngle", "Post", "PostTemplate"].contains(&entity)
}

pub fn prepare(entity: &str, input: &Value, previous: Option<&Value>) -> Result<Value, String> {
    if !writable(entity) { return Err("Entity is read-only in desktop planning".into()); }
    if entity == "Brand" { return crate::brand::prepare(input, previous); }
    let schemas: Value = serde_json::from_str(include_str!("../../server/entity-schemas.json")).map_err(|_| "Entity schema unavailable")?;
    let schema = &schemas[entity];
    let fields = input.as_object().ok_or("Fields must be an object")?;
    let mut record = previous.cloned().unwrap_or_else(|| json!({"id":Uuid::new_v4().to_string(),"created_date":Utc::now().to_rfc3339()}));
    if previous.is_none() {
        for (key, rule) in schema["properties"].as_object().ok_or("Entity schema unavailable")? {
            if let Some(default) = rule.get("default") { record[key] = default.clone(); }
        }
        if matches!(entity,"Post"|"PostTemplate") {
            record["account_ids"] = json!([]); record["media_ids"] = json!([]);
            record["platform_captions"] = json!({}); record["platform_media_ids"] = json!({});
            record["destination_settings"] = json!({}); record["caption"] = json!("");
        }
    }
    for (key, value) in fields {
        if schema["properties"].get(key).is_none() || key == "published_at" { return Err(format!("Unsupported field: {key}")); }
        record[key] = value.clone();
    }
    for (key, rule) in schema["properties"].as_object().ok_or("Entity schema unavailable")? {
        let Some(value) = record.get(key) else { continue; };
        if value.is_null() && key == "scheduled_at" { continue; }
        let valid = match rule["type"].as_str().unwrap_or("") {
            "string" => value.is_string(), "number" => value.is_number(),
            "boolean" => value.is_boolean(), "object" => value.is_object(),
            "array" => value.as_array().is_some_and(|items| items.iter().all(Value::is_string)), _ => false,
        };
        if !valid || rule["enum"].as_array().is_some_and(|values| !values.contains(value)) { return Err(format!("Invalid {key}")); }
        if value.as_str().is_some_and(|text| text.chars().count() > 63206) { return Err(format!("Invalid {key}")); }
    }
    for key in schema["required"].as_array().ok_or("Entity schema unavailable")? {
        let key = key.as_str().ok_or("Entity schema unavailable")?;
        if record[key].as_str().is_none_or(|text| text.trim().is_empty()) { return Err(format!("{key} is required")); }
    }
    if record["is_demo"] != false { return Err("Demo mode is unavailable in this desktop prototype".into()); }
    let label = if entity == "Post" { "title" } else { "name" };
    let text = record[label].as_str().ok_or("Invalid title")?.trim().to_owned();
    if text.is_empty() || text.chars().count() > 160 { return Err(format!("Invalid {label}")); }
    record[label] = json!(text);
    if entity=="PostTemplate" && record["title"].as_str().is_some_and(|title|title.chars().count()>160){return Err("Invalid template title".into());}
    if record["description"].as_str().is_some_and(|text| text.chars().count() > 4000) { return Err("Invalid description".into()); }
    if entity == "ContentPillar" {
        let percentage = record["target_percentage"].as_f64().ok_or("Invalid target percentage")?;
        if !(0.0..=100.0).contains(&percentage) { return Err("Target percentage must be between 0 and 100".into()); }
        let color = record["color"].as_str().ok_or("Invalid color")?;
        if color.len() != 7 || !color.starts_with('#') || !color[1..].bytes().all(|c| c.is_ascii_hexdigit()) { return Err("Invalid color".into()); }
    }
    if matches!(entity,"Post"|"PostTemplate") {
        if record["brand_id"].as_str().is_none_or(str::is_empty) { return Err("Post brand is required".into()); }
        if entity=="Post" && !["draft", "scheduled", "cancelled"].contains(&record["status"].as_str().unwrap_or("")) { return Err("Desktop plans cannot contain publishing results".into()); }
        if entity=="Post" && record["status"]=="scheduled" && record["caption"].as_str().is_none_or(|caption|caption.trim().is_empty()) && record["media_ids"].as_array().is_none_or(Vec::is_empty) {return Err("Add a caption or media before scheduling".into());}
        for key in ["account_ids"] {
            if !record[key].as_array().is_some_and(Vec::is_empty) { return Err("Connected destinations are not included yet".into()); }
        }
        for key in ["platform_captions", "platform_media_ids", "destination_settings"] {
            if !record[key].as_object().is_some_and(serde_json::Map::is_empty) { return Err("Platform overrides are unavailable in local planning".into()); }
        }
    }
    if entity=="Post" {
        record["timezone"].as_str().ok_or("Invalid timezone")?.parse::<chrono_tz::Tz>().map_err(|_| "Invalid timezone")?;
        if record["status"] == "scheduled" {
            let instant = DateTime::parse_from_rfc3339(record["scheduled_at"].as_str().ok_or("Set the publishing date and time.")?).map_err(|_| "Invalid UTC timestamp: scheduled_at")?;
            record["scheduled_at"] = json!(instant.to_utc().to_rfc3339_opts(SecondsFormat::Millis, true));
        } else { record["scheduled_at"] = Value::Null; }
    }
    record["updated_date"] = json!(Utc::now().to_rfc3339());
    Ok(record)
}
