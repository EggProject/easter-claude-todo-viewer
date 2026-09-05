import React,{Suspense}from'react';
import{createRoot}from'react-dom/client';
import Router from'./router.js';
import{AppProvider,useApp}from'./app-context.js';
import{AppSplash}from'./components/app-splash.js';
const h=React.createElement;
function BootstrapGate(){const app=useApp();if(app.bootstrapStatus==='error')return h(AppSplash,{error:app.bootstrapError,onRetry:app.retryBootstrap});if(app.bootstrapStatus!=='ready')return h(AppSplash,{phase:app.bootstrapPhase});return h(Suspense,{fallback:h(AppSplash,{phase:'Loading interface'})},h(Router));}
createRoot(document.getElementById('root')).render(h(AppProvider,null,h(BootstrapGate)));
