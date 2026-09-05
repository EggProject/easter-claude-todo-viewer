import React from'react';import{createRoot}from'react-dom/client';import Router from'./router.js';import{AppProvider}from'./app-context.js';
const h=React.createElement;createRoot(document.getElementById('root')).render(h(AppProvider,null,h(Router)));
