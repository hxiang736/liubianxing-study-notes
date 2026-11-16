# AI 产品与求职笔记网站

网站内容来自《从应用统计学到 AI 产品经理》分享会的整理笔记，包含岗位认知、能力准备、求职方法与可选行动建议。

## 更新内容

编辑 `content/notebook.json`，然后运行 `node build.mjs`。该命令会生成 `dist/notes.js` 与 `dist/notebook.md`。将更改推送到 main 分支后，仓库中的 Pages 工作流会重新生成内容并部署 `dist/`。

也可以在原聊天发送新材料，由助手整理、核对并更新。

## 发布设置

仓库 Settings 中的 Pages 需要将发布来源设为 GitHub Actions。网站发布后，使用 GitHub 返回的实际 Pages 地址。GitHub Pages 是公开网站，正文可被任何人访问。

原始照片、内部文档地址、内推码和 Sites 托管配置不包含在这个目录中。行动清单的勾选保存在当前浏览器；正文随发布统一更新。

## 文件结构

- `content/notebook.json`：可编辑的内容源。
- `build.mjs`：内容生成脚本。
- `dist/`：HTML、CSS、JavaScript 与可下载的 Markdown 笔记。

网站为纯静态文件，不需要 API 密钥、数据库或第三方前端依赖。
