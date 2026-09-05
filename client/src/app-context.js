import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {API_BASE,apiUrl,getJSON,postJSON,deleteJSON} from './api.js';
const h=React.createElement; const C=createContext(null);
export const useApp=()=>useContext(C);

export function AppProvider({children}) {
  const [sessionsState,setSessionsState]=useState({sessions:[],currentSessionId:null,watchedSessionIds:[]});
  const [state,setState]=useState(null),[history,setHistory]=useState([]),[jobs,setJobs]=useState([]),[translationCatalog,setTranslationCatalog]=useState([]),[settings,setSettings]=useState(null),[prompts,setPrompts]=useState([]);
  const [live,setLive]=useState('CONNECTING'),[sidebar,setSidebar]=useState(false),[modal,setModal]=useState(null),[revision,setRevision]=useState(0);
  const [bootstrapStatus,setBootstrapStatus]=useState('loading'),[bootstrapError,setBootstrapError]=useState(null),[bootstrapPhase,setBootstrapPhase]=useState('Connecting to multi-session daemon');
  const modalQueue=useRef([]);
  const currentSessionId=sessionsState.currentSessionId;
  const currentSession=useMemo(()=>sessionsState.sessions.find(x=>x.id===currentSessionId)||null,[sessionsState.sessions,currentSessionId]);
  const watchedSessions=useMemo(()=>sessionsState.sessions.filter(x=>sessionsState.watchedSessionIds.includes(x.id)),[sessionsState.sessions,sessionsState.watchedSessionIds]);

  const loadSessionsSnapshot=useCallback(()=>getJSON('/api/sessions'),[]);
  const refreshSessions=useCallback(async()=>{const next=await postJSON('/api/sessions/refresh',{});setSessionsState(next);return next;},[]);
  const refreshSessionsSnapshot=useCallback(async()=>{const next=await loadSessionsSnapshot();setSessionsState(next);return next;},[loadSessionsSnapshot]);
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

  const loadHeavyData=useCallback(async()=>{
    await Promise.all([refreshHistory(),refreshJobs(),refreshCatalog()]);
    setRevision(x=>x+1);
  },[refreshHistory,refreshJobs,refreshCatalog]);

  const retryBootstrap=useCallback(async()=>{
    setBootstrapStatus('loading');setBootstrapError(null);setBootstrapPhase('Loading session registry');
    try{
      const sessions=await loadSessionsSnapshot(); setSessionsState(sessions);
      setBootstrapPhase('Preparing session workspace');
      const current=sessions.currentSessionId;
      const [nextSettings,nextPrompts,nextState]=await Promise.all([
        getJSON('/api/settings'),
        getJSON('/api/prompts').then(x=>x.prompts||[]),
        current?loadState([current]):Promise.resolve(null),
      ]);
      setSettings(nextSettings);setPrompts(nextPrompts);setState(nextState);
      setBootstrapPhase('Loading interface');setBootstrapStatus('ready');
      loadHeavyData().catch(error=>enqueue({kind:'error',title:'Background data load failed',message:error.message}));
    }catch(error){setBootstrapError(error?.message||String(error));setBootstrapStatus('error');}
  },[loadSessionsSnapshot,loadState,loadHeavyData,enqueue]);

  useEffect(()=>{retryBootstrap();},[]);
  useEffect(()=>{if(bootstrapStatus!=='ready')return;if(currentSessionId)refreshState().catch(()=>{});else setState(null);},[currentSessionId,revision,bootstrapStatus]);
  useEffect(()=>{const es=new EventSource(apiUrl('/events'));es.onopen=()=>setLive('LIVE');es.onerror=()=>setLive('RECONNECTING');
    const invalidate=()=>{setRevision(x=>x+1);Promise.all([refreshSessionsSnapshot(),refreshHistory(),refreshJobs(),refreshCatalog()]).catch(()=>{});};
    es.addEventListener('state-invalidated',invalidate);
    es.addEventListener('app-state-changed',()=>{refreshSessionsSnapshot().then(()=>setRevision(x=>x+1)).catch(()=>{});});
    es.addEventListener('sessions-changed',()=>{refreshSessionsSnapshot().then(()=>setRevision(x=>x+1)).catch(()=>{});});
    es.addEventListener('notification',e=>{try{enqueue({kind:'notification',...JSON.parse(e.data)});}catch{};refreshHistory();setRevision(x=>x+1);});
    es.addEventListener('translation-error',e=>{try{enqueue({kind:'translation-error',...JSON.parse(e.data)});}catch{};invalidate();});
    es.addEventListener('translation-jobs-changed',()=>Promise.all([refreshJobs(),refreshCatalog(),refreshSessionsSnapshot()]).then(()=>setRevision(x=>x+1)).catch(()=>{}));
    es.addEventListener('settings-changed',()=>refreshSettings().catch(()=>{}));
    es.addEventListener('prompts-changed',()=>refreshPrompts().catch(()=>{}));
    return()=>es.close();},[enqueue,refreshSessionsSnapshot,refreshHistory,refreshJobs,refreshCatalog,refreshSettings,refreshPrompts]);

  const switchSessionOptimistic=useCallback(async sessionId=>{
    const previous=sessionsState;
    const watched=new Set(previous.watchedSessionIds||[]);watched.add(sessionId);
    const optimistic={...previous,currentSessionId:sessionId,watchedSessionIds:[...watched],sessions:(previous.sessions||[]).map(item=>({...item,current:item.id===sessionId,watched:watched.has(item.id)}))};
    setSessionsState(optimistic);
    try{
      await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/switch`,{});
      const [snapshot,nextState]=await Promise.all([loadSessionsSnapshot(),loadState([sessionId])]);
      setSessionsState(snapshot);setState(nextState);setRevision(x=>x+1);
    }catch(error){setSessionsState(previous);enqueue({kind:'error',title:'Session switch failed',message:error.message});throw error;}
  },[sessionsState,loadSessionsSnapshot,loadState,enqueue]);

  const setSessionLanguage=useCallback(async(sessionId,language)=>{
    const previous=sessionsState; const watched=new Set(previous.watchedSessionIds||[]); if(language==='hu')watched.add(sessionId);
    setSessionsState({...previous,watchedSessionIds:[...watched],sessions:(previous.sessions||[]).map(item=>item.id===sessionId?{...item,watched:watched.has(item.id),globalLanguage:language,globalTranslationPending:language==='hu'}:item)});
    try{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/language`,{language});const snapshot=await loadSessionsSnapshot();setSessionsState(snapshot);if(sessionId===currentSessionId)setState(await loadState([sessionId]));setRevision(x=>x+1);}
    catch(error){setSessionsState(previous);enqueue({kind:'error',title:'Session language change failed',message:error.message});throw error;}
  },[sessionsState,currentSessionId,loadSessionsSnapshot,loadState,enqueue]);

  const actions=useMemo(()=>({
    setSidebar,showModal:enqueue,acknowledge,refreshSessions,refreshSessionsSnapshot,refreshState,loadState,refreshHistory,loadHistory,refreshJobs,refreshCatalog,refreshSettings,refreshPrompts,retryBootstrap,
    switchSession:switchSessionOptimistic,switchSessionOptimistic,
    setSessionWatched:async(sessionId,watched)=>{if(watched)await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/watch`,{});else await deleteJSON(`/api/sessions/${encodeURIComponent(sessionId)}/watch`);await refreshSessionsSnapshot();setRevision(x=>x+1);},
    setSessionLanguage,
    cancelSessionLanguage:async sessionId=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/language/cancel`,{});await refreshSessionsSnapshot();setRevision(x=>x+1);},
    toggleTaskLanguage:async(sessionId,uid,viewLanguage)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/tasks/${encodeURIComponent(uid)}/language`,{language:viewLanguage==='hu'?'en':'hu'});setRevision(x=>x+1);await Promise.all([refreshJobs(),refreshCatalog()]);},
    cancelTask:async(sessionId,uid)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/tasks/${encodeURIComponent(uid)}/translation/cancel`);setRevision(x=>x+1);await Promise.all([refreshJobs(),refreshCatalog()]);},
    retryJob:async(sessionId,id)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}/retry`,{});await Promise.all([refreshJobs(),refreshCatalog()]);},
    cancelJob:async(sessionId,id)=>{await postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}/cancel`,{});await Promise.all([refreshJobs(),refreshCatalog()]);},
    deleteJob:async(sessionId,id)=>{await deleteJSON(`/api/sessions/${encodeURIComponent(sessionId)}/translations/${encodeURIComponent(id)}`);await Promise.all([refreshJobs(),refreshCatalog()]);setRevision(x=>x+1);},
  }),[enqueue,acknowledge,refreshSessions,refreshSessionsSnapshot,refreshState,loadState,refreshHistory,loadHistory,refreshJobs,refreshCatalog,refreshSettings,refreshPrompts,retryBootstrap,switchSessionOptimistic,setSessionLanguage]);
  return h(C.Provider,{value:{API_BASE,sessionsState,currentSessionId,currentSession,watchedSessions,state,history,jobs,translationCatalog,settings,prompts,live,sidebar,modal,revision,bootstrapStatus,bootstrapError,bootstrapPhase,...actions}},children);
}
