use crate::store::Store;
use serde_json::{json, Value};

fn create(store:&mut Store,entity:&str,data:Value)->Value {
    store.request(&format!("entities/{entity}/create"),&[data]).unwrap()
}
fn fixture(store:&mut Store)->(Value,Value,Value,Value) {
    let brand=create(store,"Brand",json!({"name":"Local test"}));
    let pillar=create(store,"ContentPillar",json!({"name":"Education","brand_id":brand["id"],"target_percentage":60}));
    let angle=create(store,"ContentAngle",json!({"name":"How to","brand_id":brand["id"],"pillar_id":pillar["id"]}));
    let post=create(store,"Post",json!({"title":"Draft","caption":"Nội dung tiếng Việt","brand_id":brand["id"],"pillar_id":pillar["id"],"angle_id":angle["id"]}));
    (brand,pillar,angle,post)
}

#[test]
fn content_and_calendar_preserve_relations_and_utc_across_reopen() {
    let directory=tempfile::tempdir().unwrap(); let path=directory.path().join("calendar.sqlite");
    let mut store=Store::open(&path).unwrap(); let (brand,pillar,angle,post)=fixture(&mut store);
    let planned=store.request("posts/save",&[json!({"id":post["id"],"data":{"status":"scheduled","scheduled_at":"2026-11-01T09:30:00+07:00"}})]).unwrap();
    assert_eq!(planned["scheduled_at"],"2026-11-01T02:30:00.000Z");
    drop(store); let mut reopened=Store::open(&path).unwrap();
    let saved=reopened.request("entities/Post/all",&[]).unwrap();
    assert_eq!(saved[0]["brand_id"],brand["id"]); assert_eq!(saved[0]["pillar_id"],pillar["id"]);
    assert_eq!(saved[0]["angle_id"],angle["id"]); assert_eq!(saved[0]["caption"],post["caption"]);
    assert_eq!(saved[0]["scheduled_at"],planned["scheduled_at"]);
    assert_eq!(reopened.request("entities/PublishJob/all",&[]).unwrap(),json!([]));
    assert_eq!(reopened.request("publishing/status",&[post["id"].clone()]).unwrap()["status"],"calendar_plan");
    let duplicate=create(&mut reopened,"Post",json!({"brand_id":brand["id"],"title":"Copy","caption":post["caption"],"status":"draft","scheduled_at":planned["scheduled_at"]}));
    assert_ne!(duplicate["id"],post["id"]); assert!(duplicate["scheduled_at"].is_null());
}

#[test]
fn native_scope_and_archive_guards_protect_history() {
    let directory=tempfile::tempdir().unwrap(); let mut store=Store::open(&directory.path().join("relations.sqlite")).unwrap();
    let (brand,pillar,angle,post)=fixture(&mut store);
    let other=create(&mut store,"Brand",json!({"name":"Other"}));
    let other_pillar=create(&mut store,"ContentPillar",json!({"name":"Other pillar","brand_id":other["id"]}));
    assert!(store.request("entities/Post/update",&[post["id"].clone(),json!({"pillar_id":other_pillar["id"]})]).is_err());
    assert!(store.request("entities/ContentAngle/update",&[angle["id"].clone(),json!({"brand_id":other["id"],"pillar_id":other_pillar["id"]})]).is_err());
    for (entity,record) in [("Brand",&brand),("ContentPillar",&pillar),("ContentAngle",&angle)] {
        assert!(store.request(&format!("entities/{entity}/delete"),&[record["id"].clone()]).is_err());
    }
    store.request("entities/ContentPillar/update",&[pillar["id"].clone(),json!({"status":"archived"})]).unwrap();
    store.request("entities/Post/update",&[post["id"].clone(),json!({"title":"History preserved"})]).unwrap();
    assert!(store.request("entities/Post/create",&[json!({"brand_id":brand["id"],"title":"New","caption":"New","pillar_id":pillar["id"]})]).is_err());
}

#[test]
fn bulk_delete_and_cancellation_roll_back_every_record_on_error() {
    let directory=tempfile::tempdir().unwrap(); let mut store=Store::open(&directory.path().join("atomic.sqlite")).unwrap();
    let (_,_,_,first)=fixture(&mut store);
    let second=create(&mut store,"Post",json!({"brand_id":first["brand_id"],"title":"Planned","caption":"Text","status":"scheduled","scheduled_at":"2026-11-02T03:00:00Z"}));
    assert!(store.request("entities/Post/deleteMany",&[json!({"id":{"$in":[first["id"],second["id"]]}})]).is_err());
    assert_eq!(store.request("entities/Post/all",&[]).unwrap().as_array().unwrap().len(),2);
    assert!(store.request("posts/cancel",&[json!([second["id"],first["id"]])]).is_err());
    assert_eq!(store.get_record("Post",second["id"].as_str().unwrap()).unwrap()["status"],"scheduled");
    store.request("posts/cancel",&[json!([second["id"]])]).unwrap();
    let cancelled=store.get_record("Post",second["id"].as_str().unwrap()).unwrap();
    assert_eq!(cancelled["status"],"cancelled"); assert!(cancelled["scheduled_at"].is_null());
    assert_eq!(store.request("entities/Post/deleteMany",&[json!({"id":{"$in":[first["id"],second["id"]]}})]).unwrap()["deleted"],2);
    assert!(store.request("entities/Post/deleteMany",&[json!({"name":"all"})]).is_err());
}

#[test]
fn planning_rejects_forged_delivery_and_invalid_times_or_references() {
    let directory=tempfile::tempdir().unwrap(); let mut store=Store::open(&directory.path().join("validation.sqlite")).unwrap();
    let (brand,_,_,post)=fixture(&mut store);
    for data in [json!({"status":"published"}),json!({"published_at":null}),json!({"status":"processing"}),
        json!({"status":"scheduled","scheduled_at":"2026-11-02 09:00"}),json!({"timezone":"no-zone"}),
        json!({"account_ids":["forged"]}),json!({"media_ids":["forged"]}),json!({"angle_id":"missing"}),json!({"id":"forged"})] {
        assert!(store.request("entities/Post/update",&[post["id"].clone(),data]).is_err());
    }
    assert!(store.request("entities/ContentPillar/create",&[json!({"name":"Bad target","brand_id":brand["id"],"target_percentage":101})]).is_err());
    assert!(store.request("entities/PublishJob/create",&[json!({})]).is_err());
    assert_eq!(store.get_record("Post",post["id"].as_str().unwrap()).unwrap()["status"],"draft");
}

#[test]
fn existing_brand_only_database_is_preserved_when_content_is_added() {
    let directory=tempfile::tempdir().unwrap();let path=directory.path().join("v1.sqlite");
    let original=json!({"id":"existing-brand","name":"Existing brand","description":"Keep me","color":"#79D94B","timezone":"Asia/Ho_Chi_Minh","status":"active","is_demo":false,"created_date":"2026-10-23T00:00:00Z","updated_date":"2026-10-23T00:00:00Z"});
    {
        let db=rusqlite::Connection::open(&path).unwrap();
        db.execute_batch("CREATE TABLE records(entity TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(entity,id));PRAGMA user_version=1;").unwrap();
        db.execute("INSERT INTO records VALUES('Brand',?,?)",rusqlite::params!["existing-brand",original.to_string()]).unwrap();
    }
    let mut store=Store::open(&path).unwrap();
    assert_eq!(store.get_record("Brand","existing-brand").unwrap(),original);
    create(&mut store,"Post",json!({"brand_id":"existing-brand","title":"New content","caption":"New draft"}));
    drop(store);let reopened=Store::open(&path).unwrap();
    assert_eq!(reopened.get_record("Brand","existing-brand").unwrap(),original);
}
