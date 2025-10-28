# 🚀 RuleFlow 部署指南 | Deployment Guide

## 自动化部署到 Vercel (推荐) | Automated Vercel Deployment (Recommended)

### 步骤 1: 准备 GitHub 仓库 | Step 1: Prepare GitHub Repository

```bash
# 在项目目录下初始化 Git (如果还没有)
cd ruleflow
git init
git add .
git commit -m "Initial commit: RuleFlow v1.0"

# 在 GitHub 上创建新仓库，然后推送代码
git remote add origin https://github.com/YOUR_USERNAME/ruleflow.git
git branch -M main
git push -u origin main
```

### 步骤 2: 部署到 Vercel | Step 2: Deploy to Vercel

1. **访问 Vercel**: https://vercel.com
2. **登录/注册**: 使用 GitHub 账号登录
3. **导入项目**:
   - 点击 "Add New" → "Project"
   - 从 GitHub 选择 `ruleflow` 仓库
   - 点击 "Import"

4. **配置设置** (保持默认即可):
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

5. **部署**:
   - 点击 "Deploy"
   - 等待 2-3 分钟
   - 完成！🎉

### 步骤 3: 获取链接 | Step 3: Get Your URL

部署完成后，Vercel 会给你一个免费的 URL，类似：
```
https://ruleflow-xxx.vercel.app
```

每次推送到 `main` 分支，Vercel 会自动重新部署！

---

## 手动测试 | Manual Testing

### 本地运行 | Run Locally

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 访问 http://localhost:3000
```

### 测试构建 | Test Build

```bash
# 生产构建
npm run build

# 运行生产版本
npm start

# 访问 http://localhost:3000
```

---

## 零成本保证 | Zero-Cost Guarantee

✅ **完全免费的资源**:

- **Vercel 免费层**:
  - 100GB 带宽/月
  - 100 次部署/天
  - 自动 HTTPS
  - 全球 CDN
  - 自动构建和部署

- **Polymarket API**:
  - 完全公开免费
  - 无需 API Key
  - 无速率限制

- **前端技术**:
  - Next.js: 免费开源
  - Mermaid.js: 免费开源
  - TailwindCSS: 免费开源

---

## 自定义域名 (可选) | Custom Domain (Optional)

在 Vercel 项目设置中:

1. 进入 "Settings" → "Domains"
2. 添加你的域名 (例如: `ruleflow.com`)
3. 按照 DNS 配置说明操作
4. 等待 DNS 传播 (通常 5-10 分钟)

免费包含 SSL 证书！

---

## 环境变量 | Environment Variables

**本项目不需要任何环境变量！** 🎉

所有配置都是默认的：
- ✅ 无需 API Keys
- ✅ 无需数据库连接
- ✅ 无需第三方服务

---

## 故障排查 | Troubleshooting

### 问题 1: 构建失败 | Build Failed

**解决方案**:
```bash
# 清理缓存
rm -rf .next node_modules
npm install
npm run build
```

### 问题 2: API 调用失败 | API Call Failed

**检查项**:
- Polymarket API 是否可访问: https://gamma-api.polymarket.com
- 网络连接是否正常
- Vercel 函数是否超时 (默认 10s)

### 问题 3: Mermaid 图表不显示 | Mermaid Chart Not Showing

**解决方案**:
- 清除浏览器缓存
- 检查 JavaScript 是否启用
- 查看浏览器控制台错误

---

## 性能优化 | Performance Optimization

已内置的优化：

- ✅ **静态生成**: 首页预渲染
- ✅ **API 缓存**: 5 分钟缓存
- ✅ **图片优化**: Next.js 自动处理
- ✅ **代码分割**: 自动代码分割
- ✅ **Gzip 压缩**: Vercel 自动开启

---

## 监控和分析 | Monitoring & Analytics

### Vercel Analytics (免费)

1. 在 Vercel 项目中启用 Analytics
2. 安装包:
```bash
npm install @vercel/analytics
```

3. 添加到 `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 更新部署 | Update Deployment

### 自动更新 (推荐)

```bash
# 修改代码后
git add .
git commit -m "Update: 描述你的更改"
git push

# Vercel 会自动部署！
```

### 手动更新

1. 进入 Vercel Dashboard
2. 选择项目
3. 点击 "Deployments" → "Redeploy"

---

## 成本预估 | Cost Estimate

| 资源 | 免费额度 | 月成本 |
|------|----------|--------|
| Vercel Hobby | 100GB 带宽 | **$0** |
| Polymarket API | 无限制 | **$0** |
| 域名 (可选) | - | ~$10-15/年 |
| **总计** | - | **$0/月** |

---

## 支持与帮助 | Support & Help

- **文档**: 查看 README.md
- **问题**: 提交 GitHub Issue
- **Vercel 文档**: https://vercel.com/docs
- **Next.js 文档**: https://nextjs.org/docs

---

## 下一步 | Next Steps

1. ✅ 部署到 Vercel
2. ✅ 测试所有功能
3. ✅ 分享你的链接
4. ⏭ 添加自定义功能
5. ⏭ 贡献代码改进

祝部署顺利！🚀 | Happy Deploying! 🚀
