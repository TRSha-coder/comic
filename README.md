# Comic Hub 📚

动漫在线观看网站，从MyAnimeList抓取数据，支持站内观看和收藏功能。

## 功能特点

- 🔍 **搜索过滤** - 支持按标题、类型、评分、状态筛选
- ⭐ **收藏功能** - 支持收藏喜欢的动漫，本地存储
- 🎬 **卡片展示** - 精美的动漫卡片设计
- 📱 **响应式布局** - 支持手机、平板、桌面设备
- 🌙 **深色主题** - 护眼深色UI设计
- 🚀 **无需后端** - 纯静态网站，易于部署

## 技术栈

- **前端**: 原生HTML5 + CSS3 + Vanilla JavaScript
- **数据源**: Jikan API (MyAnimeList非官方API)
- **字体**: Noto Sans SC (中文)
- **图标**: Font Awesome 6

## 项目结构

```
comic/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 前端逻辑
├── data/
│   └── anime.json      # 动漫数据
├── scripts/
│   └── fetch_anime.py  # 数据抓取脚本
├── .gitignore          # Git忽略配置
└── README.md           # 项目说明
```

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/TRSha-coder/comic.git
cd comic
```

### 2. 更新动漫数据

```bash
pip install requests
python scripts/fetch_anime.py
```

### 3. 本地运行

```bash
python -m http.server 8080
```

然后访问 http://127.0.0.1:8080

### 4. 部署

推送到GitHub后自动部署到GitHub Pages，或使用Vercel、Netlify等平台。

## 数据来源

- API: [Jikan API](https://jikan.moe/)
- 源站: [MyAnimeList](https://myanimelist.net/)

## License

MIT
