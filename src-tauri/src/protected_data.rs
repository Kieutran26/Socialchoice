use zeroize::Zeroizing;

#[cfg(windows)]
pub fn transform(bytes:&[u8],protect:bool)->Result<Zeroizing<Vec<u8>>,String> {
    transform_scoped(bytes,protect,b"Socialchoice Desktop AI v1")
}

#[cfg(windows)]
pub fn transform_scoped(bytes:&[u8],protect:bool,entropy_bytes:&[u8])->Result<Zeroizing<Vec<u8>>,String> {
    use windows_sys::Win32::{Foundation::LocalFree,Security::Cryptography::{CryptProtectData,CryptUnprotectData,CRYPT_INTEGER_BLOB,CRYPTPROTECT_UI_FORBIDDEN}};
    use std::ptr::{null,null_mut};
    if bytes.is_empty() || bytes.len()>65536 {return Err("Invalid protected configuration".into());}
    let input=CRYPT_INTEGER_BLOB{cbData:bytes.len() as u32,pbData:bytes.as_ptr() as *mut u8};
    let entropy=CRYPT_INTEGER_BLOB{cbData:entropy_bytes.len() as u32,pbData:entropy_bytes.as_ptr() as *mut u8};
    let mut output=CRYPT_INTEGER_BLOB{cbData:0,pbData:null_mut()};
    // DPAPI allocates output with LocalAlloc. Copy into a zeroizing buffer and clear before LocalFree.
    unsafe {
        let success=if protect {CryptProtectData(&input,null(),&entropy,null(),null(),CRYPTPROTECT_UI_FORBIDDEN,&mut output)}
            else {CryptUnprotectData(&input,null_mut(),&entropy,null(),null(),CRYPTPROTECT_UI_FORBIDDEN,&mut output)};
        if success==0 {return Err("Windows could not unlock protected settings. Reconnect or re-enter credentials.".into());}
        if output.pbData.is_null() || output.cbData==0 {
            if !output.pbData.is_null(){LocalFree(output.pbData as *mut core::ffi::c_void);}
            return Err("Invalid protected AI configuration".into());
        }
        let slice=std::slice::from_raw_parts_mut(output.pbData,output.cbData as usize);
        let result=Zeroizing::new(slice.to_vec());
        use zeroize::Zeroize;slice.zeroize();LocalFree(output.pbData as *mut core::ffi::c_void);
        Ok(result)
    }
}

#[cfg(not(windows))]
pub fn transform(_: &[u8],_: bool)->Result<Zeroizing<Vec<u8>>,String> {Err("Protected AI settings require Windows".into())}

#[cfg(not(windows))]
pub fn transform_scoped(_: &[u8],_: bool,_:&[u8])->Result<Zeroizing<Vec<u8>>,String> {Err("Protected settings require Windows".into())}
