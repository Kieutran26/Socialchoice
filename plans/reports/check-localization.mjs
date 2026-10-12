import ts from 'typescript';
import { readFileSync,readdirSync,statSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { messages } from '../../src/lib/i18n-core.js';
const files=[];
function walk(path) { for(const item of readdirSync(path)){const name=join(path,item);if(statSync(name).isDirectory())walk(name);else if(/\.(jsx|js)$/.test(name))files.push(name);} }
walk('src/components');walk('src/pages');files.push('src/App.jsx','src/lib/AuthContext.jsx');
const missing=[],raw=[];
const inactive=new Set(['Login.jsx','Register.jsx','ResetPassword.jsx','ForgotPassword.jsx','OAuthConsent.jsx']);
for(const file of files){
 if(inactive.has(file.split(/[\\/]/).pop()))continue;
 const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS);
 function visit(node){const line=source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
 if(ts.isJsxText(node)){const text=node.getText(source).replace(/\s+/g,' ').trim();if(/[A-Za-z]{2}/.test(text))raw.push({file,line,text});}
 if(ts.isCallExpression(node)&&node.expression.getText(source)==='t'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){const key=node.arguments[0].text;if(!Object.hasOwn(messages,key)&&/[A-Za-z]{2}/.test(key))missing.push({file,line,key});}
 ts.forEachChild(node,visit);
 }
 visit(source);
}
writeFileSync('plans/reports/localization-coverage.json',JSON.stringify({missing,raw},null,2));
console.log(JSON.stringify({catalogKeys:Object.keys(messages).length,missing,raw},null,2));
