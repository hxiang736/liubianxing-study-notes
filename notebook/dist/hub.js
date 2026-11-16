(() => {
  'use strict';
  const data = window.HUB_DATA;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n; };
  if(!data?.categories?.length){$('knowledgeMap').textContent='能力地图暂时没有加载成功，请刷新页面。';return;}
  const notes=data.notes||[];
  const categories=data.categories;
  const positions=[{x:50,y:100*80/560},{x:100*523.205/700,y:100*180/560},{x:100*523.205/700,y:100*380/560},{x:50,y:100*480/560},{x:100*176.795/700,y:100*380/560},{x:100*176.795/700,y:100*180/560}];
  $('brandTitle').textContent=data.siteTitle;
  $('pageTitle').textContent=data.siteTitle;
  document.title=data.siteTitle;
  document.body.dataset.theme='paper';
  categories.forEach((c,i)=>{
    const href='./modules/'+encodeURIComponent(c.id)+'/';
    const link=el('a','hex-node');link.href=href;link.dataset.position=i;
    link.style.setProperty('--x',positions[i].x+'%');link.style.setProperty('--y',positions[i].y+'%');
    link.setAttribute('aria-label','进入'+c.name+'模块，'+c.entryLabel);
    const label=el('span','vertex-label');label.append(el('strong','',c.name),el('small','',c.entryLabel));
    link.append(el('span','vertex-shape',String(i+1).padStart(2,'0')),label);$('hexNodes').append(link);
    const mobile=el('a','mobile-direction');mobile.href=href;
    const copy=el('span','mobile-copy');copy.append(el('strong','',c.name),el('small','',c.entryLabel));
    mobile.append(el('span','',String(i+1).padStart(2,'0')),copy,el('span','mobile-arrow','↗'));$('mobileDirections').append(mobile);
  });
  let search='';
  const sorted=[...notes].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.title).localeCompare(String(b.title),'zh-CN'));
  function mark(parent,text,query){
    const value=String(text||'');if(!query){parent.textContent=value;return;}
    const lower=value.toLocaleLowerCase(),term=query.toLocaleLowerCase();let from=0,at;
    while((at=lower.indexOf(term,from))!==-1){parent.append(document.createTextNode(value.slice(from,at)),el('mark','',value.slice(at,at+term.length)));from=at+term.length;}
    parent.append(document.createTextNode(value.slice(from)));
  }
  function render(){
    $('noteList').replaceChildren();
    const found=sorted.filter(n=>[n.title,n.summary,...(n.tags||[])].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    $('searchStatus').textContent=search?'「'+search+'」 · '+found.length+' 条结果':'全部 '+notes.length+' 篇笔记';
    $('resetLibrary').hidden=!search;
    found.forEach(n=>{
      const a=el('a','note-row');a.href=n.url;if(n.external){a.target='_blank';a.rel='noopener noreferrer';}
      const copy=el('div','note-copy'),h=el('h3');mark(h,n.title,search);copy.append(h);
      const tags=el('div','note-tags');for(const tag of n.tags||[]){const t=el('span','note-tag');mark(t,tag,search);tags.append(t);}copy.append(tags);
      const date=el('time','note-date',n.date);date.dateTime=n.date;a.append(date,copy,el('span','note-arrow','↗'));$('noteList').append(a);
    });
    if(!found.length)$('noteList').append(el('p','empty-library','没有找到相关笔记。换一个关键词，或回到全部笔记。'));
  }
  $('totalNoteCount').textContent=notes.length+' 篇';
  $('noteSearch').addEventListener('input',e=>{search=e.target.value.trim();render();});
  function clear(){search='';$('noteSearch').value='';render();}
  $('resetLibrary').addEventListener('click',clear);$('headerAllNotes').addEventListener('click',clear);
  $('noteSearch').addEventListener('keydown',e=>{if(e.key==='Escape')clear();});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();$('noteSearch').focus();}});
  render();
  // Previous chapter links continue to reach the relocated sharing note.
  const old=['overview','journey','roles','directions','skills','choose','internship','resume','interview','practice','takeaways','sources','actions','updates'];
  if(old.includes(location.hash.slice(1)))location.replace('./notes/ai-product-career/'+location.hash);
})();
