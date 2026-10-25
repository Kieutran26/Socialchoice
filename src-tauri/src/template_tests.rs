use crate::store::Store;
use serde_json::json;

#[test]
fn templates_reuse_only_content_and_preserve_media_strategy_and_backup(){
    let dir=tempfile::tempdir().unwrap();let path=dir.path().join("workspace.sqlite");let mut store=Store::open(&path).unwrap();
    let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();
    let pillar=store.request("entities/ContentPillar/create",&[json!({"name":"Pillar","brand_id":brand["id"]})]).unwrap();
    let angle=store.request("entities/ContentAngle/create",&[json!({"name":"Angle","brand_id":brand["id"],"pillar_id":pillar["id"]})]).unwrap();
    let source=dir.path().join("fixture.png");image::RgbaImage::from_pixel(3,3,image::Rgba([1,2,3,255])).save(&source).unwrap();
    let media=store.import_media(&source,brand["id"].as_str().unwrap()).unwrap();
    let template=store.request("templates/save",&[json!({"name":"Reusable","data":{"brand_id":brand["id"],"caption":"Caption","title":"Title","pillar_id":pillar["id"],"angle_id":angle["id"],"media_ids":[media["id"]],"scheduled_at":"2030-01-01T00:00:00Z","status":"published","published_at":"forged","consent":true}})]).unwrap();
    for forbidden in ["scheduled_at","status","published_at","consent"]{assert!(template.get(forbidden).is_none());}
    assert!(store.request("entities/MediaAsset/delete",&[media["id"].clone()]).is_err());
    assert!(store.request("entities/ContentAngle/delete",&[angle["id"].clone()]).is_err());
    let one=store.request("templates/createDraft",&[template["id"].clone()]).unwrap();
    let two=store.request("templates/createDraft",&[template["id"].clone()]).unwrap();
    assert_ne!(one["post"]["id"],two["post"]["id"]);assert_eq!(one["post"]["media_ids"],template["media_ids"]);assert_eq!(one["post"]["status"],"draft");assert!(one["post"]["scheduled_at"].is_null());
    store.request("entities/ContentPillar/update",&[pillar["id"].clone(),json!({"status":"archived"})]).unwrap();
    let cleared=store.request("templates/createDraft",&[template["id"].clone()]).unwrap();
    assert_eq!(cleared["warnings"].as_array().unwrap().len(),1);assert!(cleared["post"]["pillar_id"].as_str().is_none_or(str::is_empty));
    let backup=dir.path().join("workspace.scbackup");store.export_backup(&backup).unwrap();drop(store);
    let mut reopened=Store::open(&path).unwrap();assert_eq!(reopened.request("entities/PostTemplate/all",&[]).unwrap()[0]["name"],"Reusable");
    reopened.request("entities/PostTemplate/update",&[template["id"].clone(),json!({"name":"Changed"})]).unwrap();
    let staged=reopened.inspect_backup(&backup).unwrap();reopened.restore_backup(staged["token"].as_str().unwrap()).unwrap();
    assert_eq!(reopened.request("entities/PostTemplate/all",&[]).unwrap()[0]["name"],"Reusable");
    reopened.request("entities/PostTemplate/delete",&[template["id"].clone()]).unwrap();assert_eq!(reopened.request("entities/Post/all",&[]).unwrap().as_array().unwrap().len(),3);
}

#[test]
fn partial_templates_create_editable_drafts_and_reject_cross_brand_references(){
    let dir=tempfile::tempdir().unwrap();let mut store=Store::open(&dir.path().join("data.sqlite")).unwrap();
    let brand=store.request("entities/Brand/create",&[json!({"name":"Brand"})]).unwrap();let other=store.request("entities/Brand/create",&[json!({"name":"Other"})]).unwrap();
    let pillar=store.request("entities/ContentPillar/create",&[json!({"name":"Pillar","brand_id":other["id"]})]).unwrap();
    assert!(store.request("templates/save",&[json!({"name":"Bad","data":{"brand_id":brand["id"],"pillar_id":pillar["id"]}})]).is_err());
    let template=store.request("templates/save",&[json!({"name":"Idea shell","data":{"brand_id":brand["id"]}})]).unwrap();
    let draft=store.request("templates/createDraft",&[template["id"].clone()]).unwrap()["post"].clone();
    assert_eq!(draft["title"],"Idea shell");assert_eq!(draft["caption"],"");
    assert!(store.request("posts/save",&[json!({"id":draft["id"],"data":{"brand_id":brand["id"],"title":"Empty plan","caption":"","status":"scheduled","scheduled_at":"2030-01-01T00:00:00Z"}})]).is_err());
    store.request("entities/Brand/update",&[brand["id"].clone(),json!({"status":"archived"})]).unwrap();
    assert!(store.request("templates/createDraft",&[template["id"].clone()]).is_err());
}
