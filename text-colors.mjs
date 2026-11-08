export function colorTextAt(content,path){return path.split('.').reduce((o,k)=>o?.[k],content)}
export function validTextColors(content){
 const styles=content.textColors;if(styles===undefined)return true;
 if(!styles||typeof styles!=='object'||Array.isArray(styles)||Object.keys(styles).length>400)return false;
 return Object.entries(styles).every(([path,ranges])=>{
  if(!/^(name|hero|aboutTitle|about|address|phone|copy\.[A-Za-z][A-Za-z0-9]{0,60}|instructors\.\d+\.(role|name|intro|career)|classes\.\d+\.(name|level|desc)|videos\.\d+\.(title|category))$/.test(path))return false;
  const text=colorTextAt(content,path);if(typeof text!=='string'||!Array.isArray(ranges)||ranges.length>200)return false;
  let last=0;return ranges.every(r=>{if(!r||!Number.isSafeInteger(r.start)||!Number.isSafeInteger(r.end)||r.start<last||r.start<0||r.end<=r.start||r.end>text.length||!/^#[0-9a-f]{6}$/i.test(r.color))return false;last=r.end;return true});
 });
}
export function paintTextRange(ranges,start,end,color){
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||color!==null&&!/^#[0-9a-f]{6}$/i.test(color))return ranges||[];
 const result=[];for(const r of ranges||[]){if(r.end<=start||r.start>=end)result.push({...r});else{if(r.start<start)result.push({...r,end:start});if(r.end>end)result.push({...r,start:end})}}
 if(color)result.push({start,end,color:color.toLowerCase()});result.sort((a,b)=>a.start-b.start);
 return result.reduce((out,r)=>{const prev=out.at(-1);if(prev&&prev.end===r.start&&prev.color===r.color)prev.end=r.end;else out.push(r);return out},[]);
}
export function rebaseTextColors(ranges,oldText,newText){
 if(oldText===newText)return ranges||[];
 let prefix=0;while(prefix<oldText.length&&prefix<newText.length&&oldText[prefix]===newText[prefix])prefix++;
 let suffix=0;while(suffix<oldText.length-prefix&&suffix<newText.length-prefix&&oldText[oldText.length-1-suffix]===newText[newText.length-1-suffix])suffix++;
 const oldEnd=oldText.length-suffix,delta=newText.length-oldText.length,result=[];
 for(const r of ranges||[]){if(r.end<=prefix)result.push({...r});else if(r.start>=oldEnd)result.push({...r,start:r.start+delta,end:r.end+delta});else{if(r.start<prefix)result.push({...r,end:prefix});if(r.end>oldEnd)result.push({...r,start:oldEnd+delta,end:r.end+delta})}}
 return result.filter(r=>r.end>r.start&&r.start>=0&&r.end<=newText.length);
}
export function coloredTextHtml(text,ranges){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let html='',cursor=0;for(const r of ranges||[]){if(!/^#[0-9a-f]{6}$/i.test(r.color)||r.start<cursor||r.end>text.length)continue;html+=escape(text.slice(cursor,r.start))+'<span class="text-color" style="color:'+r.color+'">'+escape(text.slice(r.start,r.end))+'</span>';cursor=r.end}return html+escape(text.slice(cursor));
}
