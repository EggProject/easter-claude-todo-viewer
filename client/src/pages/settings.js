import React,{useEffect,useState}from'react';
import{useApp}from'../app-context.js';
import{getJSON,postJSON}from'../api.js';
const h=React.createElement;

export default function SettingsPage(){
  const a=useApp(),[form,setForm]=useState(null),[models,setModels]=useState([]),[msg,setMsg]=useState(''),[loadingModels,setLoadingModels]=useState(false);
  useEffect(()=>{if(a.settings)setForm(structuredClone(a.settings))},[a.settings]);
  const provider = form?.translation?.provider;
  useEffect(()=>{
    if(provider!=='anthropic')return;
    let alive=true;setLoadingModels(true);
    getJSON('/api/providers/anthropic/models').then(d=>{if(alive)setModels(d.models||[])}).catch(()=>{}).finally(()=>{if(alive)setLoadingModels(false)});
    return()=>{alive=false};
  },[provider]);
  if(!form)return h('div',{className:'page'},'Loading settings…');
  const tr=form.translation||{},anth=tr.anthropic||{},agy=tr.agy||{};
  const set=(path,val)=>setForm(f=>{const n=structuredClone(f);let o=n;for(let i=0;i<path.length-1;i++)o=o[path[i]]??={};o[path.at(-1)]=val;return n});
  const discover=async(labelText='model(s) discovered')=>{setLoadingModels(true);try{const d=await postJSON('/api/providers/anthropic/test',{baseUrl:anth.baseUrl,apiKey:anth.apiKey||'',model:anth.model});setModels(d.models||[]);setMsg(`✅ ${d.models?.length||0} ${labelText}`);return d}catch(e){setMsg('❌ '+e.message);throw e}finally{setLoadingModels(false)}};
  const refresh=()=>discover('model(s) discovered').catch(()=>{});
  const test=async()=>{try{const d=await discover('model(s) discovered');setMsg(`✅ Connection OK · ${d.count} model(s)`)}catch{}};
  const save=async()=>{try{
    const payload={translation:{provider:tr.provider,agy:{model:agy.model,maxConcurrency:Number(agy.maxConcurrency||2)},anthropic:{baseUrl:anth.baseUrl,model:anth.model,maxConcurrency:Number(anth.maxConcurrency||2)}},prompts:{autoMigrate:form.prompts?.autoMigrate!==false}};
    if(anth.apiKey)payload.translation.anthropic.apiKey=anth.apiKey;
    const d=await postJSON('/api/settings',payload);setForm(d);setMsg('✅ Settings saved');await a.refreshSettings();
  }catch(e){setMsg('❌ '+e.message)}};
  const modelOptions=[...models];if(anth.model&&!modelOptions.some(m=>m.id===anth.model))modelOptions.unshift({id:anth.model,label:`${anth.model} · configured`});
  return h('div',{className:'page settings-page'},
    h('div',{className:'page-heading'},h('div',null,h('div',{className:'eyebrow'},'⚙️ SETTINGS'),h('h1',null,'Configuration'))),
    h('div',{className:'settings-grid'},
      h('section',{className:'settings-card provider-card'},
        h('div',{className:'settings-card-head'},h('div',null,h('div',{className:'eyebrow'},'🌍 TRANSLATION'),h('h2',null,'Translation provider')),h('span',{className:'settings-card-icon'},'🔌')),
        label('Provider',h('select',{value:tr.provider||'agy',onChange:e=>set(['translation','provider'],e.target.value)},h('option',{value:'agy'},'Antigravity CLI (agy)'),h('option',{value:'anthropic'},'Anthropic-compatible API'))),
        tr.provider!=='anthropic'
          ?h(React.Fragment,null,
            label('Model',h('select',{value:agy.model||'',onChange:e=>set(['translation','agy','model'],e.target.value)},(form.agyModels||[]).map(m=>h('option',{value:m.slug,key:m.slug},m.label)))),
            concurrencySetting(agy.maxConcurrency,value=>set(['translation','agy','maxConcurrency'],value)))
          :h(React.Fragment,null,
            label('Base URL',h('input',{value:anth.baseUrl||'http://127.0.0.1:8000',onChange:e=>set(['translation','anthropic','baseUrl'],e.target.value)})),
            label('API key',h('input',{type:'password',placeholder:anth.apiKeyConfigured?'Configured — enter only to replace':'Optional',value:anth.apiKey||'',onChange:e=>set(['translation','anthropic','apiKey'],e.target.value)})),
            label('Model',h('select',{value:anth.model||'',disabled:loadingModels,onChange:e=>set(['translation','anthropic','model'],e.target.value)},h('option',{value:''},loadingModels?'Loading models…':'Select model…'),modelOptions.map(m=>h('option',{value:m.id,key:m.id},m.label||m.id)))),
            concurrencySetting(anth.maxConcurrency,value=>set(['translation','anthropic','maxConcurrency'],value)),
            h('div',{className:'actions'},h('button',{className:'mini',disabled:loadingModels,onClick:refresh},loadingModels?'⟳ Loading…':'↻ Refresh models'),h('button',{className:'mini',disabled:loadingModels,onClick:test},'🧪 Test connection'))),
        h('div',{className:'card-actions'},h('button',{className:'primary',onClick:save},'💾 Save provider settings'))),
      h('section',{className:'settings-card prompts-card'},
        h('div',{className:'settings-card-head'},h('div',null,h('div',{className:'eyebrow'},'🧠 PROMPTS'),h('h2',null,'Prompt management')),h('span',{className:'settings-card-icon'},'📝')),
        label('Automatically migrate built-in prompt updates',h('input',{type:'checkbox',checked:form.prompts?.autoMigrate!==false,onChange:e=>set(['prompts','autoMigrate'],e.target.checked)})),
        h('p',{className:'muted'},'Custom prompts are backed up and three-way merged. Conflicts never overwrite the active prompt.'),
        h('div',{className:'card-actions'},h('button',{className:'primary',onClick:save},'💾 Save prompt settings')))),
    msg&&h('div',{className:'info'},msg));
}
function concurrencySetting(value,onChange){return h('div',{className:'setting-stack'},label('Maximum concurrent jobs',h('input',{type:'number',min:1,max:32,step:1,value:Number(value||2),onChange:e=>onChange(Math.max(1,Math.min(32,Number(e.target.value||1))))})),h('p',{className:'setting-help'},'Maximum number of task translation lifecycles that may execute simultaneously on this provider. Queued jobs are not discarded.'))}
function label(text,control){return h('label',{className:'setting-row'},h('span',null,text),control)}
