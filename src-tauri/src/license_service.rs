use crate::{license_signature::MAX_TOKEN,media::read_bounded,Workspace};
use serde_json::{json,Value};

#[tauri::command]
pub async fn workspace_license(state:tauri::State<'_,Workspace>,action:String,input:Value)->Result<Value,String> {
    if action.len()>20 || input.to_string().len()>MAX_TOKEN+1024{return Err("License request is too large".into());}
    let workspace=state.0.clone();
    tauri::async_runtime::spawn_blocking(move||{
        let (root,policy)={let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;(store.root.clone(),store.policy.clone())};
        match action.as_str(){
            "status"=>policy.status(&root),
            "activate"=>policy.activate(&root,input["token"].as_str().ok_or("Paste a license token")?),
            "clear"=>policy.clear(&root),
            "export-request"=>{
                let request=policy.activation_request()?;
                let Some(path)=rfd::FileDialog::new().set_title("Save Socialchoice activation request").add_filter("Socialchoice activation request",&["scactivation"]).set_file_name("socialchoice.scactivation").save_file() else{return Ok(json!({"cancelled":true}));};
                crate::activation_request::save(&root,&path,&request)?;Ok(json!({"exported":true}))
            },
            "import"=>{
                let Some(path)=rfd::FileDialog::new().set_title("Activate Socialchoice license").add_filter("Socialchoice license",&["sclicense"]).pick_file() else{return Ok(json!({"cancelled":true}));};
                let bytes=read_bounded(&path,MAX_TOKEN as u64)?;policy.activate(&root,std::str::from_utf8(&bytes).map_err(|_|"Invalid license file")?)
            },
            _=>Err("Unsupported license operation".into())
        }
    }).await.map_err(|_|"License operation failed".to_owned())?
}
