use sha2::{Digest,Sha256};

const UNAVAILABLE:&str="Cannot identify this computer reliably. Contact support before buying or reissuing a license. Reading and backup export remain available.";

pub fn valid(id:&str)->bool {id.len()==69 && id.starts_with("SCM1-") && id.as_bytes()[5..].iter().all(|byte|byte.is_ascii_digit() || (b'A'..=b'F').contains(byte))}

pub fn from_firmware(bytes:&[u8])->Result<String,String> {
    if bytes.len()<8 || bytes[1]<2 || (bytes[1]==2 && bytes[2]<1) {return Err(UNAVAILABLE.into());}
    let length=u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;
    let table=bytes.get(8..8usize.checked_add(length).ok_or(UNAVAILABLE)?).ok_or(UNAVAILABLE)?;
    let mut offset=0;let mut uuid=None;
    while offset<table.len() {
        let header=table.get(offset..offset+4).ok_or(UNAVAILABLE)?;let size=header[1] as usize;
        if size<4 {return Err(UNAVAILABLE.into());}
        let record=table.get(offset..offset+size).ok_or(UNAVAILABLE)?;
        let tail=table.get(offset+size..).ok_or(UNAVAILABLE)?;
        let terminator=tail.windows(2).position(|pair|pair==[0,0]).ok_or(UNAVAILABLE)?;
        if header[0]==1 {
            if size<25 || uuid.is_some(){return Err(UNAVAILABLE.into());}
            let value=&record[8..24];
            if value.iter().all(|byte|*byte==0) || value.iter().all(|byte|*byte==255){return Err(UNAVAILABLE.into());}
            uuid=Some(value);
        }
        offset+=size+terminator+2;
        if header[0]==127 {break;}
    }
    let mut hash=Sha256::new();hash.update(b"Socialchoice machine identity v1\0");hash.update(uuid.ok_or(UNAVAILABLE)?);
    Ok(format!("SCM1-{:X}",hash.finalize()))
}

#[cfg(windows)]
pub fn current()->Result<String,String> {
    use windows_sys::Win32::System::SystemInformation::GetSystemFirmwareTable;
    // Native SMBIOS reads only: no registry, subprocess, network or persisted installation ID.
    let provider=u32::from_be_bytes(*b"RSMB");
    let size=unsafe{GetSystemFirmwareTable(provider,0,std::ptr::null_mut(),0)};
    if !(8..=4*1024*1024).contains(&size){return Err(UNAVAILABLE.into());}
    let mut bytes=vec![0u8;size as usize];
    let written=unsafe{GetSystemFirmwareTable(provider,0,bytes.as_mut_ptr().cast(),size)};
    if written!=size{return Err(UNAVAILABLE.into());}from_firmware(&bytes)
}
#[cfg(not(windows))]
pub fn current()->Result<String,String>{Err(UNAVAILABLE.into())}

#[cfg(test)]
mod tests {
    use super::*;
    fn firmware(uuid:[u8;16])->Vec<u8>{let mut bytes=vec![0,3,0,0,27,0,0,0,1,25,0,0,0,0,0,0];bytes.extend(uuid);bytes.extend([0,0,0]);bytes}
    #[test]
    fn identity_uses_only_uuid_and_rejects_missing_or_malformed_firmware(){
        let bytes=firmware([7;16]);let id=from_firmware(&bytes).unwrap();assert!(valid(&id));
        let mut changed=bytes.clone();changed[1]=4;changed[12]=12;assert_eq!(id,from_firmware(&changed).unwrap());
        assert_ne!(id,from_firmware(&firmware([8;16])).unwrap());
        for bad in [vec![],bytes[..20].to_vec(),firmware([0;16]),firmware([255;16])]{assert!(from_firmware(&bad).is_err());}
        for index in [9,33,34] {let mut bad=bytes.clone();bad[index]=1;assert!(from_firmware(&bad).is_err());}
    }
    #[cfg(windows)]
    #[test]
    fn windows_hardware_identity_is_stable_without_workspace_files(){let first=current().unwrap();assert!(valid(&first));assert_eq!(first,current().unwrap());}
}
