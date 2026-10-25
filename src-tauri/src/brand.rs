use chrono::Utc;
use serde_json::{json, Value};
use uuid::Uuid;

pub fn prepare(input: &Value, previous: Option<&Value>) -> Result<Value, String> {
    let fields = input.as_object().ok_or("Brand fields must be an object")?;
    let mut brand = previous.cloned().unwrap_or_else(|| json!({
        "id": Uuid::new_v4().to_string(), "name": "", "description": "",
        "color": "#79D94B", "timezone": "Asia/Ho_Chi_Minh",
        "status": "active", "is_demo": false, "created_date": Utc::now().to_rfc3339()
    }));
    for (key, value) in fields {
        if !["name", "description", "color", "timezone", "status", "is_demo"].contains(&key.as_str()) {
            return Err(format!("Unsupported field: {key}"));
        }
        brand[key] = value.clone();
    }
    let name = brand["name"].as_str().ok_or("Invalid name")?.trim().to_owned();
    if name.is_empty() || name.chars().count() > 160 { return Err("Invalid name".into()); }
    brand["name"] = json!(name);
    if brand["description"].as_str().is_none_or(|v| v.chars().count() > 4000) {
        return Err("Invalid description".into());
    }
    let color = brand["color"].as_str().ok_or("Invalid color")?;
    if color.len() != 7 || !color.starts_with('#') || !color[1..].bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("Invalid color".into());
    }
    let timezone = brand["timezone"].as_str().ok_or("Invalid timezone")?;
    timezone.parse::<chrono_tz::Tz>().map_err(|_| "Invalid timezone")?;
    if !["active", "archived"].contains(&brand["status"].as_str().unwrap_or("")) {
        return Err("Invalid status".into());
    }
    if brand["is_demo"] != false { return Err("Demo mode is unavailable in this desktop prototype".into()); }
    brand["updated_date"] = json!(Utc::now().to_rfc3339());
    Ok(brand)
}
