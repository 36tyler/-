import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {LocalBucket} from './local-storage.mjs';
import app from './worker.mjs';
let config;try{config=JSON.parse(await readFile(new URL('./.local/admin.json',import.meta.url),'utf8'))}catch{console.error('먼저 node setup.mjs 명령으로 관리자 비밀번호를 설정해 주세요.');process.exit(1)}
const env={...config,BUCKET:new LocalBucket(fileURLToPath(new URL('./.local/storage/',import.meta.url)))};
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
http.createServer(async(req,res)=>{try{let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>31*1024*1024){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'파일이 너무 큽니다.'}));return}chunks.push(chunk)}const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);const body=Buffer.concat(chunks);const request=new Request(`http://${req.headers.host||'localhost:'+port}${req.url}`,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body}:{} )});const response=await app.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end()}catch{res.writeHead(500);res.end('Server error')}}).listen(port,host,()=>console.log(`SHUFFLE STUDIO: http://${host}:${port}`));
