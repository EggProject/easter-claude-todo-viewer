const API_BASE=(window.CLAUDE_TODOS_API_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
export {API_BASE};
export function apiUrl(path){return /^https?:\/\//.test(path)?path:`${API_BASE}${path.startsWith('/')?path:`/${path}`}`;}
export async function api(path,options={}){const r=await fetch(apiUrl(path),{cache:'no-store',...options,headers:{'content-type':'application/json',...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);return data;}
export const getJSON=path=>api(path);
export const postJSON=(path,body={})=>api(path,{method:'POST',body:JSON.stringify(body)});
export const patchJSON=(path,body={})=>api(path,{method:'PATCH',body:JSON.stringify(body)});
export const deleteJSON=path=>api(path,{method:'DELETE'});
