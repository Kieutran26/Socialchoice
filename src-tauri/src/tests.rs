use crate::store::Store;
use serde_json::json;

#[test]
fn brand_survives_close_reopen_and_can_be_updated_and_deleted() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("test.sqlite");
    let id = {
        let mut store = Store::open(&path).unwrap();
        let value = store.request("entities/Brand/create", &[json!({"name":"Thương hiệu thử"})]).unwrap();
        value["id"].as_str().unwrap().to_owned()
    };
    let mut reopened = Store::open(&path).unwrap();
    let brands = reopened.request("entities/Brand/all", &[]).unwrap();
    assert_eq!(brands[0]["name"], "Thương hiệu thử");
    assert_eq!(brands[0]["id"], id);
    let changed = reopened.request("entities/Brand/update", &[json!(id), json!({"status":"archived"})]).unwrap();
    assert_eq!(changed["status"], "archived");
    assert_eq!(changed["created_date"], brands[0]["created_date"]);
    reopened.request("entities/Brand/delete", &[json!(id)]).unwrap();
    assert_eq!(reopened.request("entities/Brand/all", &[]).unwrap(), json!([]));
}

#[test]
fn rejects_invalid_and_protected_fields_without_writing() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(&directory.path().join("invalid.sqlite")).unwrap();
    for input in [json!({"name":" "}), json!({"name":"Brand","id":"forged"}),
        json!({"name":"Brand","color":"red"}), json!({"name":"Brand","timezone":"unknown"}),
        json!({"name":"Brand","is_demo":true}), json!({"name":"Brand","status":"published"})] {
        assert!(store.request("entities/Brand/create", &[input]).is_err());
    }
    assert_eq!(store.request("entities/Brand/all", &[]).unwrap(), json!([]));
    assert!(store.request("entities/Post/create", &[json!({})]).is_err());
    assert!(store.request("entities/OAuthCredential/all", &[]).is_err());
    assert!(store.request("publishing/publish", &[json!("id")]).is_err());
}

#[test]
fn refuses_future_database_versions() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("future.sqlite");
    rusqlite::Connection::open(&path).unwrap().execute_batch("PRAGMA user_version=99").unwrap();
    assert!(Store::open(&path).is_err());
}
