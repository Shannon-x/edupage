# 教育部学籍在线验证报告编辑器

一个纯前端的网站，用于编辑现有的教育部学籍在线验证报告PDF文件。

## 特点

- 纯前端实现，无需后端服务器
- 直接编辑现有PDF文件（11.pdf）
- 支持照片上传和预览
- 通过表单填写报告内容
- 实时预览修改后的PDF
- 支持PDF缩放和翻页
- 下载修改后的PDF文件

## 使用方法

1. 下载或克隆本项目到本地
2. 直接在浏览器中打开`index.html`文件（建议使用本地服务器）
3. PDF将自动加载并显示在右侧
4. 在左侧表单中填写信息
5. 点击"更新PDF"按钮应用更改
6. 点击"下载PDF"按钮保存修改后的PDF

## 部署到Cloudflare Pages

1. 在GitHub上创建仓库并上传项目文件
2. 登录Cloudflare账户，进入Pages服务
3. 点击"创建项目"，连接你的GitHub仓库
4. 配置部署设置（构建命令和输出目录可以留空）
5. 点击"保存并部署"
6. 部署完成后可以通过Cloudflare提供的URL访问

## 本地调试

使用Python创建本地服务器：
```
cd 项目目录
python -m http.server
```

然后在浏览器中访问: http://localhost:8000

## 技术栈

- HTML5 / CSS3 / JavaScript
- PDF.js - 用于PDF查看和渲染
- jsPDF - 用于PDF生成和编辑
- Fabric.js - 用于画布处理
- QRCode.js - 用于生成QR码

## 注意事项

- 此项目仅用于学习和非商业用途
- 生成的PDF文档不具有法律效力
- 请不要用于伪造证件等非法用途

## 开发者

如需修改和定制，可编辑以下文件：
- `index.html` - 主HTML结构
- `styles.css` - 样式表
- `script.js` - JavaScript逻辑
- 在`script.js`中的`fieldPositions`对象用于配置各字段在PDF中的位置 