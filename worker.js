export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null,{headers:cors});
    try {
      const url = new URL(request.url);
      if (request.method === 'GET') {
        const file = url.searchParams.get('file');
        if (!file) return json({success:false,message:'file is required'},400,cors);
        const data = await githubGet(env, `data/${safeName(file)}.json`);
        return json(data,200,cors);
      }
      if (request.method === 'POST') {
        const body = await request.json();
        if (body.action !== 'save') return json({success:false,message:'unsupported action'},400,cors);
        const file = safeName(body.file);
        if (!file || !body.data) return json({success:false,message:'file/data required'},400,cors);
        const result = await githubPutWithRetry(env, `data/${file}.json`, body.data);
        return json({success:true,sha:result.content?.sha||null},200,cors);
      }
      return json({success:false,message:'method not allowed'},405,cors);
    } catch (e) { return json({success:false,message:e.message||String(e)},500,cors); }
  }
};

function safeName(v){ return String(v||'').replace(/[^a-zA-Z0-9_-]/g,''); }
function json(data,status,headers){ return new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json;charset=UTF-8'}}); }
function ghHeaders(env){ return {'Authorization':`Bearer ${env.GITHUB_TOKEN}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'axgate-inventory-worker','Content-Type':'application/json'}; }
async function githubGet(env,path){
  const url=`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(env.GITHUB_BRANCH||'main')}`;
  const r=await fetch(url,{headers:ghHeaders(env)});
  if(r.status===404) return path.endsWith('inven.json')?{items:[],logs:[]}:{maintenanceContracts:[]};
  if(!r.ok) throw new Error(`GitHub GET ${r.status}: ${await r.text()}`);
  const j=await r.json();
  const bytes=Uint8Array.from(atob(j.content.replace(/\n/g,'')),c=>c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function githubPutWithRetry(env,path,data){
  for(let attempt=0;attempt<3;attempt++){
    const url=`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
    let sha=null;
    const get=await fetch(url+`?ref=${encodeURIComponent(env.GITHUB_BRANCH||'main')}`,{headers:ghHeaders(env)});
    if(get.ok){ sha=(await get.json()).sha; }
    else if(get.status!==404){ throw new Error(`GitHub GET ${get.status}: ${await get.text()}`); }
    const bytes=new TextEncoder().encode(JSON.stringify(data,null,2));
    let binary=''; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    const body={message:`AXGATE inventory update ${new Date().toISOString()}`,content:btoa(binary),branch:env.GITHUB_BRANCH||'main'};
    if(sha) body.sha=sha;
    const put=await fetch(url,{method:'PUT',headers:ghHeaders(env),body:JSON.stringify(body)});
    if(put.ok) return put.json();
    if(put.status===409){ await new Promise(r=>setTimeout(r,250*(attempt+1))); continue; }
    throw new Error(`GitHub PUT ${put.status}: ${await put.text()}`);
  }
  throw new Error('동시 수정 충돌이 반복되었습니다. 다시 시도해주세요.');
}
