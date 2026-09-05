import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {API_BASE,apiUrl,getJSON,postJSON,deleteJSON} from './api.js';
const h=React.createElement; const C=createContext(null);
export const useApp=()=>useContext(C);

export function AppProvider({children}) {
  const [sessionsState,setSessionsState]=useState({sessions:[],currentSessionId:null,watchedSessionIds:[]});
  const [state,setState]=useState(null),[history,setHistory]=useState([]),[jobs,setJobs]=useState([]),[translationCatalog,setTranslationCatalog]=useState([]),[settings,setSettings]=useState(null),[prompts,setPrompts]=useState([]);
  const [live,setLive]=useState('CONNECTING'),[sidebar,setSidebar]=useState(false),[modal,setModal]=useState(null),[revision,setRevision]=useState(0); const modalQueue=useRef([]);
  const currentSessionId=sessionsState.currentSessionId;
  const currentSession=useMemo(()=>sessionsState.sessions.find(x=>x.id===currentSessionId)||null,[sessionsState,currentSessionId]);
  const watchedSessions=useMemo(()=>sessionsState.sessions.filter(x=>sessionsState.watchedSessionIds.includes(x.id)),[sessionsState]);
  const refreshSessions=useCallback(async()=>setSessionsState(await getJSON('/api/sessions')),[]);
  const loadState=useCallback(async sessionIds=>getJSON(`/api/state${sessionIds?.length?`?sessionIds=${encodeURIComponent(sessionIds.join(','))}`:''}`),[]);
  const refreshState=useCallback(async()=>setState(await loadState(currentSessionId?[currentSessionId]:[])),[loadState,currentSessionId]);
  const loadHistory=useCallback(async sessionIds=>(await getJSON(`/api/history${sessionIds?.length?`?sessionIds=${encodeURIComponent(sessionIds.join(','))}`:''}`)).history||[],[]);
  const refreshHistory=useCallback(async()=>setHistory(await loadHistory()),[loadHistory]);
  const refreshJobs=useCallback(async()=>setJobs((await getJSON('/api/translations')).jobs||[]),[]);
  const refreshCatalog=useCallback(async()=>setTranslationCatalog((await getJSON('/api/translation-catalog')).tasks||[]),[]);
  const refreshSettings=useCallback(async()=>setSettings(await getJSON('/api/settings')),[]);
  const refreshPrompts=useCallback(async()=>setPrompts((await getJSON('/api/prompts')).prompts||[]),[]);
  const enqueue=useCallback(item=>setModal(current=>{if(current){modalQueue.current.push(item);return current;}return item;}),[]);
  const acknowledge=useCallback(()=>setModal(()=>modalQueue.current.shift()||null),[]);
  const refreshAll=useCallback(async()=>{await Promise.all([refreshSessions(),refreshHistory(),refreshJobs(),refreshCatalog(),refreshSettings(),refreshPrompts()]);setRevision(x=>x+1);},[refreshSessions,refreshHistory,refreshJobs,refreshCatalog,refreshSettings,refreshPrompts]);
  useEffect(()=>{refreshAll().catch(e=>enqueue({kind:'error',title:'Dashboard load failed',message:e.message}));},[]);
  useEffect(()=>{if(currentSessionId)refreshState().catch(()=>{});else setState(null);},[currentSessionId,revision]);
  useEffect(()=>{const es=new EventSource(apiUrl('/events'));es.onopen=()=>setLive('LIVE');es.onerror=()=>setLive('RECONNECTING');
    const invalidate=()=>{setRevision(x=>x+1);Promise.all([refreshSessions(),refreshHistory(),refreshJobs(),refreshCatalog()]).catch(()=>{});};
    es.addEventListener('state-invalidated',invalidate);
    es.addEventListener('app-state-changed',()=>{refreshSessions().then(()=>setRevision(x=>x+1)).catch(()=>{});});
    es.addEventListener('sessions-changed',()=>{refreshSessions().then(()=>setRevision(x=>x+1)).catch(()=>{});});
    es.addEventListener('notification',e=>{try{enqueue({kind:'notification',...JSON.parse(e.data)});}catch{};refreshHistory();setRevision(x=>x+1);});
    es.addEventListener('translation-error',e=>{try{enqueue({kind:'translation-error',...JSON.parse(e.data)});}catch{};invalidate();});
    es.addEventListener('translation-jobs-changed',()=>Promise.all([refreshJobs(),refreshCatalog()]).then(()=>setRevision(x=>x+1)).catch(()=>{}));
    es.addEventListener('settings-changed',()=>refreshSettings().catch(()=>{}));
    es.addEventListener('prompts-changed',()=>refreshPrompts().catch(()=>{}));
    return()=>es.close();},[enqueue,refreshSessions,refreshHistory,refreshJobs,refreshCatalog,refreshSettings,refreshPrompts]);
  const actions=useMemo(()=>({
    setSidebar,showModal:enqueue,acknowledge,refreshSessions,refreshState,loadState,refreshHistory,loadHistory,refreshJobs,refreshCatalog,refreshSettings,refreshPrompts,
    switchSession:async sessionId=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/switch`,{});const sessions=await getJSON('/api/sessions');setSessionsState(sessions);setState(await loadState([sessionId]));setRevision(x=>x+1);},
    setSessionWatched:async(sessionId,watched)=>{if(watched)await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/watch`,{});else await deleteJSON(`/api/sessions/${encodeURIComponent(sessionId)}/watch`);await refreshSessions();setRevision(x=>x+1);},
    toggleGlobalLanguage:async()=>{if(!currentSessionId)return;const lang=state?.globalLanguage==='hu'?'en':'hu';await postJSON(`/api/sessions/${encodeURIComponent(currentSessionId)}/language`,{language:lang});setRevision(x=>x+1);},
    toggleTaskLanguage:async(sessionId,uid,viewLanguage)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/tasks/${encodeURIComponent(uid)}/language`,{language:viewLanguage==='hu'?'en':'hu'});setRevision(x=>x+1);await Promise.all([refreshJobs(),refreshCatalog()]);},
    cancelGlobal:async()=>{if(!currentSessionId)return;await postJSON(`/api/sessions/${encodeURIComponent(currentSessionId)}/language/cancel`);setRevision(x=>x+1);await Promise.all([refreshJobs(),refreshCatalog()]);},
    cancelTask:async(sessionId,uid)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/tasks/${encodeURIComponent(uid)}/translation/cancel`);setRevision(x=>x+1);await Promise.all([refreshJobs(),refreshCatalog()]);},
    retryJob:async(sessionId,id)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}/retry`);await Promise.all([refreshJobs(),refreshCatalog()]);},
    cancelJob:async(sessionId,id)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}/cancel`);await Promise.all([refreshJobs(),refreshCatalog()]);},
    deleteJob:async(sessionId,id)=>{await deleteJSON(`/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}`);await Promise.all([refreshJobs(),refreshCatalog()]);setRevision(x=>x+1);},
  }),[currentSessionId,state,enqueue,acknowledge,refreshSessions,refreshState,loadState,refreshHistory,loadHistory,refreshJobs,refreshCatalog,refreshSettings,refreshPrompts]);
  return h(C.Provider,{value:{API_BASE,sessionsState,currentSessionId,currentSession,watchedSessions,state,history,jobs,translationCatalog,settings,prompts,live,sidebar,modal,revision,...actions}},children);
}
