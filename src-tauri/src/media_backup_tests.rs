use crate::{media, store::Store};
use serde_json::{json, Value};
use std::{fs, io::Write, path::Path};

fn brand(store:&mut Store,name:&str)->Value {store.request("entities/Brand/create",&[json!({"name":name})]).unwrap()}
fn png(path:&Path) {image::RgbaImage::from_pixel(4,3,image::Rgba([121,217,75,255])).save(path).unwrap();}
fn fixture(store:&mut Store,root:&Path)->(Value,Value,Value) {
    let brand=brand(store,"Local brand");let source=root.join("ảnh gốc.png");png(&source);
    let asset=store.import_media(&source,brand["id"].as_str().unwrap()).unwrap();fs::remove_file(source).unwrap();
    let post=store.request("posts/save",&[json!({"data":{"brand_id":brand["id"],"title":"Offline media","caption":"Nội dung và ảnh","media_ids":[asset["id"]],"status":"scheduled","scheduled_at":"2026-12-01T01:45:00Z","timezone":"Asia/Tokyo"}})]).unwrap();
    (brand,asset,post)
}
fn archive(path:&Path,manifest:&Value,extras:Vec<(String,Vec<u8>)>) {
    let mut zip=zip::ZipWriter::new(fs::File::create(path).unwrap());let options=zip::write::SimpleFileOptions::default();
    zip.start_file("workspace.json",options).unwrap();zip.write_all(manifest.to_string().as_bytes()).unwrap();
    for (name,bytes) in extras {zip.start_file(name,options).unwrap();zip.write_all(&bytes).unwrap();}zip.finish().unwrap();
}

#[test]
fn imported_media_survives_source_removal_restart_and_reference_guards() {
    let root=tempfile::tempdir().unwrap();let path=root.path().join("data.sqlite");let mut store=Store::open(&path).unwrap();
    let (brand,asset,post)=fixture(&mut store,root.path());let managed=store.media_path(&asset).unwrap();assert!(managed.is_file());
    assert!(store.request("entities/MediaAsset/create",&[asset.clone()]).is_err());
    assert!(store.request("entities/MediaAsset/delete",&[asset["id"].clone()]).is_err());
    let other=brand_fn(&mut store);
    assert!(store.request("entities/Post/create",&[json!({"brand_id":other["id"],"title":"Wrong","caption":"Wrong","media_ids":[asset["id"]]})]).is_err());
    assert!(store.request("entities/Post/update",&[post["id"].clone(),json!({"media_ids":[asset["id"],asset["id"]]})]).is_err());
    drop(store);let mut reopened=Store::open(&path).unwrap();
    assert_eq!(reopened.request("entities/Post/all",&[]).unwrap()[0]["media_ids"],json!([asset["id"]]));
    assert!(reopened.request("entities/Brand/delete",&[brand["id"].clone()]).is_err());
    reopened.request("entities/Post/update",&[post["id"].clone(),json!({"media_ids":[]})]).unwrap();
    reopened.request("entities/MediaAsset/delete",&[asset["id"].clone()]).unwrap();assert!(managed.exists());
}
fn brand_fn(store:&mut Store)->Value {brand(store,"Other")}

#[test]
fn portable_backup_restores_media_plans_and_keeps_recovery_snapshot() {
    let source=tempfile::tempdir().unwrap();let mut store=Store::open(&source.path().join("data.sqlite")).unwrap();
    let (_,asset,post)=fixture(&mut store,source.path());let backup=source.path().join("workspace.scbackup");store.export_backup(&backup).unwrap();
    let destination=tempfile::tempdir().unwrap();let target=destination.path().join("data.sqlite");let mut restored=Store::open(&target).unwrap();
    let original=brand(&mut restored,"Before restore");let summary=restored.inspect_backup(&backup).unwrap();assert_eq!(summary["counts"]["MediaAsset"],1);
    let result=restored.restore_backup(summary["token"].as_str().unwrap()).unwrap();
    let recovery=Path::new(result["recovery_path"].as_str().unwrap());assert!(recovery.is_file());
    assert_eq!(restored.request("entities/Post/all",&[]).unwrap()[0],post);
    assert_eq!(media::hash(&fs::read(restored.media_path(&asset).unwrap()).unwrap()),asset["sha256"].as_str().unwrap());
    drop(restored);let mut reopened=Store::open(&target).unwrap();assert_eq!(reopened.request("entities/Post/all",&[]).unwrap()[0]["media_ids"],json!([asset["id"]]));
    let review=reopened.inspect_backup(recovery).unwrap();reopened.restore_backup(review["token"].as_str().unwrap()).unwrap();
    assert_eq!(reopened.request("entities/Brand/all",&[]).unwrap()[0],original);assert!(reopened.request("entities/Post/all",&[]).unwrap().as_array().unwrap().is_empty());
}

#[test]
fn malformed_future_traversal_missing_and_forged_backups_do_not_change_workspace() {
    let root=tempfile::tempdir().unwrap();let mut store=Store::open(&root.path().join("data.sqlite")).unwrap();let before=brand(&mut store,"Keep me");
    let path=root.path().join("bad.scbackup");let base=json!({"format":"socialchoice-workspace","version":1,"records":[]});
    for (manifest,extra) in [
        (json!({"format":"socialchoice-workspace","version":999,"records":[]}),vec![]),
        (base.clone(),vec![("../escape.txt".into(),vec![1])]),
        (json!({"format":"socialchoice-workspace","version":1,"records":[{"entity":"PublishJob","data":before}]}),vec![]),
        (json!({"format":"socialchoice-workspace","version":1,"records":[{"entity":"Brand","data":before},{"entity":"Brand","data":before}]}),vec![]),
    ] {archive(&path,&manifest,extra);assert!(store.inspect_backup(&path).is_err());assert!(store.pending.is_none());assert_eq!(store.request("entities/Brand/all",&[]).unwrap()[0],before);}
    let (_,asset,_)=fixture(&mut store,root.path());let good=root.path().join("good.scbackup");store.export_backup(&good).unwrap();
    let mut zip=zip::ZipArchive::new(fs::File::open(good).unwrap()).unwrap();let manifest:Value=serde_json::from_reader(zip.by_name("workspace.json").unwrap()).unwrap();
    archive(&path,&manifest,vec![]);assert!(store.inspect_backup(&path).is_err());
    archive(&path,&manifest,vec![(format!("media/{}",asset["storage_id"].as_str().unwrap()),vec![0,1,2])]);assert!(store.inspect_backup(&path).is_err());
    for field in ["name","filename"] {
        let mut invalid=manifest.clone();let row=invalid["records"].as_array_mut().unwrap().iter_mut().find(|row|row["entity"]=="MediaAsset").unwrap();row["data"].as_object_mut().unwrap().remove(field);
        archive(&path,&invalid,vec![(format!("media/{}",asset["storage_id"].as_str().unwrap()),fs::read(store.media_path(&asset).unwrap()).unwrap())]);assert!(store.inspect_backup(&path).is_err(),"Missing {field} must be rejected");
    }
    assert_eq!(store.get_record("Brand",before["id"].as_str().unwrap()).unwrap(),before);
    assert!(!root.path().join("escape.txt").exists());
}

#[test]
fn media_content_is_validated_and_video_cannot_mix_with_images() {
    let root=tempfile::tempdir().unwrap();let mut store=Store::open(&root.path().join("data.sqlite")).unwrap();let brand=brand(&mut store,"Video brand");
    let video=Path::new(env!("CARGO_MANIFEST_DIR")).join("../server/fixtures/socialchoice-test-video.mp4");
    let asset=store.import_media(&video,brand["id"].as_str().unwrap()).unwrap();assert_eq!(asset["file_type"],"video");assert!(asset["duration_seconds"].as_f64().unwrap()>0.0);
    let image=root.path().join("picture.png");png(&image);let photo=store.import_media(&image,brand["id"].as_str().unwrap()).unwrap();
    assert!(store.request("entities/Post/create",&[json!({"brand_id":brand["id"],"title":"Mixed","caption":"No","media_ids":[asset["id"],photo["id"]]})]).is_err());
    for bytes in [vec![],b"not a video".to_vec(),b"\0\0\0\x18ftypisom".to_vec()] {assert!(media::inspect(&bytes).is_err());}
    fs::write(&image,b"not an image").unwrap();assert!(store.import_media(&image,brand["id"].as_str().unwrap()).is_err());
    let oversized=root.path().join("large.mp4");fs::File::create(&oversized).unwrap().set_len(media::MAX_FILE+1).unwrap();assert!(store.import_media(&oversized,brand["id"].as_str().unwrap()).is_err());
}

#[test]
fn platform_references_and_failed_restore_preserve_current_records() {
    let root=tempfile::tempdir().unwrap();let mut store=Store::open(&root.path().join("data.sqlite")).unwrap();
    let (_,asset,post)=fixture(&mut store,root.path());
    store.request("entities/Post/update",&[post["id"].clone(),json!({"media_ids":[]})]).unwrap();
    let legacy=json!({"id":"legacy-reference","media_ids":[],"platform_media_ids":{"facebook":[asset["id"]]}});
    store.db.execute("INSERT INTO records VALUES ('PostTemplate','legacy-reference',?)",[legacy.to_string()]).unwrap();
    assert!(store.request("entities/MediaAsset/delete",&[asset["id"].clone()]).is_err());
    store.db.execute("DELETE FROM records WHERE entity='PostTemplate'",[]).unwrap();
    let backup=root.path().join("safe.scbackup");store.export_backup(&backup).unwrap();let review=store.inspect_backup(&backup).unwrap();
    let before=store.request("entities/Post/all",&[]).unwrap();
    store.db.execute_batch("CREATE TRIGGER prevent_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT,'test write failure'); END;").unwrap();
    assert!(store.restore_backup(review["token"].as_str().unwrap()).is_err());assert_eq!(store.request("entities/Post/all",&[]).unwrap(),before);
    assert_eq!(fs::read_dir(root.path().join("backups")).unwrap().count(),1);
}

#[cfg(windows)]
#[test]
fn windows_junctions_cannot_redirect_managed_storage_or_recovery() {
    let root=tempfile::tempdir().unwrap();let outside=tempfile::tempdir().unwrap();let target=root.path().join("media");
    let status=std::process::Command::new("cmd").args(["/d","/c","mklink","/J"]).arg(&target).arg(outside.path()).output().unwrap();assert!(status.status.success());
    assert!(Store::open(&root.path().join("data.sqlite")).is_err());assert!(fs::read_dir(outside.path()).unwrap().next().is_none());
    fs::remove_dir(&target).unwrap();let mut store=Store::open(&root.path().join("data.sqlite")).unwrap();brand(&mut store,"Keep");
    let backup=root.path().join("safe.scbackup");store.export_backup(&backup).unwrap();let review=store.inspect_backup(&backup).unwrap();
    let recovery=root.path().join("backups");let status=std::process::Command::new("cmd").args(["/d","/c","mklink","/J"]).arg(&recovery).arg(outside.path()).output().unwrap();assert!(status.status.success());
    assert!(store.restore_backup(review["token"].as_str().unwrap()).is_err());assert!(fs::read_dir(outside.path()).unwrap().next().is_none());assert_eq!(store.request("entities/Brand/all",&[]).unwrap().as_array().unwrap().len(),1);
    fs::remove_dir(recovery).unwrap();
}
