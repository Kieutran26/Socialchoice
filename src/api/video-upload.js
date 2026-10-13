async function call(path,args) {
    const response=await fetch('/api/media/videos/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Socialchoice-Client':'local-ui'},body:JSON.stringify({args})});
    const value=await response.json();if(!response.ok)throw new Error(value.message||'Video upload failed');return value;
}
function chunk(id,offset,blob,progress) {
    return new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();xhr.open('POST',`/api/media/videos/${id}/chunk`);xhr.setRequestHeader('Content-Type','application/octet-stream');xhr.setRequestHeader('X-Socialchoice-Client','local-ui');xhr.setRequestHeader('X-Upload-Offset',String(offset));
        xhr.upload.onprogress=event=>{if(event.lengthComputable)progress(event.loaded);};
        xhr.onload=()=>{try{const result=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300)resolve(result);else reject(new Error(result.message||'Video upload failed'));}catch{reject(new Error('Video upload failed'));}};
        xhr.onerror=()=>reject(new Error('Video upload failed'));xhr.timeout=60000;xhr.ontimeout=()=>reject(new Error('Video upload timed out'));xhr.send(blob);
    });
}
export async function uploadVideo(file,brandId,progress) {
    const session=await call('start',[{brandId,name:file.name,size:file.size,type:'video/mp4'}]);
    let offset=0;
    try {
        while(offset<file.size) {
            const blob=file.slice(offset,offset+1024*1024);
            let result;
            try{result=await chunk(session.uploadId,offset,blob,loaded=>progress(Math.round((offset+loaded)/file.size*100)));}
            catch(error){const stored=await call(session.uploadId+'/status',[]);if(stored.received===offset+blob.size)result=stored;else if(stored.received===offset)result=await chunk(session.uploadId,offset,blob,()=>{});else throw error;}
            if(result.received!==offset+blob.size)throw new Error('Video upload offset mismatch');offset=result.received;
        }
        try{return await call(session.uploadId+'/complete',[]);}catch(error){const status=await call(session.uploadId+'/status',[]);if(status.asset)return status.asset;throw error;}
    } catch(error) {try{await call(session.uploadId+'/cancel',[]);}catch{/* Complete might already have committed; preserve the asset. */}throw error;}
}
