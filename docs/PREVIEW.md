# 搜索页预览与维护

在仓库根目录运行（Python 3.10 或更新版本，无额外依赖）：

```sh
python scripts/generate_index.py
python -m http.server 8000 --directory docs
```

打开 http://localhost:8000 。请通过 HTTP 预览，直接双击 HTML 可能无法加载 JSON。

- 页面模板：`scripts/templates/search.html`
- 页面样式：`docs/styles.css`
- 搜索交互：`docs/search.js`
- 书籍目录：`docs/all-books.json`，加载失败时使用 `docs/books.json`

修改模板后重新运行生成脚本，并提交生成的 `docs/index.html`。
生成过程保留目录中的下载链接；搜索使用当前网站目录内的 JSON。

GitHub Pages 使用仓库 Settings → Pages → Deploy from a branch，选择 `main` 分支和 `/docs` 文件夹。
本 fork 的访问地址为 https://kandona.github.io/ebook-treasure-chest/ （启用 Pages 并部署成功后可用）。

检查项目：搜索单个和多个关键词、热门分类、清空、无结果、继续展示、网盘链接、375px 手机布局。
主目录加载失败时应显示备用目录提示；两个文件都失败时应显示重试按钮。
