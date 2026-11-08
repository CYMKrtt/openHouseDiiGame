import { readFileSync,writeFileSync } from 'node:fs';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import nextEnv from '@next/env';
import { buildDevelopmentConnection,createHostHash } from './private-config-utils.mjs';
if(!process.stdin.isTTY){console.error('Open an interactive terminal to configure private values.');process.exit(1)}
const muted=new Writable({write(_chunk,_encoding,done){done()}});
const rl=readline.createInterface({input:process.stdin,output:muted,terminal:true});
function hidden(prompt){return new Promise(resolve=>{process.stdout.write(prompt);rl.question('',value=>{process.stdout.write('\n');resolve(value)})})}
let stage='checking local configuration';
try{
 nextEnv.loadEnvConfig(process.cwd());
 const file='.env.local';const original=readFileSync(file,'utf8');
 for(const key of ['M3_TEST_DATABASE_URL','HOST_PASSWORD_SCRYPT']){const m=original.match(new RegExp(`^${key}=([^\\r\\n]*)$`,'m'));if(!m||m[1].trim())throw new Error('Expected an empty entry')}
 stage='reading the session pooler connection';
 const suppliedTemplate=process.argv[2] || process.env.M3_SESSION_POOLER_TEMPLATE;
 if(suppliedTemplate && !suppliedTemplate.includes('[YOUR-PASSWORD]'))throw new Error('Command-line template must have a password placeholder');
 const template=(suppliedTemplate || await hidden('Paste Session pooler connection string (hidden), then Enter: ')).trim();
 const dbPassword=template.includes('[YOUR-PASSWORD]')?await hidden('Database password (hidden), then Enter: '):'';
 const database=buildDevelopmentConnection(template,dbPassword,process.env.SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_URL);
 stage='reading the development Host password';
 const host=await hidden('Choose a development Host password (12+ characters, hidden), then Enter: ');
 const confirmation=await hidden('Repeat the Host password (hidden), then Enter: ');
 if(host!==confirmation)throw new Error('Passwords do not match');const hash=createHostHash(host);
 stage='saving private configuration';
 if(readFileSync(file,'utf8')!==original)throw new Error('File changed; try again');
 let updated=original.replace(/^M3_TEST_DATABASE_URL=[^\r\n]*$/m,()=>`M3_TEST_DATABASE_URL=${database}`);
 updated=updated.replace(/^HOST_PASSWORD_SCRYPT=[^\r\n]*$/m,()=>`HOST_PASSWORD_SCRYPT=${hash}`);
 writeFileSync(file,updated,{mode:0o600});console.log('Private settings saved locally. No values were displayed.');
} catch {console.error(`Could not complete ${stage}. No private values were displayed.`);process.exitCode=1;} finally {rl.close();process.stdin.pause();process.stdin.unref?.()}


process.stdout.write('',()=>process.exit(process.exitCode||0));
