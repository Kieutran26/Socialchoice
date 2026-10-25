use std::{io::Write,path::Path};
use serde_json::{json,Value};
use crate::{machine_identity,media::io_error};

pub fn create(machine_id:&str)->Result<Value,String>{
    if !machine_identity::valid(machine_id){return Err("A valid machine ID is required to export an activation request".into());}
    Ok(json!({"format":"socialchoice-activation-request","version":1,"product":"socialchoice-desktop","app_version":env!("CARGO_PKG_VERSION"),"machine_id":machine_id}))
}
pub fn save(root:&Path,target:&Path,request:&Value)->Result<(),String>{
    if target.extension().is_none_or(|extension|extension!="scactivation"){return Err("Use the .scactivation extension".into());}
    let parent=target.parent().ok_or("Choose an activation request directory")?.canonicalize().map_err(io_error)?;
    if parent.starts_with(root.canonicalize().map_err(io_error)?){return Err("Save activation requests outside the application's data directory".into());}
    if target.symlink_metadata().is_ok(){crate::managed_paths::reject_link(target)?;}
    let mut file=tempfile::NamedTempFile::new_in(parent).map_err(io_error)?;
    file.write_all(&serde_json::to_vec_pretty(request).map_err(io_error)?).map_err(io_error)?;
    file.as_file().sync_all().map_err(io_error)?;file.persist(target).map_err(io_error)?;Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn request_is_minimal_and_cannot_overwrite_workspace_files(){
        let workspace=tempfile::tempdir().unwrap();let output=tempfile::tempdir().unwrap();
        let request=create(&format!("SCM1-{}","A".repeat(64))).unwrap();
        assert_eq!(request.as_object().unwrap().len(),5);assert!(create("invalid").is_err());
        let file=output.path().join("request.scactivation");save(workspace.path(),&file,&request).unwrap();
        assert_eq!(serde_json::from_slice::<Value>(&std::fs::read(file).unwrap()).unwrap(),request);
        assert!(save(workspace.path(),&workspace.path().join("bad.scactivation"),&request).is_err());
        let database=output.path().join("prototype.sqlite");std::fs::write(&database,b"unchanged").unwrap();
        assert!(save(workspace.path(),&database,&request).is_err());assert_eq!(std::fs::read(database).unwrap(),b"unchanged");
    }
}
