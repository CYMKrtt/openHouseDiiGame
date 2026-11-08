import { randomBytes, scryptSync } from 'node:crypto';
import { stdin, stdout } from 'node:process';
if (!stdin.isTTY) { console.error('Run this command in an interactive terminal.'); process.exit(1); }
stdout.write('Enter a new development Host password (input hidden): ');
stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8'); let value='';
stdin.on('data', chunk => {
 for (const ch of chunk) {
  if (ch==='\u0003') { stdout.write('\n'); process.exit(1); }
  if (ch==='\r' || ch==='\n') { stdin.setRawMode(false); stdin.pause(); stdout.write('\n'); if(value.length<12){console.error('Use at least 12 characters.');process.exit(1)} const salt=randomBytes(16); const result=scryptSync(value,salt,64); console.log(`scrypt:${salt.toString('base64url')}:${result.toString('base64url')}`);value='';return; }
  if (ch==='\u007f' || ch==='\b') value=value.slice(0,-1); else value+=ch;
 }
});
