#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod brand;
mod entities;
mod relations;
mod mutations;
mod store;
mod media;
mod backup;
mod backup_validation;
mod file_actions;
mod managed_paths;
mod protected_data;
mod ai_config;
mod ai_provider;
mod ai_prompt;
mod ai_service;
mod license_signature;
mod license_state;
mod license_service;
mod machine_identity;
mod activation_request;
mod templates;
mod social_types;
mod social_vault;
mod social_loopback;
mod social_http;
mod social_accounts;
mod social_service;
#[cfg(test)]
mod social_tests;
#[cfg(test)]
mod template_tests;
#[cfg(test)]
mod license_tests;
#[cfg(test)]
mod tests;
#[cfg(test)]
mod planning_tests;
#[cfg(test)]
mod media_backup_tests;
#[cfg(test)]
mod ai_tests;

use serde_json::Value;
use std::sync::{Arc, Mutex};
use tauri::Manager;

struct Workspace(Arc<Mutex<store::Store>>);

#[tauri::command]
async fn workspace_files(state: tauri::State<'_, Workspace>, action:String, input:Value)->Result<Value,String> {
    if action.len()>20 || input.to_string().len()>1024 {return Err("Invalid file request".into());}
    let workspace=state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut store=workspace.lock().map_err(|_|"Workspace is unavailable")?;
        file_actions::run(&mut store,&action,&input)
    }).await.map_err(|_|"File operation failed".to_owned())?
}

#[tauri::command]
async fn workspace_request(
    state: tauri::State<'_, Workspace>,
    path: String,
    args: Vec<Value>,
) -> Result<Value, String> {
    let workspace=state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        workspace.lock().map_err(|_| "Workspace is unavailable".to_string())?.request(&path, &args)
    }).await.map_err(|_|"Workspace operation failed".to_owned())?
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Distinct identifier keeps this prototype away from the web database and future releases.
            let directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            let workspace = store::Store::open(&directory.join("prototype.sqlite"))
                .map_err(std::io::Error::other)?;
            app.manage(Workspace(Arc::new(Mutex::new(workspace))));
            app.manage(social_service::State(Arc::new(social_service::Runtime::new())));
            app.manage(ai_service::State(Arc::new(ai_service::Runtime{root:directory,gate:Mutex::new(()),busy:std::sync::atomic::AtomicBool::new(false)})));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![workspace_request,workspace_files,ai_service::workspace_ai,license_service::workspace_license,social_service::workspace_social])
        .run(tauri::generate_context!())
        .expect("Unable to open Socialchoice Desktop Prototype");
}
