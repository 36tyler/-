import {mkdir,writeFile} from 'node:fs/promises';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
async function readPassword(){
 if(!process.stdin.isTTY){const rl=createInterface({input:process.stdin});const line=await rl.question('');rl.close();return line}
 process.stdout.write('관리자 비밀번호 설정 (10자 이상): ');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
 return new Promise(resolve=>{let value='';const finish=()=>{process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value)};const onData=chunk=>{for(const ch of chunk){if(ch==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(ch==='\r'||ch==='\n'){finish();return}if(ch==='\u007f'||ch==='\b'){if(value){value=value.slice(0,-1);process.stdout.write('\b \b')}}else if(ch>=' '){value+=ch;process.stdout.write('•')}}};process.stdin.on('data',onData)})
}
const password=await readPassword();if(password.length<10){console.error('10자 이상으로 설정하세요.');process.exit(1)}
const salt=randomBytes(32).toString('hex');
const config={ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')};
await mkdir(new URL('./.local/',import.meta.url),{recursive:true});await writeFile(new URL('./.local/admin.json',import.meta.url),JSON.stringify(config),{mode:0o600});console.log('관리자 비밀번호 설정 완료. 비밀값은 .local/에 저장되었습니다.');
