import React from 'react';
import {Link,NavLink} from 'react-router';
import {useApp} from '../app-context.js';
const h=React.createElement;
const items=[['/sessions','🧵','Sessions'],['/tasks','📋','Tasks'],['/flow','🔀','Flow'],['/translations','🌍','Translations'],['/prompts','🧠','Prompts'],['/settings','⚙️','Settings']];
export function Topbar(){
 const a=useApp(),s=a.state,currentSession=a.currentSession,pending=!!s?.globalTranslationPending;
 const connection=a.live==='LIVE'?'connected':(a.live==='RECONNECTING'||a.live==='CONNECTING')?'reconnecting':'disconnected';
 const connectionLabel=connection==='connected'?'Connected to multi-session daemon':connection==='reconnecting'?'Reconnecting to multi-session daemon':'Disconnected from multi-session daemon';
 const tooltip=sessionTooltip(currentSession,s,a.sessionsState);
 return h('header',{className:'topbar'},
  h('div',{className:'brand'},h('span',{className:`connection-dot ${connection}`,title:connectionLabel,'aria-label':connectionLabel,role:'status'}),h('span',null,'🤖'),h('strong',null,'Claude Tasks'),h('span',{className:'version'},s?.version?`v${s.version}`:'v4.0.0')),
  currentSession?h(Link,{to:'/sessions',className:'session-button',title:tooltip},`🧵 ${currentSession.label||shortId(currentSession.id)} · ${shortId(currentSession.id)}`):h(Link,{to:'/sessions',className:'session-button'},'🧵 Select session'),
  h('nav',{className:'nav'},items.map(([to,icon,label])=>h(NavLink,{key:to,to,className:({isActive})=>'nav-link'+(isActive?' active':'')},`${icon} ${label}`))),h('div',{className:'spacer'}),
  currentSession&&h('div',{className:'lang-control'},h('span',null,'EN'),pending?h('span',{className:'lang-progress'},h('span',{className:'spinner'}),h('button',{className:'mini danger',onClick:a.cancelGlobal},'■ Stop')):h('button',{className:'switch '+(s?.globalLanguage==='hu'?'on':''),onClick:a.toggleGlobalLanguage,role:'switch','aria-checked':s?.globalLanguage==='hu'},h('span')),h('span',null,'HU')),
  h('button',{className:'icon-btn',onClick:()=>a.setSidebar(true),title:'Common change history'},'🔔'));
}
function shortId(x){x=String(x||'');return x.length>18?`${x.slice(0,8)}…${x.slice(-6)}`:x;}
function sessionTooltip(session,state,sessionsState){if(!session)return'No current session';return[`Session: ${session.id}`,`Project: ${session.cwd||'—'}`,`Branch: ${session.gitBranch||'—'}`,`Created: ${fmt(session.createdAt)}`,`Last activity: ${fmt(session.lastActivity)}`,`Global language: ${String(state?.globalLanguage||session.globalLanguage||'en').toUpperCase()}`,`Watched: ${sessionsState.watchedSessionIds.includes(session.id)?'Yes':'No'}`].join('\n');}
function fmt(v){try{return v?new Date(v).toLocaleString():'—';}catch{return String(v||'—');}}
