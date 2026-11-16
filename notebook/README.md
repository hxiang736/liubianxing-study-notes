# 六边形的学习笔记

这是以分析力、学习力、表达力、执行力、身心力和职业力为入口的个人知识库。首页只显示一版六边形地图，每个角进入对应的独立模块。六边形用于导航，不代表能力评分。

《AI 产品与求职笔记》是职业维度下“求职记录”中的一篇文章。数据分析栏目收录从既往学习讨论归纳的 SQL、Python 笔记；学习维度链接原有的机器学习入门笔记。尚未归档的能力方向显示建议主题。

## 更新内容

按内容类型编辑相应 JSON，再运行 `node build.mjs`。首页模块与文章目录在 `content/hub.json`，分享会文章在 `content/notebook.json`，整理后的技术笔记在 `content/learning-notes.json`。该命令会更新首页数据、六个模块、独立文章页面及 Markdown 文件。将更改推送到 main 分支后，Pages 工作流会重新构建并部署 `dist/`。

也可以在原聊天发送新材料，由助手整理、核对并更新。

## 发布设置

仓库 Settings 中的 Pages 需要将发布来源设为 GitHub Actions。网站发布后，使用 GitHub 返回的实际 Pages 地址。GitHub Pages 是公开网站，正文可被任何人访问。

原始照片、内部文档地址、内推码、历史聊天标识和 Sites 托管配置不包含在公开内容中。分享会文章的行动勾选保存在当前浏览器；正文随发布统一更新。

## 文件结构

- `content/hub.json`：六个能力模块、具体栏目与文章入口。
- `content/notebook.json`：AI 产品与求职笔记的内容源。
- `content/learning-notes.json`：SQL、Python 整理笔记。
- `build.mjs`：内容生成脚本。
- `dist/index.html`：知识库首页。
- `dist/modules/`：各个能力模块及文章目录。
- `dist/notes/`：各篇独立笔记、样式与 Markdown 文件。

网站为纯静态文件，不需要 API 密钥、数据库或第三方前端依赖。
