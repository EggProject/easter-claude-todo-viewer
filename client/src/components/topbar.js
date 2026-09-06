import React from 'react';
import {Link,NavLink} from 'react-router';
import {useApp} from '../app-context.js';
const h=React.createElement;
const items=[['/sessions','🧵','Sessions'],['/tasks','📋','Tasks'],['/flow','🔀','Flow'],['/translations','🌍','Translations'],['/prompts','🧠','Prompts'],['/settings','⚙️','Settings']];
export function Topbar(){
 const a=useApp(),currentSession=a.currentSession;
 const connection=a.live==='LIVE'?'connected':(a.live==='RECONNECTING'||a.live==='CONNECTING')?'reconnecting':'disconnected';
 const connectionLabel=connection==='connected'?'Connected to multi-session daemon':connection==='reconnecting'?'Reconnecting to multi-session daemon':'Disconnected from multi-session daemon';
 const tooltip=sessionTooltip(currentSession,a.sessionsState);
 return h('header',{className:'topbar'},
  h('div',{className:'brand'},h('span',{className:`connection-dot ${connection}`,title:connectionLabel,'aria-label':connectionLabel,role:'status'}),h('span',null,'🤖'),h('strong',null,'Claude Tasks'),h('span',{className:'version'},'v4.1.0')),
  currentSession?h(Link,{to:'/sessions',className:'session-button',title:tooltip},`🧵 ${currentSession.label||shortId(currentSession.id)} · ${shortId(currentSession.id)}`):h(Link,{to:'/sessions',className:'session-button'},'🧵 Select session'),
  h('div',{className:'spacer'}),
  h('nav',{className:'nav'},items.map(([to,icon,label])=>h(NavLink,{key:to,to,className:({isActive})=>'nav-link'+(isActive?' active':'')},`${icon} ${label}`))),
  h('button',{className:'icon-btn',onClick:()=>a.setSidebar(true),title:'Common change history'},'🔔'));
}
function shortId(x){x=String(x||'');return x.length>18?`${x.slice(0,8)}…${x.slice(-6)}`:x;}
function sessionTooltip(session,sessionsState){if(!session)return'No current session';return[`Session: ${session.id}`,`Project: ${session.cwd||'—'}`,`Branch: ${session.gitBranch||'—'}`,`Created: ${fmt(session.createdAt)}`,`Last activity: ${fmt(session.lastActivity)}`,`Session language: ${String(session.globalLanguage||'en').toUpperCase()}`,`Watched: ${sessionsState.watchedSessionIds.includes(session.id)?'Yes':'No'}`].join('\n');}
function fmt(v){try{return v?new Date(v).toLocaleString():'—';}catch{return String(v);}}
