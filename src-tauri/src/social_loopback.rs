use base64::{Engine,engine::general_purpose::URL_SAFE_NO_PAD};
use sha2::{Digest,Sha256};
use std::{io::{Read,Write},net::TcpListener,sync::atomic::{AtomicBool,Ordering},time::{Duration,Instant}};
use reqwest::Url;
use zeroize::Zeroizing;

pub struct Login {pub listener:TcpListener,pub state:String,pub verifier:Zeroizing<String>,pub redirect:String,pub challenge:String}
impl Login {
    pub fn create()->Result<Self,String>{
        let listener=TcpListener::bind("127.0.0.1:0").map_err(|_|"Cannot open local sign-in callback")?;
        listener.set_nonblocking(true).map_err(|_|"Cannot open local sign-in callback")?;
        let verifier=Zeroizing::new(format!("{}{}",uuid::Uuid::new_v4().simple(),uuid::Uuid::new_v4().simple()));
        let challenge=URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
        let state=format!("{}{}",uuid::Uuid::new_v4().simple(),uuid::Uuid::new_v4().simple());
        let redirect=format!("http://127.0.0.1:{}/socialchoice/oauth/callback",listener.local_addr().map_err(|_|"Cannot open callback")?.port());
        Ok(Self{listener,state,verifier,redirect,challenge})
    }
    pub fn callback(&self,request:&str)->Result<String,String>{
        let mut lines=request.split("\r\n");let first=lines.next().ok_or("Invalid callback")?;
        let parts=first.split(' ').collect::<Vec<_>>();
        if parts.len()!=3||parts[0]!="GET"||parts[2]!="HTTP/1.1"||!parts[1].starts_with("/socialchoice/oauth/callback?") {return Err("Invalid callback".into());}
        let expected=Url::parse(&self.redirect).map_err(|_|"Invalid callback")?;
        let headers=lines.take_while(|line|!line.is_empty()).collect::<Vec<_>>();
        let hosts=headers.iter().filter_map(|line|line.split_once(':').filter(|(key,_)|key.eq_ignore_ascii_case("host")).map(|(_,value)|value.trim())).collect::<Vec<_>>();
        if hosts!=vec![format!("127.0.0.1:{}",expected.port().unwrap()).as_str()] {return Err("Invalid callback host".into());}
        let url=Url::parse(&format!("http://127.0.0.1:{}{}",expected.port().unwrap(),parts[1])).map_err(|_|"Invalid callback")?;
        if url.path()!=expected.path()||url.fragment().is_some(){return Err("Invalid callback".into());}
        let pairs=url.query_pairs().collect::<Vec<_>>();
        if pairs.len()!=2||pairs.iter().filter(|(key,_)|key=="state").count()!=1||pairs.iter().find(|(key,_)|key=="state").is_none_or(|(_,value)|value!=&self.state){return Err("Invalid callback state".into());}
        if pairs.iter().any(|(key,value)|key=="error"&&value=="authorization_denied"){return Err("Sign-in was cancelled by the provider".into());}
        let ticket=pairs.iter().find(|(key,_)|key=="ticket").map(|(_,value)|value.to_string()).ok_or("Invalid callback ticket")?;
        if ticket.len()>17000||ticket.is_empty()||!ticket.bytes().all(|c|c.is_ascii_alphanumeric()||b"-_.".contains(&c)){return Err("Invalid callback ticket".into());}Ok(ticket)
    }
    pub fn wait(&self,cancel:&AtomicBool,timeout:Duration)->Result<String,String>{
        let started=Instant::now();
        while started.elapsed()<timeout {
            if cancel.load(Ordering::Acquire){return Err("Sign-in cancelled".into());}
            match self.listener.accept(){
                Ok((mut stream,peer))=>{
                    if !peer.ip().is_loopback(){continue;}
                    let _=stream.set_read_timeout(Some(Duration::from_secs(2)));let _=stream.set_write_timeout(Some(Duration::from_secs(1)));
                    let mut request=Zeroizing::new(Vec::new());let mut buffer=[0u8;1024];
                    while request.len()<=24000&&!request.windows(4).any(|v|v==b"\r\n\r\n") {match stream.read(&mut buffer){Ok(0)|Err(_)=>break,Ok(n)=>request.extend_from_slice(&buffer[..n])}}
                    let result=if request.len()>24000{Err("Invalid callback".into())}else{std::str::from_utf8(&request).map_err(|_|"Invalid callback".to_owned()).and_then(|text|self.callback(text))};
                    let valid=result.is_ok()||result.as_ref().err().is_some_and(|e|e=="Sign-in was cancelled by the provider");
                    let status=if valid{"200 OK"}else{"400 Bad Request"};
                    let body=if valid{"Return to Socialchoice to finish connecting. You can close this tab."}else{"Invalid callback. Continue sign-in from Socialchoice."};
                    let _=write!(stream,"HTTP/1.1 {status}\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: default-src 'none'\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{body}",body.len());
                    if valid{return result;}
                },
                Err(error) if error.kind()==std::io::ErrorKind::WouldBlock=>std::thread::sleep(Duration::from_millis(50)),
                Err(_)=>return Err("Local callback is unavailable".into())
            }
        }Err("Sign-in timed out. Start again.".into())
    }
}

#[cfg(windows)]
pub fn open_browser(url:&Url)->Result<(),String>{
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    let operation="open\0".encode_utf16().collect::<Vec<_>>();let target=format!("{}\0",url.as_str()).encode_utf16().collect::<Vec<_>>();
    let result=unsafe{ShellExecuteW(std::ptr::null_mut(),operation.as_ptr(),target.as_ptr(),std::ptr::null(),std::ptr::null(),1)};
    if result as isize<=32{return Err("Cannot open your default browser".into());}Ok(())
}
#[cfg(not(windows))]
pub fn open_browser(_:&Url)->Result<(),String>{Err("Desktop sign-in requires Windows".into())}
