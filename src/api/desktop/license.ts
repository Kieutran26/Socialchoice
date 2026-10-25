import { invokeNative } from './runtime.ts';
export async function licenseRequest(action: string, input: Record<string, unknown> = {}): Promise<any> {
    try {return await invokeNative('workspace_license',{action,input});}
    catch(error){throw error instanceof Error?error:new Error(String(error));}
}
