use crate::{ai_config::{self,Config},ai_prompt,ai_provider,ai_service,store::Store};
use serde_json::{json,Value};
use std::{io::{Read,Write},net::TcpListener,sync::{Arc,Mutex,atomic::{AtomicBool,Ordering}},time::Duration};

fn config(provider:&str)->Config {Config{provider:provider.into(),model:"test-model".into(),key:"fixture-key-never-a-real-key".into()}}
fn response()->Value {json!({"status":"completed","output":[{"type":"reasoning","summary":[]},{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Nội dung gợi ý"}]}]})}
fn fixture(status:u16,body:String,extra:&str)->(String,std::thread::JoinHandle<String>) {
    let listener=TcpListener::bind("127.0.0.1:0").unwrap();let url=format!("http://{}",listener.local_addr().unwrap());let extra=extra.to_owned();
    let handle=std::thread::spawn(move||{
        let (mut stream,_)=listener.accept().unwrap();stream.set_read_timeout(Some(Duration::from_secs(3))).unwrap();let mut received=Vec::new();let mut chunk=[0;4096];
        loop {
            let count=stream.read(&mut chunk).unwrap();if count==0{break;}received.extend_from_slice(&chunk[..count]);
            if let Some(end)=received.windows(4).position(|part|part==b"\r\n\r\n") {
                let head=String::from_utf8_lossy(&received[..end]).to_lowercase();let length=head.lines().find_map(|line|line.strip_prefix("content-length: ").and_then(|value|value.parse::<usize>().ok())).unwrap_or(0);
                if received.len()>=end+4+length{break;}
            }
        }
        let reply=format!("HTTP/1.1 {status} Fixture\r\nContent-Length: {}\r\nContent-Type: application/json\r\nConnection: close\r\n{extra}\r\n{body}",body.len());let _=stream.write_all(reply.as_bytes());String::from_utf8(received).unwrap()
    });(url,handle)
}

#[test]
fn provider_contracts_use_headers_stateless_requests_and_parse_text_only() {
    for provider in ["openai","gemini"] {
        let config=config(provider);let body=if provider=="openai" {response()}else{json!({"candidates":[{"finishReason":"STOP","content":{"parts":[{"thought":true,"text":"private reasoning"},{"text":"Nội dung gợi ý"}]}}]})};
        let (url,handle)=fixture(200,body.to_string(),"");assert_eq!(ai_provider::send_fixture(&config,"brief fixture",&url).unwrap(),"Nội dung gợi ý");
        let request=handle.join().unwrap();let (headers,body)=request.split_once("\r\n\r\n").unwrap();let headers=headers.to_lowercase();
        assert!(headers.contains(if provider=="openai" {"authorization: bearer fixture-key-never-a-real-key"}else{"x-goog-api-key: fixture-key-never-a-real-key"}));
        assert!(!request.lines().next().unwrap().contains("fixture-key"));let body:Value=serde_json::from_str(body).unwrap();assert_eq!(body["store"],false);assert!(!body.to_string().contains(&config.key));
        assert!(ai_provider::endpoint(&config).starts_with(if provider=="openai" {"https://api.openai.com/"}else{"https://generativelanguage.googleapis.com/"}));
    }
}

#[test]
fn provider_errors_are_redacted_bounded_and_never_follow_redirects() {
    let config=config("openai");
    for status in [301,400,401,403,404,429,500] {
        let (url,handle)=fixture(status,format!("{{\"error\":{{\"message\":\"{} and private caption\"}}}}",config.key),"Location: http://127.0.0.1:1/stolen\r\n");
        let error=ai_provider::send_fixture(&config,"private caption",&url).unwrap_err();assert!(!error.contains(&config.key));assert!(!error.contains("private caption"));handle.join().unwrap();
    }
    for body in ["not-json".to_owned(),json!({"status":"incomplete","output":[]}).to_string(),json!({"status":"completed","output":[]}).to_string(),"x".repeat(ai_provider::MAX_RESPONSE as usize+1)] {
        let (url,handle)=fixture(200,body,"");assert!(ai_provider::send_fixture(&config,"brief",&url).is_err());handle.join().unwrap();
    }
    assert!(ai_provider::parse("gemini",&json!({"promptFeedback":{"blockReason":"SAFETY"}})).is_err());
    assert!(ai_provider::parse("gemini",&json!({"candidates":[{"finishReason":"MAX_TOKENS","content":{"parts":[{"text":"partial"}]}}]})).is_err());
    assert!(ai_provider::send_fixture(&config,"brief","http://127.0.0.1:1").unwrap_err().contains("Cannot reach"));
}

#[cfg(windows)]
#[test]
fn windows_vault_roundtrip_never_exposes_key_and_is_excluded_from_portable_backup() {
    let root=tempfile::tempdir().unwrap();let mut store=Store::open(&root.path().join("data.sqlite")).unwrap();let key="fixture-key-never-a-real-key";
    let saved=ai_config::save(root.path(),&json!({"provider":"openai","model":"test-model","key":key})).unwrap();assert_eq!(saved["configured"],true);assert!(!saved.to_string().contains(key));
    let bytes=std::fs::read(root.path().join("credentials/ai.dpapi")).unwrap();assert!(!bytes.windows(key.len()).any(|part|part==key.as_bytes()));assert_eq!(ai_config::load(root.path()).unwrap().unwrap().key,key);
    ai_config::save(root.path(),&json!({"provider":"openai","model":"another-model","key":""})).unwrap();assert_eq!(ai_config::load(root.path()).unwrap().unwrap().key,key);
    assert!(ai_config::save(root.path(),&json!({"provider":"gemini","model":"test-model","key":""})).is_err());
    let backup=root.path().join("backup.scbackup");store.export_backup(&backup).unwrap();let mut zip=zip::ZipArchive::new(std::fs::File::open(&backup).unwrap()).unwrap();assert_eq!(zip.len(),1);assert_eq!(zip.by_index(0).unwrap().name(),"workspace.json");
    let other=tempfile::tempdir().unwrap();let mut destination=Store::open(&other.path().join("data.sqlite")).unwrap();let review=destination.inspect_backup(&backup).unwrap();destination.restore_backup(review["token"].as_str().unwrap()).unwrap();assert_eq!(ai_config::status(other.path()).unwrap()["configured"],false);
    let review=store.inspect_backup(&backup).unwrap();store.restore_backup(review["token"].as_str().unwrap()).unwrap();assert_eq!(ai_config::load(root.path()).unwrap().unwrap().model,"another-model");
    std::fs::write(root.path().join("credentials/ai.dpapi"),b"damaged fixture").unwrap();assert!(ai_config::load(root.path()).is_err());ai_config::clear(root.path()).unwrap();assert_eq!(ai_config::status(root.path()).unwrap()["configured"],false);
}

#[test]
fn prompt_is_scoped_bounded_and_validation_does_not_change_workspace() {
    let root=tempfile::tempdir().unwrap();let mut store=Store::open(&root.path().join("data.sqlite")).unwrap();let brand=store.request("entities/Brand/create",&[json!({"name":"Selected brand"})]).unwrap();
    let other=store.request("entities/Brand/create",&[json!({"name":"Private other brand"})]).unwrap();let pillar=store.request("entities/ContentPillar/create",&[json!({"brand_id":other["id"],"name":"Private other pillar"})]).unwrap();
    let input=json!({"brand_id":brand["id"],"pillar_id":"","angle_id":"","title":"Title","caption":"Caption","brief":"Brief","action":"draft","language":"vi","confirmed":true});
    let prompt=ai_prompt::build(&store,&input).unwrap();assert!(prompt.contains("Selected brand"));assert!(!prompt.contains("Private other"));
    for (key,value) in [("confirmed",json!(false)),("action",json!("publish")),("caption",json!("x".repeat(20001))),("pillar_id",pillar["id"].clone()),("base_url",json!("https://invalid.example"))] {let mut invalid=input.clone();invalid[key]=value;assert!(ai_prompt::build(&store,&invalid).is_err());}
    assert!(store.request("entities/Post/all",&[]).unwrap().as_array().unwrap().is_empty());
}

#[test]
fn config_and_service_reject_unsafe_inputs_and_busy_operations() {
    let root=tempfile::tempdir().unwrap();let store=Arc::new(Mutex::new(Store::open(&root.path().join("data.sqlite")).unwrap()));
    let runtime=ai_service::Runtime{root:root.path().to_owned(),gate:Mutex::new(()),busy:AtomicBool::new(false)};
    for model in ["", "../model", "model?key=anything", "https://evil.example", "model/name"] {let mut c=config("openai");c.model=model.into();assert!(ai_config::validate(&c).is_err());}
    assert!(ai_service::run(&runtime,&store,"generate",&json!({})).is_err());assert!(!runtime.busy.load(Ordering::Acquire));
    runtime.busy.store(true,Ordering::Release);assert!(ai_service::run(&runtime,&store,"clear",&json!({})).is_err());assert_eq!(ai_service::run(&runtime,&store,"status",&json!({})).unwrap()["busy"],true);
}
