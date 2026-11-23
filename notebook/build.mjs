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
const tableLines = ({headers, rows})=>[
  '| '+headers.map(markdownTable).join(' | ')+' |',
  '| '+headers.map(()=>'---').join(' | ')+' |',
  ...rows.map(row=>'| '+row.map(markdownTable).join(' | ')+' |'),
];
const renderTable = ({caption, headers, rows})=>`<div class="table-scroll"><table><caption>${h(caption)}</caption><thead><tr>${headers.map(label=>`<th scope="col">${h(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,...cells])=>`<tr><th scope="row">${h(label)}</th>${cells.map(cell=>`<td>${h(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const lines=['# '+notebook.title,'',notebook.subtitle,'','整理日期 '+notebook.updatedAt,'',notebook.description,''];
for(const s of notebook.sections){
  lines.push('## '+s.title,'',s.summary,'');
  for(const b of s.blocks){
    if(b.type==='p')lines.push(b.text,'');
    if(b.type==='quote')lines.push('> '+b.text,'');
    if(b.type==='list')lines.push(...b.items.map(x=>'- '+x),'');
    if(b.type==='steps') b.items.forEach(x=>lines.push('### '+x.title,'',x.text,''));
    if(b.type==='table')lines.push(...tableLines(b),'');
  }
  lines.push('资料位置 '+s.source,'');
}
lines.push('## 可选行动清单','',...notebook.actions.map(a=>'- [ ] '+a.title+' '+a.detail),'');
await writeFile(path.join(articleRoot,'notebook.md'),lines.join('\n'));

for(const note of learning){
  if(!/^[a-z0-9-]+$/.test(note.slug))throw Error('Invalid article slug');
  const entry=hub.notes.find(n=>n.url===`./notes/${note.slug}/`);
  const category=hub.categories.find(c=>c.noteIds.includes(entry?.id));
  if(!entry || !category)throw Error('笔记未归类 '+note.slug);
  const [year,month,day]=entry.date.split('-').map(Number);
  const noteRoot=path.join(dist,'notes',note.slug);await mkdir(noteRoot,{recursive:true});
  const sections=note.sections.map((s,i)=>`<section id="s${i+1}"><h2>${h(s.heading)}</h2>${(s.paragraphs||[]).map(p=>`<p>${h(p)}</p>`).join('')}${s.bullets?.length?'<ul>'+s.bullets.map(b=>`<li>${h(b)}</li>`).join('')+'</ul>':''}${s.table?renderTable(s.table):''}${s.code?`<pre><code>${h(s.code)}</code></pre>`:''}</section>`).join('\n');
  const sources=(note.sourceDocs||[]).filter(x=>/^https:\/\//.test(x.url));
  const materials=note.sourceMaterials||[];
  const references=[
    ...sources.map(s=>`<li><a href="${h(s.url)}" target="_blank" rel="noopener noreferrer">${h(s.title)}</a></li>`),
    ...materials.map(s=>`<li>${h(s)}</li>`),
  ];
  let notebookAppendix='';
  if(note.notebookFile){
    const cells=await readFile(path.join(root,'content','notebook-exports',note.slug+'.html'),'utf8');
    notebookAppendix=`<section id="notebook" class="notebook"><div class="notebook-heading"><h2>完整 Notebook</h2><a href="./${h(note.notebookFile)}" download>下载 .ipynb</a></div>${cells}</section>`;
  }
  const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(note.title)} · 六边形的学习笔记</title><meta name="description" content="${h(note.summary)}"><link rel="stylesheet" href="../../note-reader.css"></head><body><header><a class="brand" href="../../">⬡ 六边形的学习笔记</a><a href="../../modules/${h(category.id)}/">返回${h(category.entryLabel)}</a></header><main><div class="breadcrumb">${h(category.entryLabel)} <span>/</span> 学习笔记</div><h1>${h(note.title)}</h1><p class="summary">${h(note.summary)}</p><p class="meta">整理于 ${year} 年 ${month} 月 ${day} 日</p><nav class="toc" aria-label="文章目录">${note.sections.map((s,i)=>`<a href="#s${i+1}">${h(s.heading)}</a>`).join('')}${notebookAppendix?'<a href="#notebook">完整 Notebook</a>':''}</nav><article>${sections}${notebookAppendix}</article>${references.length?`<section class="references"><h2>查阅文档</h2><ul>${references.join('')}</ul></section>`:''}<footer><a href="../../">返回六边形首页 →</a></footer></main></body></html>`;
  await writeFile(path.join(noteRoot,'index.html'),html);
  const md=['# '+note.title,'',note.summary,'','整理日期 '+entry.date,''];
  for(const s of note.sections){
    md.push('## '+s.heading,'',...(s.paragraphs||[]).flatMap(p=>[p,'']),...(s.bullets||[]).map(b=>'- '+b),'');
    if(s.table)md.push(...tableLines(s.table),'');
    if(s.code)md.push('```',s.code,'```','');
  }
  if(note.notebookFile)md.push('## 完整 Notebook','','[下载 '+note.notebookFile+'](./'+note.notebookFile+')','');
  if(references.length)md.push('## 查阅文档','',...sources.map(s=>'- ['+s.title+']('+s.url+')'),...materials.map(s=>'- '+s),'');
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
console.log(`已生成 1 版首页、${hub.categories.length} 个模块、求职笔记 ${notebook.sections.length} 章和其他学习笔记 ${learning.length} 篇`);
