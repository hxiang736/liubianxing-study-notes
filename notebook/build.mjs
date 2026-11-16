import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const notebook = JSON.parse(await readFile(path.join(root, 'content/notebook.json'), 'utf8'));
if (!notebook.sections?.length || new Set(notebook.sections.map(s => s.id)).size !== notebook.sections.length) {
  throw new Error('章节缺失或 ID 重复');
}
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/notes.js'), 'window.NOTEBOOK = ' + JSON.stringify(notebook, null, 2) + ';\n', 'utf8');
const escape = text => String(text).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const lines = ['# ' + notebook.title, '', notebook.subtitle, '', '更新日期 ' + notebook.updatedAt, '', notebook.description, ''];
for (const section of notebook.sections) {
  lines.push('## ' + section.title, '', section.summary, '', '资料位置 ' + section.source, '');
  for (const block of section.blocks) {
    if (block.type === 'p') lines.push(block.text, '');
    if (block.type === 'quote') lines.push('> ' + block.text, '');
    if (block.type === 'list') lines.push(...block.items.map(text => '- ' + text), '');
    if (block.type === 'steps') block.items.forEach((step, i) => lines.push('### ' + (i + 1) + ' ' + step.title, '', step.text, ''));
    if (block.type === 'table') lines.push('| ' + block.headers.map(escape).join(' | ') + ' |', '| ' + block.headers.map(() => '---').join(' | ') + ' |', ...block.rows.map(row => '| ' + row.map(escape).join(' | ') + ' |'), '');
  }
}
lines.push('## 我的行动清单', '', '以下是根据分享整理的建议，可按自己的节奏选做。', '', ...notebook.actions.map(a => '- [ ] **' + a.title + '** ' + a.detail), '', '## 更新记录', '', ...notebook.updates.map(u => '- ' + u.date + ' ' + u.text), '');
await writeFile(path.join(root, 'dist/notebook.md'), lines.join('\n'), 'utf8');
console.log(`已生成 ${notebook.sections.length} 章笔记与 Markdown 文件`);
