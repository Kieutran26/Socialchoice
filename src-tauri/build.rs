fn main() {
    println!("cargo:rerun-if-env-changed=SOCIALCHOICE_LICENSE_PUBLIC_KEY");
    if let Ok(key)=std::env::var("SOCIALCHOICE_LICENSE_PUBLIC_KEY") {
        assert!(key.len()==64 && key.bytes().all(|byte|byte.is_ascii_hexdigit()),"SOCIALCHOICE_LICENSE_PUBLIC_KEY must be64 hex characters; unset it for a prototype build");
    }
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["workspace_request","workspace_files","workspace_ai","workspace_license"])),
    )
    .expect("Tauri build configuration failed");
}
