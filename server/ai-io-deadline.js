// Some RPC/stream implementations do not reject pending I/O when their signal aborts.
// Bound our wait as well; late responses are disposed, never retried or reused.
export function awaitAiIo(work, signal, disposeLate) {
    return new Promise((resolve,reject)=>{
        let settled=false;
        const finish=()=>{settled=true;signal.removeEventListener('abort',abort);};
        const abort=()=>{if(!settled){finish();reject(signal.reason||new DOMException('AI deadline expired','TimeoutError'));}};
        signal.addEventListener('abort',abort,{once:true});
        Promise.resolve(work).then(value=>{
            if(settled){try{Promise.resolve(disposeLate?.(value)).catch(()=>{});}catch{/* Disposal must not expose or mask provider failures. */}return;}
            finish();resolve(value);
        },error=>{if(!settled){finish();reject(error);}});
        if(signal.aborted)abort();
    });
}
