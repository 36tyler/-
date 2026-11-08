import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
let config;try{config=JSON.parse(await readFile(new URL('../.local/admin.json',import.meta.url),'utf8'))}catch{console.error('먼저 npm run setup을 실행하세요.');process.exit(1)}
for(const key of ['ADMIN_PASSWORD_HASH','ADMIN_PASSWORD_SALT']){
 const result=spawnSync('gh',['secret','set',key],{input:config[key],stdio:['pipe','inherit','inherit'],shell:false});
 if(result.status!==0){console.error('GitHub CLI 로그인과 저장소 연결 상태를 확인하세요.');process.exit(1)}
}
console.log('관리자 설정을 현재 GitHub 저장소의 Actions secrets에 등록했습니다.');
