export const CHUNK_SIZE=8*1024*1024;
export const MAX_VIDEO_SIZE=500*1024*1024;
const types={'video/mp4':'mp4','video/webm':'webm'};
export function videoType(name,type){return types[type]?type:/\.mp4$/i.test(name)&&!type?'video/mp4':/\.webm$/i.test(name)&&!type?'video/webm':null}
export function videoMagic(bytes,type){return type==='video/mp4'?String.fromCharCode(...bytes.slice(4,8))==='ftyp':type==='video/webm'&&bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163}
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function multipartRoute(req,env,owner){
 const u=new URL(req.url),path=u.pathname;
 if(path==='/api/uploads'&&req.method==='POST'){
 const {name,type,size}=await req.json();const mime=videoType(name,type);
 if(!mime||!Number.isSafeInteger(size)||size<=0||size>MAX_VIDEO_SIZE)return json({error:'영상은 MP4·WebM 형식으로 최대 500MB까지 업로드할 수 있습니다.'},400);
 const id=crypto.randomUUID(),key='media/'+crypto.randomUUID()+'.'+types[mime],upload=await env.BUCKET.createMultipartUpload(key,{httpMetadata:{contentType:mime}});
 await env.BUCKET.put('uploads/'+id+'/meta',JSON.stringify({owner,key,uploadId:upload.uploadId,size,type:mime,expires:Date.now()+86400000}));
 return json({id,chunkSize:CHUNK_SIZE});
 }
 const m=/^\/api\/uploads\/([a-f0-9-]{36})(?:\/(\d+|complete))?$/.exec(path);if(!m)return json({error:'잘못된 업로드 경로입니다.'},404);
 const obj=await env.BUCKET.get('uploads/'+m[1]+'/meta');if(!obj)return json({error:'업로드가 만료되었습니다. 파일을 다시 선택해 주세요.'},404);
 const meta=await obj.json();if(meta.owner!==owner)return json({error:'이 파일을 업로드할 권한이 없습니다.'},403);
 const upload=env.BUCKET.resumeMultipartUpload(meta.key,meta.uploadId);
 if(req.method==='DELETE'&&!m[2]){await upload.abort();await env.BUCKET.delete('uploads/'+m[1]+'/meta');await Promise.all(Array.from({length:Math.ceil(meta.size/CHUNK_SIZE)},(_,i)=>env.BUCKET.delete('uploads/'+m[1]+'/part-'+(i+1))));return json({ok:true})}
 if(meta.expires<Date.now())return json({error:'업로드가 만료되었습니다. 파일을 다시 선택해 주세요.'},410);
 if(req.method==='PUT'&&/^\d+$/.test(m[2])){
 const part=Number(m[2]),total=Math.ceil(meta.size/CHUNK_SIZE),expected=part===total?meta.size-(part-1)*CHUNK_SIZE:CHUNK_SIZE;
 if(part<1||part>total)return json({error:'잘못된 파일 조각입니다.'},400);
 if(Number(req.headers.get('Content-Length'))>expected)return json({error:'파일 조각이 너무 큽니다.'},413);
 const reader=req.body?.getReader();if(!reader)return json({error:'파일 데이터가 없습니다.'},400);let length=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>expected){await reader.cancel();return json({error:'파일 조각이 너무 큽니다.'},413)}chunks.push(value)}
 if(length!==expected)return json({error:'파일 전송이 끝나지 않았습니다. 다시 시도해 주세요.'},400);
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 if(part===1&&!videoMagic(bytes,meta.type))return json({error:'영상 형식을 확인할 수 없습니다. MP4 또는 WebM 파일을 선택해 주세요.'},400);
 const saved=await upload.uploadPart(part,bytes);await env.BUCKET.put('uploads/'+m[1]+'/part-'+part,JSON.stringify(saved));return json(saved);
 }
 if(req.method==='POST'&&m[2]==='complete'){
 const total=Math.ceil(meta.size/CHUNK_SIZE),parts=[];for(let part=1;part<=total;part++){const p=await env.BUCKET.get('uploads/'+m[1]+'/part-'+part);if(!p)return json({error:'전송되지 않은 파일 조각이 있습니다. 다시 시도해 주세요.'},409);parts.push(await p.json())}
 await upload.complete(parts);await env.BUCKET.delete('uploads/'+m[1]+'/meta');await Promise.all(parts.map(p=>env.BUCKET.delete('uploads/'+m[1]+'/part-'+p.partNumber)));return json({url:'/'+meta.key});
 }
 return json({error:'허용되지 않은 업로드 요청입니다.'},405);
}
