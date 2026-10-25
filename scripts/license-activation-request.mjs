import { openSync,readSync,closeSync,fstatSync } from 'node:fs';

export function readActivationRequest(path){
    const file=openSync(path,'r');let bytes;
    try {
        if(!fstatSync(file).isFile())throw new Error('Choose an activation request file.');
        const buffer=Buffer.alloc(4097);let length=0,count;
        while(length<buffer.length&&(count=readSync(file,buffer,length,buffer.length-length,null))>0)length+=count;
        if(length>4096)throw new Error('Activation request is too large.');bytes=buffer.subarray(0,length);
    } finally {closeSync(file);}
    let request;try{request=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/u,''));}catch{throw new Error('Invalid activation request JSON.');}
    const fields=['format','version','product','app_version','machine_id'];
    if(!request||Array.isArray(request)||Object.keys(request).length!==5||fields.some(field=>!Object.hasOwn(request,field))||request.format!=='socialchoice-activation-request'||request.version!==1||request.product!=='socialchoice-desktop'||typeof request.app_version!=='string'||!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(request.app_version))throw new Error('Unsupported activation request fields, version or product.');
    validateMachineId(request.machine_id);return request;
}
export function validateMachineId(value){if(typeof value!=='string'||!/^SCM1-[0-9A-F]{64}$/.test(value))throw new Error('Every license requires the machine ID copied from the app.');return value;}
export function resolveMachineId(options){
    const direct=options.machineId!=null,file=options.requestPath!=null;
    if(direct===file)throw new Error('Choose exactly one machine ID or activation request file.');
    return direct?validateMachineId(options.machineId):readActivationRequest(options.requestPath).machine_id;
}
