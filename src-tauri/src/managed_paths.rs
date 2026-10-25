use std::{fs, path::{Path,PathBuf}};
use crate::media::io_error;

pub fn reject_link(path:&Path)->Result<(),String> {
    let metadata=fs::symlink_metadata(path).map_err(io_error)?;
    if metadata.file_type().is_symlink() {return Err("Managed workspace paths cannot be symbolic links".into());}
    #[cfg(windows)] {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes()&0x400!=0 {return Err("Managed workspace paths cannot be reparse points".into());}
    }
    Ok(())
}

pub fn directory(root:&Path,name:&str)->Result<PathBuf,String> {
    if !["media","backups","credentials","licensing"].contains(&name) {return Err("Invalid managed directory".into());}
    let canonical=root.canonicalize().map_err(io_error)?;let path=root.join(name);
    if fs::symlink_metadata(&path).is_ok() {reject_link(&path)?;} else {fs::create_dir(&path).map_err(io_error)?;}
    reject_link(&path)?;
    let resolved=path.canonicalize().map_err(io_error)?;
    if !resolved.is_dir() || resolved.parent()!=Some(canonical.as_path()) {return Err("Managed directory is outside the workspace".into());}
    Ok(path)
}
