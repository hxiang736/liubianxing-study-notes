import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root,'dist');
const articleRoot = path.join(dist,'notes','ai-product-career');
const notebook = JSON.parse(await readFile(path.join(root,'content/notebook.json'),'utf8'));
const hub = JSON.parse(await readFile(path.join(root,'content/hub.json'),'utf8'));
const learning = JSON.parse(await readFile(path.join(root,'content/learning-notes.json'),'utf8'));
if (hub.categories.length !== 6 || new Set(hub.categories.map(c=>c.id)).size!==6) throw Error('首页需要六个不同的能力方向');
const knownNotes=new Set(hub.notes.map(n=>n.id));
for(const c of hub.categories) for(const id of c.noteIds) if(!knownNotes.has(id)) throw Error('分类引用了未知笔记 '+id);
await mkdir(articleRoot,{recursive:true});
await writeFile(path.join(articleRoot,'notes.js'),'window.NOTEBOOK = '+JSON.stringify(notebook,null,2)+';\n');
await writeFile(path.join(dist,'hub-data.js'),'window.HUB_DATA = '+JSON.stringify(hub,null,2)+';\n');

const h = s => String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const markdownTable = s=>String(s).replaceAll('|','\\|').replaceAll('\n','<br>');
const lines=['# '+notebook.title,'',notebook.subtitle,'','整理日期 '+notebook.updatedAt,'',notebook.description,''];
for(const s of notebook.sections){
  lines.push('## '+s.title,'',s.summary,'');
  for(const b of s.blocks){
    if(b.type==='p')lines.push(b.text,'');
    if(b.type==='quote')lines.push('> '+b.text,'');
    if(b.type==='list')lines.push(...b.items.map(x=>'- '+x),'');
    if(b.type==='steps') b.items.forEach(x=>lines.push('### '+x.title,'',x.text,''));
    if(b.type==='table')lines.push('| '+b.headers.map(markdownTable).join(' | ')+' |','| '+b.headers.map(()=>'---').join(' | ')+' |',...b.rows.map(row=>'| '+row.map(markdownTable).join(' | ')+' |'),'');
  }
  lines.push('资料位置 '+s.source,'');
}
lines.push('## 可选行动清单','',...notebook.actions.map(a=>'- [ ] '+a.title+' '+a.detail),'');
await writeFile(path.join(articleRoot,'notebook.md'),lines.join('\n'));

for(const note of learning){
  if(!/^[a-z0-9-]+$/.test(note.slug))throw Error('Invalid article slug');
  const noteRoot=path.join(dist,'notes',note.slug);await mkdir(noteRoot,{recursive:true});
  const sections=note.sections.map((s,i)=>`<section id="s${i+1}"><h2>${h(s.heading)}</h2>${(s.paragraphs||[]).map(p=>`<p>${h(p)}</p>`).join('')}${s.bullets?.length?'<ul>'+s.bullets.map(b=>`<li>${h(b)}</li>`).join('')+'</ul>':''}${s.code?`<pre><code>${h(s.code)}</code></pre>`:''}</section>`).join('\n');
  const sources=(note.sourceDocs||[]).filter(x=>/^https:\/\//.test(x.url));
  const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(note.title)} · 六边形的学习笔记</title><meta name="description" content="${h(note.summary)}"><link rel="stylesheet" href="../../note-reader.css"></head><body><header><a class="brand" href="../../">⬡ 六边形的学习笔记</a><a href="../../modules/data-analysis/">返回数据分析</a></header><main><div class="breadcrumb">数据分析 <span>/</span> 学习笔记</div><h1>${h(note.title)}</h1><p class="summary">${h(note.summary)}</p><p class="meta">整理于 2026 年 11 月 16 日</p><nav class="toc" aria-label="文章目录">${note.sections.map((s,i)=>`<a href="#s${i+1}">${h(s.heading)}</a>`).join('')}</nav><article>${sections}</article>${sources.length?`<section class="references"><h2>查阅文档</h2><ul>${sources.map(s=>`<li><a href="${h(s.url)}" target="_blank" rel="noopener noreferrer">${h(s.title)}</a></li>`).join('')}</ul></section>`:''}<footer><a href="../../">返回六边形首页 →</a></footer></main></body></html>`;
  await writeFile(path.join(noteRoot,'index.html'),html);
  const md=['# '+note.title,'',note.summary,'','整理日期 2026-11-16',''];
  for(const s of note.sections){md.push('## '+s.heading,'',...(s.paragraphs||[]).flatMap(p=>[p,'']),...(s.bullets||[]).map(b=>'- '+b),'');if(s.code)md.push('```',s.code,'```','');}
  if(sources.length)md.push('## 查阅文档','',...sources.map(s=>'- ['+s.title+']('+s.url+')'),'');
  await writeFile(path.join(noteRoot,'note.md'),md.join('\n'));
}
for(const category of hub.categories){
  const moduleRoot=path.join(dist,'modules',category.id);await mkdir(moduleRoot,{recursive:true});
  const included=category.noteIds.map(id=>hub.notes.find(n=>n.id===id)).filter(Boolean);
  const cards=included.map(n=>{const href=n.external?n.url:'../../'+n.url.replace(/^\.\//,'');return `<a class="module-note" href="${h(href)}" ${n.external?'target="_blank" rel="noopener noreferrer"':''}><span class="meta">${h(n.date)}${n.external?' · 原仓库笔记':''}</span><h2>${h(n.title)}</h2><span class="read-more">↗</span></a>`;}).join('');
  const empty=`<div class="module-empty"><p>暂无笔记</p></div>`;
  const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(category.name)} · 六边形的学习笔记</title><meta name="description" content="${h(category.description)}"><link rel="stylesheet" href="../../note-reader.css"></head><body><header><a class="brand" href="../../">⬡ 六边形的学习笔记</a><a href="../../">返回能力地图</a></header><main><div class="breadcrumb"><a href="../../">首页</a><span>/</span> ${h(category.name)}</div><h1>${h(category.name)}</h1><div class="module-entry"><strong>${h(category.entryLabel)}</strong></div><h2 class="module-list-heading">${included.length?'笔记 '+included.length+' 篇':'笔记'}</h2><div>${included.length?cards:empty}</div><nav class="module-nav" aria-label="其他能力模块">${hub.categories.filter(c=>c.id!==category.id).map(c=>`<a href="../${h(c.id)}/">${h(c.name)} ↗</a>`).join('')}</nav><footer><a href="../../">← 返回六边形首页</a></footer></main></body></html>`;
  await writeFile(path.join(moduleRoot,'index.html'),html);
}
console.log(`已生成 1 版首页、${hub.categories.length} 个模块、求职笔记 ${notebook.sections.length} 章、数据分析笔记 ${learning.length} 篇`);
