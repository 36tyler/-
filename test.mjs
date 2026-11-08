import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pbkdf2Sync} from 'node:crypto';
import vm from 'node:vm';
import app from './worker.mjs';
import {LocalBucket} from './local-storage.mjs';
test('frontend JavaScript parses and all local element references exist',async()=>{const html=await readFile(new URL('./public/index.html',import.meta.url),'utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const m of script.matchAll(/\$\('#([\w-]+)'\)/g))assert.ok(ids.has(m[1]),m[1])});
test('admin lifecycle, authorization, persistent content, uploads, conflict detection and throttling',async()=>{const dir=await mkdtemp(join(tmpdir(),'shuffle-'));try{const secret=crypto.randomUUID();const salt='test-salt';const env={BUCKET:new LocalBucket(dir),ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:pbkdf2Sync(secret,salt,100000,32,'sha256').toString('hex')};let cookie='';const call=(path,method='GET',body,origin='https://test.example')=>app.fetch(new Request('https://test.example'+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
assert.equal((await call('/')).status,200);assert.equal((await call('/api/content','PUT',{content:{}})).status,401);assert.equal((await call('/api/login','POST',{password:secret},'https://other.example')).status,403);assert.equal((await call('/api/login','POST',{password:'wrong'})).status,401);let r=await call('/api/login','POST',{password:secret});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict.*Secure/);cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await(await call('/api/session')).json()).authenticated,true);
const html=await readFile(new URL('./public/index.html',import.meta.url),'utf8'),src=html.match(/const defaults=([\s\S]*?);\nconst \$/)[1],content=vm.runInNewContext('('+src+')');r=await call('/api/content','PUT',{content,revision:null});assert.equal(r.status,200);const saved=await r.json();assert.ok(saved.revision);assert.equal((await call('/api/content','PUT',{content,revision:null})).status,409);assert.equal((await(await call('/api/content')).json()).content.name,'SHUFFLE STUDIO');content.copy={heroTitle:'새로운 첫 스텝',aboutHeading:'직접 수정한 제목',aboutLead:'첫째 줄\n둘째 줄',ctaBody:'<script>alert(1)</script>'};r=await call('/api/content','PUT',{content,revision:saved.revision});assert.equal(r.status,200);const copySaved=await r.json();assert.deepEqual((await(await call('/api/content')).json()).content.copy,content.copy);saved.revision=copySaved.revision;content.textColors={'copy.heroTitle':[{start:0,end:3,color:'#ff6b6b'}],hero:[{start:0,end:2,color:'#74c0fc'}]};r=await call('/api/content','PUT',{content,revision:saved.revision});assert.equal(r.status,200);const coloredSaved=await r.json();saved.revision=coloredSaved.revision;assert.deepEqual((await(await call('/api/content')).json()).content.textColors,content.textColors);content.textColors.hero[0].color='red;position:fixed';assert.equal((await call('/api/content','PUT',{content,revision:saved.revision})).status,400);content.textColors.hero[0].color='#74c0fc';content.copy.heroTitle={html:'bad'};assert.equal((await call('/api/content','PUT',{content,revision:saved.revision})).status,400);content.copy.heroTitle='새로운 첫 스텝';content.interior='javascript:alert(1)';assert.equal((await call('/api/content','PUT',{content,revision:saved.revision})).status,400);
const upload=async(file)=>{const form=new FormData();form.append('file',file);return app.fetch(new Request('https://test.example/api/upload',{method:'POST',headers:{Origin:'https://test.example',Cookie:cookie},body:form}),env)};assert.equal((await upload(new File(['<svg/>'],'x.svg',{type:'image/svg+xml'}))).status,400);assert.equal((await upload(new File(['fake'],'x.png',{type:'image/png'}))).status,400);r=await upload(new File([new Uint8Array([137,80,78,71,13,10,26,10])],'test.png',{type:'image/png'}));assert.equal(r.status,200);const media=await r.json();r=await call(media.url);assert.equal(r.headers.get('content-type'),'image/png');assert.equal((await r.arrayBuffer()).byteLength,8);
assert.equal((await call('/api/logout','POST')).status,200);assert.equal((await(await call('/api/session')).json()).authenticated,false);for(let i=0;i<5;i++)assert.equal((await call('/api/login','POST',{password:'wrong'})).status,401);assert.equal((await call('/api/login','POST',{password:secret})).status,429);
}finally{await rm(dir,{recursive:true,force:true})}});

test('inline editing requires login, cancels drafts, saves changes and retains failed drafts',async()=>{
 const html=await readFile(new URL('./public/index.html',import.meta.url),'utf8');
 const helpers=html.slice(html.indexOf('// TEXT_COLOR_HELPERS_START'),html.indexOf('// TEXT_COLOR_HELPERS_END'));
 const source=helpers+html.slice(html.indexOf('function readPath('),html.indexOf('render();if(isFile)'));
 const els=new Map(),listeners={};
 const editable={dataset:{edit:'hero'},textContent:'첫 소개',innerText:'바뀐 소개',attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},closest(){return this}};
 const query=s=>{if(!els.has(s))els.set(s,{hidden:true,textContent:'',disabled:false,querySelectorAll(){return []},showModal(){this.open=true},focus(){},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end},close(){this.closed=true}});return els.get(s)};
 const ctx=vm.createContext({structuredClone,confirm:()=>true,authenticated:false,inlineMode:false,inlineOriginal:null,inlineBusy:false,inlineDirty:false,data:{hero:'첫 소개',copy:{}},copyDefaults:{heroTitle:'YOUR STEP.'},revision:'old',document:{querySelectorAll:s=>s==='[data-edit]'?[editable]:[],body:{classList:{add(){},remove(){}}},addEventListener:(k,f)=>listeners[k]=f},window:{addEventListener(){}},$:query,rememberAdminToken(){},applyCopy(){},render(){},openAdmin(){},api:async()=>({content:{hero:'바뀐 소개',copy:{}},revision:'new'})});
 vm.runInContext(source,ctx);ctx.render=()=>ctx.markInline();
 vm.runInContext('beginInline()',ctx);assert.equal(ctx.inlineMode,false);
 ctx.authenticated=true;vm.runInContext('beginInline()',ctx);assert.equal(ctx.inlineMode,true);assert.equal(editable.attrs.contenteditable,'plaintext-only');
 listeners.input({target:editable});assert.equal(ctx.data.hero,'바뀐 소개');assert.equal(ctx.inlineDirty,true);
 query('#inlineCancel').onclick();assert.equal(ctx.inlineMode,false);assert.equal(ctx.data.hero,'첫 소개');assert.equal(editable.attrs.contenteditable,undefined);
 vm.runInContext('beginInline()',ctx);listeners.input({target:editable});query('#colorField').value='hero';query('#colorText').value=ctx.data.hero;query('#colorText').selectionStart=0;query('#colorText').selectionEnd=2;query('#textColorPicker').value='#ff6b6b';query('#applyTextColor').onclick();assert.equal(ctx.data.textColors.hero[0].color,'#ff6b6b');query('#resetTextColor').onclick();assert.equal(ctx.data.textColors.hero.length,0);query('#applyTextColor').onclick();ctx.api=async()=>({content:structuredClone(ctx.data),revision:'new'});await query('#inlineSave').onclick();assert.equal(ctx.data.textColors.hero[0].color,'#ff6b6b');assert.equal(ctx.inlineMode,false);assert.equal(ctx.data.hero,'바뀐 소개');assert.equal(ctx.revision,'new');
 vm.runInContext('beginInline()',ctx);editable.innerText='실패 후 남아있는 수정';listeners.input({target:editable});ctx.api=async()=>{throw Error('저장 충돌')};await query('#inlineSave').onclick();assert.equal(ctx.inlineMode,true);assert.equal(ctx.data.hero,'실패 후 남아있는 수정');assert.match(query('#inlineMessage').textContent,/저장 충돌/);assert.equal(query('#inlineSave').disabled,false);
 ctx.uploading=0;ctx.draft=undefined;ctx.confirm=()=>false;let logoutCalls=0;ctx.api=async()=>{logoutCalls++;return {ok:true}};
 ctx.showAdminMenu();assert.equal(query('#adminMenu').open,true);await query('#accountLogout').onclick();assert.equal(logoutCalls,0);assert.equal(ctx.authenticated,true);assert.equal(ctx.inlineMode,true);
 ctx.confirm=()=>true;ctx.api=async()=>{throw Error('연결 오류')};await query('#accountLogout').onclick();assert.equal(ctx.authenticated,true);assert.equal(ctx.inlineMode,true);assert.match(query('#accountMessage').textContent,/로그아웃하지 못했습니다/);
 ctx.api=async(path,options)=>{assert.equal(path,'/api/logout');assert.equal(options.method,'POST');return {ok:true}};await query('#accountLogout').onclick();assert.equal(ctx.authenticated,false);assert.equal(ctx.inlineMode,false);assert.equal(ctx.data.hero,'바뀐 소개');assert.equal(query('#inlineBar').hidden,true);assert.equal(query('#adminBtn').textContent,'관리자 ↗');assert.equal(query('#accountLogout').disabled,false);
});

test('selected text colors split, replace, reset, merge and safely render',async()=>{
 const {paintTextRange,rebaseTextColors,coloredTextHtml,validTextColors}=await import('./text-colors.mjs');
 let ranges=paintTextRange([],2,6,'#FF0000');assert.deepEqual(ranges,[{start:2,end:6,color:'#ff0000'}]);
 ranges=paintTextRange(ranges,3,5,'#00ff00');assert.deepEqual(ranges,[{start:2,end:3,color:'#ff0000'},{start:3,end:5,color:'#00ff00'},{start:5,end:6,color:'#ff0000'}]);
 ranges=paintTextRange(ranges,3,5,null);assert.deepEqual(ranges,[{start:2,end:3,color:'#ff0000'},{start:5,end:6,color:'#ff0000'}]);
 ranges=paintTextRange(ranges,3,5,'#ff0000');assert.deepEqual(ranges,[{start:2,end:6,color:'#ff0000'}]);
 assert.deepEqual(rebaseTextColors([{start:2,end:4,color:'#ff0000'}],'가나다라마','새가나다라마'),[{start:3,end:5,color:'#ff0000'}]);
 assert.deepEqual(rebaseTextColors([{start:0,end:5,color:'#ff0000'}],'가나다라마','가나새라마'),[{start:0,end:2,color:'#ff0000'},{start:3,end:5,color:'#ff0000'}]);
 assert.equal(coloredTextHtml('<img>',[{start:1,end:4,color:'#ff0000'}]),'&lt;<span class="text-color" style="color:#ff0000">img</span>&gt;');
 assert.ok(!coloredTextHtml('hello',[{start:0,end:5,color:'red;background:url(x)'}]).includes('style='));
 const content={hero:'안녕하세요',textColors:{hero:[{start:1,end:3,color:'#d8ff69'}]}};assert.equal(validTextColors(content),true);
 for(const bad of [[{start:-1,end:3,color:'#ffffff'}],[{start:1,end:99,color:'#ffffff'}],[{start:1,end:3,color:'red'}],[{start:1,end:4,color:'#ffffff'},{start:2,end:3,color:'#000000'}]])assert.equal(validTextColors({...content,textColors:{hero:bad}}),false);
 assert.equal(validTextColors({...content,textColors:{'__proto__.x':[]}}),false);
});

test('multipart video upload validates authentication, parts, completion, cancellation and bearer sessions',async()=>{
 const {CHUNK_SIZE,MAX_VIDEO_SIZE}=await import('./uploads.mjs');const dir=await mkdtemp(join(tmpdir(),'shuffle-upload-'));try{
 const salt='upload-test',secret=crypto.randomUUID(),env={BUCKET:new LocalBucket(dir),ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:pbkdf2Sync(secret,salt,100000,32,'sha256').toString('hex')};let token='';
 const call=(path,method='GET',body,raw=false)=>app.fetch(new Request('https://test.example'+path,{method,headers:{Origin:'https://test.example',...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':raw?'application/octet-stream':'application/json'},...(body!==undefined?{body:raw?body:JSON.stringify(body)}:{})}),env);
 assert.equal((await call('/api/uploads','POST',{name:'video.mp4',type:'video/mp4',size:100})).status,401);
 const login=await(await call('/api/login','POST',{password:secret})).json();token=login.token;assert.match(token,/^[a-f0-9]{64}$/);assert.equal((await(await call('/api/session')).json()).authenticated,true);
 assert.equal((await call('/api/uploads','POST',{name:'video.mp4',type:'video/mp4',size:MAX_VIDEO_SIZE+1})).status,400);
 assert.equal((await call('/api/uploads','POST',{name:'bad.svg',type:'image/svg+xml',size:100})).status,400);
 const size=CHUNK_SIZE+16;const init=await(await call('/api/uploads','POST',{name:'video.mp4',type:'video/mp4',size})).json();assert.equal(init.chunkSize,CHUNK_SIZE);
 assert.equal((await call('/api/uploads/'+init.id+'/complete','POST')).status,409);
 assert.equal((await call('/api/uploads/'+init.id+'/3','PUT',new Uint8Array(16),true)).status,400);
 assert.equal((await call('/api/uploads/'+init.id+'/1','PUT',new Uint8Array(3),true)).status,400);
 const bytes=new Uint8Array(CHUNK_SIZE);bytes.set([0,0,0,24,102,116,121,112]);assert.equal((await call('/api/uploads/'+init.id+'/1','PUT',bytes,true)).status,200);
 assert.equal((await call('/api/uploads/'+init.id+'/1','PUT',bytes,true)).status,200); // retry of same chunk
 const other=await(await call('/api/login','POST',{password:secret})).json();const original=token;token=other.token;assert.equal((await call('/api/uploads/'+init.id+'/2','PUT',new Uint8Array(16),true)).status,403);token=original;
 assert.equal((await call('/api/uploads/'+init.id+'/2','PUT',new Uint8Array(16),true)).status,200);
 const completed=await call('/api/uploads/'+init.id+'/complete','POST');assert.equal(completed.status,200);const result=await completed.json();const media=await call(result.url);assert.equal(media.headers.get('Content-Type'),'video/mp4');assert.equal(Number(media.headers.get('Content-Length')),size);assert.equal((await media.arrayBuffer()).byteLength,size);
 const bad=await(await call('/api/uploads','POST',{name:'bad.webm',type:'video/webm',size:4})).json();assert.equal((await call('/api/uploads/'+bad.id+'/1','PUT',new Uint8Array(4),true)).status,400);assert.equal((await call('/api/uploads/'+bad.id,'DELETE')).status,200);assert.equal((await call('/api/uploads/'+bad.id+'/complete','POST')).status,404);
 assert.equal((await call('/api/logout','POST')).status,200);assert.equal((await(await call('/api/session')).json()).authenticated,false);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('large video client splits 99MB, retries a failed chunk, and keeps editor open on auth expiry',async()=>{
 const html=await readFile(new URL('./public/index.html',import.meta.url),'utf8');const src=html.slice(html.indexOf('let uploading=0,'),html.indexOf("$('#editor').onsubmit"));
 const els=new Map();const q=s=>{if(!els.has(s))els.set(s,{disabled:false,hidden:true,textContent:'',querySelectorAll:()=>[],showModal(){this.open=true}});return els.get(s)};
 const file={name:'dance.mp4',type:'video/mp4',size:99122800,slice:(start,end)=>({size:end-start})};const el={files:[file],dataset:{upload:'videos.0.url'},isConnected:true,value:'selected'};let failed=false,parts=0,saved=null;
 const ctx=vm.createContext({$:q,AbortController,AbortSignal,FormData,Blob,authenticated:true,setPath:(path,value)=>saved={path,value},drawEditor(){},api:async(path,options)=>{if(path==='/api/session')return {authenticated:true};if(path==='/api/uploads')return {id:'test-upload',chunkSize:8*1024*1024};if(path.endsWith('/complete'))return {url:'/media/example.mp4'};parts++;if(!failed){failed=true;const error=Error('Transient');error.status=503;throw error}return {partNumber:parts,etag:'x'}}});vm.runInContext(src,ctx);q('#admin').open=true;await ctx.uploadFile(el);assert.equal(parts,13);assert.deepEqual(saved,{path:'videos.0.url',value:'/media/example.mp4'});assert.equal(q('#admin').open,true);assert.equal(q('#saveBtn').disabled,false);
 ctx.api=async()=>({authenticated:false});saved=null;await ctx.uploadFile(el,file);assert.equal(q('#admin').open,true);assert.equal(q('#reauthUpload').hidden,false);assert.equal(q('#retryUpload').hidden,false);assert.equal(saved,null);assert.match(q('#saveMessage').textContent,/편집 내용은 유지/);
});
