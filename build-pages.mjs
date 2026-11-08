import {readFile,writeFile,mkdir} from 'node:fs/promises';
let html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
html=html.replace('data-theme="dark"','data-theme="dark" data-preview="static"').replace("const isFile=location.protocol==='file:'", "const isFile=location.protocol==='file:'||document.documentElement.dataset.preview==='static'");
html=html.replace('디자인 미리보기 · 학원 정보와 이미지는 관리자 화면에서 등록할 수 있습니다.','GitHub Pages 디자인 미리보기 · 관리자·저장·업로드 기능은 Cloudflare 전체 배포에서 사용할 수 있습니다.');
await mkdir(new URL('../dist/pages/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/pages/index.html',import.meta.url),html);
console.log('Built dist/pages/index.html (static preview only)');
