/* Source content lives in notes.js. Reading preferences and checklist ticks are device-local. */
(() => {
  'use strict';
  const notebook = window.NOTEBOOK;
  const $ = id => document.getElementById(id);
  if (!notebook || !Array.isArray(notebook.sections)) {
    $('notesContent').textContent = '笔记内容暂时没有加载成功，请刷新页面。';
    return;
  }
  const sections = notebook.sections;
  const actions = Array.isArray(notebook.actions) ? notebook.actions : [];
  const updates = Array.isArray(notebook.updates) ? notebook.updates : [];
  const storageKey = 'zhixing-ai-notes-actions-v1';
  const fontKey = 'zhixing-ai-notes-font-v1';
  let completed = {};
  let fontSize = 0;
  let view = 'notes';
  let searchQuery = '';
  let observer;
  let toastTimer;
  try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) completed = value; } catch (_) {}
  try { fontSize = Math.max(0, Math.min(2, Number(localStorage.getItem(fontKey)) || 0)); } catch (_) {}

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text ?? '');
    return node;
  }
  function wordsOf(section) {
    return [section.title, section.category, section.summary, ...(section.blocks || []).flatMap(block => {
      if (block.type === 'table') return [...(block.headers || []), ...(block.rows || []).flat()];
      if (block.type === 'list') return block.items || [];
      if (block.type === 'steps') return (block.items || []).flatMap(item => [item.title, item.text]);
      return [block.text];
    })].filter(Boolean).join('\n');
  }
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2700);
  }
  function setMenu(open) {
    $('sidebar').classList.toggle('open', open);
    $('menuBackdrop').hidden = !open;
    $('menuToggle').setAttribute('aria-expanded', String(open));
    $('menuToggle').setAttribute('aria-label', open ? '关闭目录' : '打开目录');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function updateHash(hash) {
    try { history.replaceState(null, '', hash ? '#' + encodeURIComponent(hash) : location.pathname + location.search); } catch (_) {}
  }
  function activateChapter(id) {
    document.querySelectorAll('.chapter-link').forEach(link => {
      const active = link.dataset.section === id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function changeView(next, {scroll = false, hash = true} = {}) {
    view = next;
    document.querySelectorAll('.view-tab').forEach(tab => {
      const selected = tab.dataset.view === next;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    for (const name of ['notes', 'actions', 'updates']) $('view-' + name).hidden = name !== next || !!searchQuery;
    if (next !== 'notes') activateChapter('');
    else if (!document.querySelector('.chapter-link.active') && sections.length) activateChapter(sections[0].id);
    if (hash) updateHash(next === 'notes' ? '' : next);
    if (scroll) $('main').scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  function clearSearch() {
    searchQuery = '';
    $('searchInput').value = '';
    $('searchResults').hidden = true;
    changeView(view, {hash: false});
  }
  function goToSection(id) {
    clearSearch();
    changeView('notes', {hash: false});
    setMenu(false);
    activateChapter(id);
    const target = $(id);
    if (target) requestAnimationFrame(() => target.scrollIntoView({behavior: 'smooth', block: 'start'}));
    updateHash(id);
  }

  document.title = notebook.title || '六边形的学习笔记';
  $('notebookTitle').textContent = notebook.title || '六边形的学习笔记';
  $('notebookSubtitle').textContent = notebook.subtitle || '';
  $('notebookDescription').textContent = notebook.description || '';
  $('updatedLabel').textContent = '最近整理 ' + (notebook.updatedAt || '');
  const count = sections.reduce((n, section) => n + wordsOf(section).replace(/\s/g, '').length, 0);
  $('readingTime').textContent = '约 ' + Math.max(1, Math.ceil(count / 400)) + ' 分钟阅读';
  $('chapterCount').textContent = String(sections.length).padStart(2, '0') + ' CHAPTERS';
  $('sectionBadge').textContent = sections.length;
  $('actionBadge').textContent = actions.length;

  sections.forEach((section, index) => {
    const link = el('a', 'chapter-link');
    link.href = '#' + encodeURIComponent(section.id);
    link.dataset.section = section.id;
    link.append(el('span', 'chapter-number', String(index + 1).padStart(2, '0')), el('span', '', section.title));
    link.addEventListener('click', event => { event.preventDefault(); goToSection(section.id); });
    $('chapterNav').append(link);
  });

  const categories = [...new Set(sections.map(section => section.category).filter(Boolean))];
  const mainCategories = categories.filter(category => !/精华|资料记录/.test(category));
  const featuredCategories = (mainCategories.length ? mainCategories : categories).slice(0, 4);
  featuredCategories.forEach((category, index) => {
    const button = el('a', 'category-item');
    const target = sections.find(section => section.category === category);
    button.href = '#' + encodeURIComponent(target.id);
    button.append(el('span', 'category-icon', ['01', '02', '03', '04'][index]));
    const copy = el('span');
    copy.append(el('strong', '', category), el('small', '', sections.filter(section => section.category === category).length + ' 篇章节 · 点击阅读'));
    button.append(copy);
    button.addEventListener('click', event => { event.preventDefault(); goToSection(target.id); });
    $('categoryOverview').append(button);
  });
  if (!categories.length) $('categoryOverview').hidden = true;

  function renderBlock(block, parent) {
    if (block.type === 'p') { parent.append(el('p', '', block.text)); return; }
    if (block.type === 'quote') { parent.append(el('blockquote', 'note-quote', block.text)); return; }
    if (block.type === 'list') {
      const list = el('ul');
      (block.items || []).forEach(item => list.append(el('li', '', item)));
      parent.append(list); return;
    }
    if (block.type === 'table') {
      const wrap = el('div', 'table-wrap');
      wrap.tabIndex = 0;
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', (block.headers || []).join('、') + ' 对照表，可横向滚动');
      const table = el('table', 'note-table');
      const head = el('thead');
      const tr = el('tr');
      (block.headers || []).forEach(text => { const th = el('th', '', text); th.scope = 'col'; tr.append(th); });
      head.append(tr); table.append(head);
      const body = el('tbody');
      (block.rows || []).forEach(row => { const r = el('tr'); row.forEach(text => r.append(el('td', '', text))); body.append(r); });
      table.append(body); wrap.append(table); parent.append(wrap); return;
    }
    if (block.type === 'steps') {
      const list = el('ol', 'step-list');
      (block.items || []).forEach((item, index) => {
        const li = el('li');
        const step = el('span', 'step-number', String(index + 1).padStart(2, '0'));
        step.setAttribute('aria-hidden', 'true');
        const copy = el('div', 'step-copy');
        copy.append(el('h3', '', item.title), el('p', '', item.text)); li.append(step, copy); list.append(li);
      });
      parent.append(list); return;
    }
    if (typeof block.text === 'string') parent.append(el('p', '', block.text));
  }
  sections.forEach((section, index) => {
    const article = el('section', 'note-section');
    article.id = section.id;
    article.setAttribute('aria-labelledby', section.id + '-heading');
    const heading = el('div', 'section-heading');
    heading.append(el('span', 'section-index', String(index + 1).padStart(2, '0')));
    const group = el('div', 'section-title-group');
    group.append(el('span', 'section-category', section.category || '分享会笔记'));
    const h2 = el('h2', '', section.title); h2.id = section.id + '-heading'; group.append(h2); heading.append(group); article.append(heading);
    if (section.summary) article.append(el('p', 'section-summary', section.summary));
    const prose = el('div', 'prose');
    (section.blocks || []).forEach(block => renderBlock(block, prose));
    article.append(prose);
    if (section.source) { const source = el('p', 'source-label'); source.append(el('span', '', '资料位置'), document.createTextNode(String(section.source))); article.append(source); }
    $('notesContent').append(article);
  });

  function saveActions() {
    try { localStorage.setItem(storageKey, JSON.stringify(completed)); return true; }
    catch (_) { toast('浏览器未允许保存，当前勾选仅在本次打开期间有效。'); return false; }
  }
  function renderProgress() {
    const checked = actions.filter(action => completed[action.id]).length;
    const percent = actions.length ? Math.round(checked / actions.length * 100) : 0;
    $('progressText').textContent = '已完成 ' + checked + ' / ' + actions.length + ' 项';
    $('progressPercentage').textContent = percent + '%';
    $('progressFill').style.width = percent + '%';
    $('actionProgress').setAttribute('aria-valuenow', String(percent));
    $('resetActions').disabled = !checked;
  }
  actions.forEach(action => {
    const label = el('label', 'action-card');
    const input = el('input'); input.type = 'checkbox'; input.checked = !!completed[action.id]; input.dataset.action = action.id;
    label.classList.toggle('completed', input.checked);
    const copy = el('span', 'action-copy'); copy.append(el('strong', '', action.title));
    if (action.detail) copy.append(el('small', '', action.detail));
    label.append(input, copy);
    input.addEventListener('change', () => { completed[action.id] = input.checked; label.classList.toggle('completed', input.checked); saveActions(); renderProgress(); });
    $('actionList').append(label);
  });
  if (!actions.length) $('actionList').append(el('p', 'muted', '后续行动会整理在这里。'));
  renderProgress();
  $('resetActions').addEventListener('click', () => {
    completed = {}; saveActions();
    document.querySelectorAll('[data-action]').forEach(input => { input.checked = false; input.closest('.action-card').classList.remove('completed'); });
    renderProgress(); toast('已重置当前浏览器的勾选。');
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    try { const data = JSON.parse(event.newValue || '{}'); completed = data && typeof data === 'object' && !Array.isArray(data) ? data : {}; } catch (_) { return; }
    document.querySelectorAll('[data-action]').forEach(input => { input.checked = !!completed[input.dataset.action]; input.closest('.action-card').classList.toggle('completed', input.checked); });
    renderProgress();
  });

  updates.forEach(update => {
    const li = el('li', 'update-item'); const date = el('time', '', update.date); date.dateTime = update.date;
    li.append(date, el('p', '', update.text)); $('updateList').append(li);
  });
  if (!updates.length) $('updateList').append(el('li', 'muted', '还没有更新记录。'));

  const searchIndex = [
    ...sections.map(section => ({type: 'notes', id: section.id, title: section.title, category: section.category || '分享会笔记', text: wordsOf(section)})),
    ...actions.map(action => ({type: 'actions', id: action.id, title: action.title, category: '行动清单', text: [action.title, action.detail].join('\n')})),
    ...updates.map((update, i) => ({type: 'updates', id: 'update-' + i, title: update.date + ' 更新记录', category: '更新记录', text: update.text}))
  ];
  function highlight(node, text, query) {
    const content = String(text || '');
    const lower = content.toLocaleLowerCase();
    const term = query.toLocaleLowerCase();
    let cursor = 0; let position;
    if (!term) { node.textContent = content; return; }
    while ((position = lower.indexOf(term, cursor)) !== -1) {
      node.append(document.createTextNode(content.slice(cursor, position)), el('mark', '', content.slice(position, position + term.length)));
      cursor = position + term.length;
    }
    node.append(document.createTextNode(content.slice(cursor)));
  }
  function snippet(text, query) {
    const content = String(text || '').replace(/\n+/g, ' · ');
    const at = content.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    const start = Math.max(0, at - 35); const end = Math.min(content.length, start + 155);
    return (start ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
  }
  function search(value) {
    searchQuery = value.trim();
    if (!searchQuery) { clearSearch(); return; }
    for (const name of ['notes', 'actions', 'updates']) $('view-' + name).hidden = true;
    $('searchResults').hidden = false;
    $('resultList').replaceChildren();
    const matches = searchIndex.filter(item => (item.title + '\n' + item.text).toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()));
    $('searchTitle').textContent = '查找「' + searchQuery + '」';
    $('searchSummary').textContent = '在笔记、行动清单和更新记录中找到 ' + matches.length + ' 条结果。';
    matches.forEach(item => {
      const result = el('button', 'search-result'); result.type = 'button';
      result.append(el('span', 'result-meta', item.category + '  /  点击前往'));
      const title = el('span', 'result-title'); highlight(title, item.title, searchQuery);
      const desc = el('span', 'result-snippet'); highlight(desc, snippet(item.text, searchQuery), searchQuery);
      result.append(title, desc);
      result.addEventListener('click', () => {
        if (item.type === 'notes') goToSection(item.id);
        else {
          clearSearch(); changeView(item.type, {scroll: true}); setMenu(false);
          if (item.type === 'actions') { const input = [...document.querySelectorAll('[data-action]')].find(input => input.dataset.action === item.id); if (input) requestAnimationFrame(() => input.closest('.action-card').scrollIntoView({behavior: 'smooth', block: 'center'})); }
        }
      });
      $('resultList').append(result);
    });
    if (!matches.length) $('resultList').append(el('p', 'empty-search', '没有找到相关内容。试试「评测」「简历」或「实习」。'));
  }
  $('searchInput').addEventListener('input', event => search(event.target.value));
  $('searchInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') { setMenu(false); if (searchQuery) $('searchResults').scrollIntoView({behavior: 'smooth', block: 'start'}); }
  });
  $('clearSearch').addEventListener('click', clearSearch);
  document.addEventListener('keydown', event => {
    const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); if (matchMedia('(max-width:740px)').matches) setMenu(true); $('searchInput').focus(); }
    if (event.key === 'Escape') { if (searchQuery) clearSearch(); setMenu(false); }
  });
  document.querySelectorAll('.view-tab').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => { clearSearch(); changeView(tab.dataset.view); });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); tabs[next].focus(); clearSearch(); changeView(tabs[next].dataset.view); }
    });
  });
  $('goToActions').addEventListener('click', () => { clearSearch(); changeView('actions', {scroll: true}); });
  $('homeLink').addEventListener('click', event => { event.preventDefault(); location.href = '../../'; });
  $('menuToggle').addEventListener('click', () => setMenu(!$('sidebar').classList.contains('open')));
  $('menuBackdrop').addEventListener('click', () => setMenu(false));
  $('backToTop').addEventListener('click', event => { event.preventDefault(); $('main').scrollIntoView({behavior: 'smooth', block: 'start'}); });
  window.addEventListener('resize', () => { if (!matchMedia('(max-width:740px)').matches) setMenu(false); });

  function applyFont() {
    const size = [16, 18, 20][fontSize];
    document.documentElement.style.setProperty('--body-size', size + 'px');
    $('fontValue').textContent = ['标准', '较大', '大号'][fontSize];
    $('fontDecrease').disabled = fontSize === 0;
    $('fontIncrease').disabled = fontSize === 2;
    try { localStorage.setItem(fontKey, String(fontSize)); } catch (_) {}
  }
  $('fontDecrease').addEventListener('click', () => { fontSize = Math.max(0, fontSize - 1); applyFont(); });
  $('fontIncrease').addEventListener('click', () => { fontSize = Math.min(2, fontSize + 1); applyFont(); });
  applyFont();

  function tableText(value) { return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>'); }
  function markdown() {
    const lines = ['# ' + notebook.title, '', notebook.subtitle || '', '', '最近整理：' + (notebook.updatedAt || ''), '', notebook.description || '', ''];
    sections.forEach((section, index) => {
      lines.push('## ' + (index + 1) + ' ' + section.title, '', section.summary || '', '');
      (section.blocks || []).forEach(block => {
        if (block.type === 'p') lines.push(block.text || '', '');
        else if (block.type === 'quote') lines.push('> ' + String(block.text || '').replace(/\n/g, '\n> '), '');
        else if (block.type === 'list') { (block.items || []).forEach(item => lines.push('- ' + item)); lines.push(''); }
        else if (block.type === 'steps') { (block.items || []).forEach((item, i) => lines.push((i + 1) + '. **' + item.title + '**：' + item.text)); lines.push(''); }
        else if (block.type === 'table') {
          lines.push('| ' + (block.headers || []).map(tableText).join(' | ') + ' |', '| ' + (block.headers || []).map(() => '---').join(' | ') + ' |');
          (block.rows || []).forEach(row => lines.push('| ' + row.map(tableText).join(' | ') + ' |')); lines.push('');
        } else if (block.text) lines.push(block.text, '');
      });
      if (section.source) lines.push('资料位置：' + section.source, '');
    });
    lines.push('## 我的行动清单', '', '勾选状态来自导出时的当前浏览器。', '');
    actions.forEach(action => lines.push('- [' + (completed[action.id] ? 'x' : ' ') + '] ' + action.title + (action.detail ? '：' + action.detail : '')));
    lines.push('', '## 更新记录', ''); updates.forEach(update => lines.push('- ' + update.date + '：' + update.text));
    return lines.join('\n') + '\n';
  }
  $('exportButton').addEventListener('click', () => {
    const blob = new Blob(['\ufeff' + markdown()], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob); const link = el('a'); link.href = url;
    link.download = (notebook.title || '六边形的学习笔记').replace(/[\\/:*?"<>|]/g, '') + '.md';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('已导出完整 Markdown 笔记。');
  });
  $('printButton').addEventListener('click', () => { clearSearch(); changeView('notes', {hash: false}); setTimeout(() => window.print(), 100); });

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (view !== 'notes' || searchQuery) return;
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) activateChapter(visible[0].target.id);
    }, {rootMargin: '-5% 0px -68% 0px', threshold: 0});
    document.querySelectorAll('.note-section').forEach(section => observer.observe(section));
  }
  function openHash() {
    let hash = ''; try { hash = decodeURIComponent(location.hash.slice(1)); } catch (_) {}
    if (hash === 'actions' || hash === 'updates') changeView(hash, {hash: false});
    else if (sections.some(section => section.id === hash)) goToSection(hash);
    else { changeView('notes', {hash: false}); if (sections.length) activateChapter(sections[0].id); }
  }
  window.addEventListener('hashchange', openHash);
  openHash();
})();
