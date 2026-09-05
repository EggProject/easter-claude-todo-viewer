import React,{Suspense,lazy}from'react';
import{BrowserRouter,Navigate,Route,Routes,useParams}from'react-router';
import{Topbar}from'./components/topbar.js';import{NotificationSidebar,RequiredModal}from'./components/overlays.js';
const h=React.createElement;
const Sessions=lazy(()=>import('./pages/sessions.js')),Tasks=lazy(()=>import('./pages/tasks.js')),Flow=lazy(()=>import('./pages/flow.js')),Translations=lazy(()=>import('./pages/translations.js')),Prompts=lazy(()=>import('./pages/prompts.js')),Settings=lazy(()=>import('./pages/settings.js'));
function Shell({children}){return h(React.Fragment,null,h(Topbar),h('main',{className:'shell'},h(Suspense,{fallback:h('div',{className:'boot'},'✨ Loading page…')},children)),h(NotificationSidebar),h(RequiredModal))}
const page=C=>h(Shell,null,h(C));
function ExecutionRedirect(){const{uid}=useParams();return h(Navigate,{to:uid?`/flow/${encodeURIComponent(uid)}`:'/flow',replace:true})}
export default function Router(){return h(BrowserRouter,null,h(Routes,null,
 h(Route,{path:'/',element:h(Navigate,{to:'/sessions',replace:true})}),
 h(Route,{path:'/sessions',element:page(Sessions)}),
 h(Route,{path:'/tasks',element:page(Tasks)}),h(Route,{path:'/tasks/:sessionId/:uid',element:page(Tasks)}),h(Route,{path:'/tasks/:uid',element:page(Tasks)}),
 h(Route,{path:'/execution',element:h(ExecutionRedirect)}),h(Route,{path:'/execution/:uid',element:h(ExecutionRedirect)}),
 h(Route,{path:'/flow',element:page(Flow)}),h(Route,{path:'/flow/:sessionId/:uid',element:page(Flow)}),h(Route,{path:'/flow/:uid',element:page(Flow)}),
 h(Route,{path:'/translations',element:page(Translations)}),h(Route,{path:'/translations/:sessionId/:jobId',element:page(Translations)}),h(Route,{path:'/translations/:jobId',element:page(Translations)}),
 h(Route,{path:'/prompts',element:page(Prompts)}),h(Route,{path:'/prompts/:promptId',element:page(Prompts)}),
 h(Route,{path:'/settings',element:page(Settings)}),
 h(Route,{path:'*',element:h(Navigate,{to:'/tasks',replace:true})})
))}
