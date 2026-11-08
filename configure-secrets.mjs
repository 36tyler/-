import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
let config;
if(process.argv.includes('--environment'))config={ADMIN_PASSWORD_HASH:process.env.ADMIN_PASSWORD_HASH,ADMIN_PASSWORD_SALT:process.env.ADMIN_PASSWORD_SALT};
else {try{config=JSON.parse(await readFile(new URL('../.local/admin.json',import.meta.url),'utf8'))}catch{console.error('먼저 npm run setup을 실행하세요.');process.exit(1)}}
if(!/^[a-f0-9]{64}$/.test(config.ADMIN_PASSWORD_HASH||'')||!config.ADMIN_PASSWORD_SALT){console.error('관리자 비밀값이 없습니다. 설정을 확인하세요.');process.exit(1)}
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
const result=spawnSync(process.execPath,[wrangler,'secret','bulk'],{input:JSON.stringify(config),stdio:['pipe','inherit','inherit'],env:process.env});
process.exit(result.status??1);
