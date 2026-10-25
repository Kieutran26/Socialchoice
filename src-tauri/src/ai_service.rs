use crate::{ai_config,ai_prompt,ai_provider,Workspace};
use serde_json::{json,Value};
use std::{path::PathBuf,sync::{Arc,Mutex,atomic::{AtomicBool,Ordering}}};

pub struct Runtime {pub root:PathBuf,pub gate:Mutex<()>,pub busy:AtomicBool}
pub struct State(pub Arc<Runtime>);
struct Running<'a>(&'a AtomicBool);
impl Drop for Running<'_> {fn drop(&mut self){self.0.store(false,Ordering::Release);}}

pub fn run(runtime:&Runtime,workspace:&Arc<Mutex<crate::store::Store>>,action:&str,input:&Value)->Result<Value,String> {
    let gate=runtime.gate.lock().map_err(|_|"AI settings are unavailable")?;
    if action=="status" {let mut value=ai_config::status(&runtime.root)?;value["busy"]=json!(runtime.busy.load(Ordering::Acquire));return Ok(value);}
    if runtime.busy.load(Ordering::Acquire){return Err("An AI request is already running. Wait for it to finish.".into());}
    match action {
        "save"=>return ai_config::save(&runtime.root,input),
        "clear"=>return ai_config::clear(&runtime.root),
        "generate"|"test"=>{},
        _=>return Err("Unsupported AI operation".into())
    }
    {let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;store.policy.require(&store.root,"ai")?;}
    runtime.busy.store(true,Ordering::Release);let _running=Running(&runtime.busy);
    let config=ai_config::load(&runtime.root)?.ok_or("Configure your AI API key in Settings first")?;
    let prompt=if action=="test" {"Reply with the word OK.".to_owned()}else{
        let store=workspace.lock().map_err(|_|"Workspace is unavailable")?;ai_prompt::build(&store,input)?
    };
    // Release both settings and workspace locks before the bounded external request.
    drop(gate);
    let text=ai_provider::generate(&config,&prompt)?;
    if action=="test" {return Ok(json!({"verified":true,"provider":config.provider,"model":config.model}));}
    Ok(json!({"text":text,"provider":config.provider,"model":config.model}))
}

#[tauri::command]
pub async fn workspace_ai(state:tauri::State<'_,State>,workspace:tauri::State<'_,Workspace>,action:String,input:Value)->Result<Value,String> {
    if action.len()>20 || input.to_string().len()>256*1024 {return Err("AI request is too large".into());}
    let runtime=state.0.clone();let workspace=workspace.0.clone();
    tauri::async_runtime::spawn_blocking(move||run(&runtime,&workspace,&action,&input)).await.map_err(|_|"AI operation failed".to_owned())?
}
