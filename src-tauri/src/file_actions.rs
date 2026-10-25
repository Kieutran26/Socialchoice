use crate::store::Store;
use serde_json::{json, Value};

pub fn run(store:&mut Store,action:&str,input:&Value)->Result<Value,String> {
    match action {
        "import"=>{
            store.policy.require(&store.root,"media")?;
            let brand=input["brand_id"].as_str().ok_or("Choose a brand")?;
            if store.get_record("Brand",brand)?["status"]!="active" {return Err("Choose an active brand".into());}
            let Some(paths)=rfd::FileDialog::new().set_title("Import media into Socialchoice").add_filter("Images and MP4",&["jpg","jpeg","png","webp","mp4"]).pick_files() else {return Ok(json!({"cancelled":true,"items":[],"errors":[]}));};
            if paths.len()>10 {return Err("Choose up to 10 files at a time".into());}
            let mut items=Vec::new();let mut errors=Vec::new();
            for path in paths {match store.import_media(&path,brand) {Ok(value)=>items.push(value),Err(error)=>errors.push(format!("{}: {error}",path.file_name().unwrap_or_default().to_string_lossy()))}}
            Ok(json!({"items":items,"errors":errors}))
        },
        "export"=>{
            let Some(path)=rfd::FileDialog::new().set_title("Save Socialchoice backup").add_filter("Socialchoice backup",&["scbackup"]).set_file_name(format!("socialchoice-{}.scbackup",chrono::Local::now().format("%Y%m%d-%H%M%S"))).save_file() else {return Ok(json!({"cancelled":true}));};
            if path.extension().is_none_or(|extension|extension!="scbackup") {return Err("Use the .scbackup extension".into());}
            let parent=path.parent().ok_or("Choose a backup directory")?.canonicalize().map_err(crate::media::io_error)?;
            if parent.starts_with(store.root.canonicalize().map_err(crate::media::io_error)?) {return Err("Save exported backups outside the application's data directory".into());}
            store.export_backup(&path)?;Ok(json!({"path":path.to_string_lossy()}))
        },
        "inspect"=>{
            store.pending=None;
            let Some(path)=rfd::FileDialog::new().set_title("Inspect Socialchoice backup").add_filter("Socialchoice backup",&["scbackup"]).pick_file() else {return Ok(json!({"cancelled":true}));};
            store.inspect_backup(&path)
        },
        "restore"=>store.restore_backup(input["token"].as_str().ok_or("Select a backup first")?),
        "discard"=>{store.pending=None;Ok(json!({"success":true}))},
        _=>Err("Unsupported file action".into())
    }
}
