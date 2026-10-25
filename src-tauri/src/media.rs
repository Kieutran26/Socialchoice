use crate::store::{database_error, Store};
use chrono::Utc;
use image::ImageFormat;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, io::{Cursor, Read, Write}, path::{Path, PathBuf}};
use uuid::Uuid;

pub const MAX_FILE: u64 = 100_000_000;
pub fn io_error(_: impl std::fmt::Display) -> String { "Cannot read or write workspace files. Check disk space and permissions.".into() }
pub fn hash(bytes: &[u8]) -> String { format!("{:x}", Sha256::digest(bytes)) }
pub fn read_bounded(path: &Path, limit: u64) -> Result<Vec<u8>,String> {
    let file=fs::File::open(path).map_err(io_error)?;
    if !file.metadata().map_err(io_error)?.is_file() { return Err("Choose a regular media file".into()); }
    let mut bytes=Vec::new(); file.take(limit+1).read_to_end(&mut bytes).map_err(io_error)?;
    if bytes.len() as u64>limit { return Err("File exceeds the supported size limit".into()); } Ok(bytes)
}

pub fn inspect(bytes: &[u8]) -> Result<Value,String> {
    if bytes.is_empty() || bytes.len() as u64>MAX_FILE { return Err("Invalid media size".into()); }
    if let Ok(format)=image::guess_format(bytes) {
        let (extension,mime)=match format { ImageFormat::Jpeg=>("jpg","image/jpeg"),ImageFormat::Png=>("png","image/png"),ImageFormat::WebP=>("webp","image/webp"),_=>return Err("Choose JPEG, PNG or still WebP".into()) };
        if bytes.len()>3*1024*1024 { return Err("Choose images up to 3 MiB each".into()); }
        if format==ImageFormat::WebP && image::codecs::webp::WebPDecoder::new(Cursor::new(bytes)).map_err(|_|"Invalid WebP")?.has_animation() { return Err("Animated WebP is not supported".into()); }
        let reader=||image::ImageReader::with_format(Cursor::new(bytes),format);
        let (width,height)=reader().into_dimensions().map_err(|_|"Choose a valid image")?;
        if width==0 || height==0 || u64::from(width)*u64::from(height)>40_000_000 { return Err("Choose an image under 40 megapixels".into()); }
        reader().decode().map_err(|_|"Choose a valid image")?;
        return Ok(json!({"file_type":"image","mime_type":mime,"extension":extension,"width":width,"height":height}));
    }
    // Inspect the container and AVC track metadata, rather than trusting a filename or MIME supplied by the UI.
    let mp4=mp4::Mp4Reader::read_header(Cursor::new(bytes),bytes.len() as u64).map_err(|_|"Choose a valid MP4/H.264 video")?;
    let videos=mp4.tracks().values().filter(|track| track.track_type().ok()==Some(mp4::TrackType::Video)).collect::<Vec<_>>();
    if videos.len()!=1 { return Err("Choose an MP4 with one H.264 video track".into()); }
    let track=videos[0];
    if track.media_type().ok()!=Some(mp4::MediaType::H264) || track.sample_count()==0 || track.width()==0 || track.height()==0 || track.duration().is_zero() { return Err("Choose a valid MP4/H.264 video".into()); }
    Ok(json!({"file_type":"video","mime_type":"video/mp4","extension":"mp4","width":track.width(),"height":track.height(),"duration_seconds":track.duration().as_secs_f64()}))
}

pub fn filename(record:&Value)->Result<&str,String> {
    let name=record["storage_id"].as_str().ok_or("Invalid managed media ID")?;
    let (digest,extension)=name.split_once('.').ok_or("Invalid managed media ID")?;
    if digest.len()!=64 || !digest.bytes().all(|c|c.is_ascii_hexdigit()&&!c.is_ascii_uppercase()) || !["jpg","png","webp","mp4"].contains(&extension) || record["sha256"]!=digest { return Err("Invalid managed media ID".into()); }
    Ok(name)
}

impl Store {
    pub(super) fn media_path(&self, record:&Value)->Result<PathBuf,String> {
        let directory=crate::managed_paths::directory(&self.root,"media")?;
        let path=directory.join(filename(record)?);
        if path.exists() {
            crate::managed_paths::reject_link(&path)?;
            let canonical=path.canonicalize().map_err(io_error)?;
            if canonical.parent()!=Some(self.root.join("media").canonicalize().map_err(io_error)?.as_path()) { return Err("Media path is outside workspace".into()); }
        } Ok(path)
    }
    pub(super) fn ensure_media(&self, record:&Value, bytes:&[u8])->Result<(),String> {
        let path=self.media_path(record)?;
        if path.exists() {
            if hash(&read_bounded(&path,MAX_FILE)?)!=record["sha256"].as_str().ok_or("Invalid media hash")? { return Err("Existing media is damaged; restore to a clean workspace".into()); }
            return Ok(());
        }
        let mut temp=tempfile::NamedTempFile::new_in(self.root.join("media")).map_err(io_error)?;
        temp.write_all(bytes).map_err(io_error)?; temp.as_file().sync_all().map_err(io_error)?;
        temp.persist_noclobber(path).map_err(io_error)?; Ok(())
    }
    pub fn import_media(&mut self,path:&Path,brand_id:&str)->Result<Value,String> {
        self.policy.require(&self.root,"media")?;
        let brand=self.get_record("Brand",brand_id)?;
        if brand["status"]!="active" { return Err("Choose an active brand".into()); }
        let bytes=read_bounded(path,MAX_FILE)?; let metadata=inspect(&bytes)?; let digest=hash(&bytes);
        let name=path.file_name().and_then(|n|n.to_str()).ok_or("Invalid filename")?;
        if name.chars().count()>240 { return Err("Filename is too long".into()); }
        let storage_id=format!("{}.{}",digest,metadata["extension"].as_str().unwrap());
        let mut value=json!({"id":Uuid::new_v4().to_string(),"brand_id":brand_id,"name":name,"filename":name,"file_url":"","storage_id":storage_id,"sha256":digest,"size_bytes":bytes.len(),"is_demo":false,"created_date":Utc::now().to_rfc3339(),"updated_date":Utc::now().to_rfc3339()});
        for key in ["file_type","mime_type","width","height","duration_seconds"] { if let Some(field)=metadata.get(key) {value[key]=field.clone();} }
        self.ensure_media(&value,&bytes)?;
        self.db.execute("INSERT INTO records VALUES ('MediaAsset',?,?)",rusqlite::params![value["id"].as_str(),value.to_string()]).map_err(database_error)?;
        Ok(value)
    }
    pub(super) fn delete_media(&self,id:&str)->Result<Value,String> {
        self.get_record("MediaAsset",id)?;
        let count:i64=self.db.query_row("SELECT COUNT(*) FROM records r WHERE r.entity IN ('Post','PostTemplate') AND (EXISTS(SELECT 1 FROM json_each(r.data,'$.media_ids') m WHERE m.value=?1) OR EXISTS(SELECT 1 FROM json_each(r.data,'$.platform_media_ids') p, json_each(p.value) m WHERE m.value=?1))",[id],|row|row.get(0)).map_err(database_error)?;
        if count>0 { return Err("This file is still in use. Detach it from posts first.".into()); }
        self.db.execute("DELETE FROM records WHERE entity='MediaAsset' AND id=?",[id]).map_err(database_error)?;
        // Immutable bytes are retained for recovery; current backups include only library records and their files.
        Ok(json!({"success":true}))
    }
}
