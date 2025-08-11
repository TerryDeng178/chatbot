# 情感AI对话小程序

一个基于微信小程序的情感AI对话应用，采用Taro多端框架开发，集成腾讯混元AI服务。

## 项目概述

本项目是一个情感AI对话小程序，用户可以与不同性格的AI角色进行对话交流。项目采用前后端分离架构，前端使用Taro React框架，后端基于腾讯云开发平台。

## 技术架构

### 前端技术栈
- **框架**: Taro React (支持微信小程序、H5等多端)
- **UI库**: TDesign Tona
- **语言**: TypeScript
- **状态管理**: React Hooks

### 后端技术栈
- **平台**: 腾讯云开发 (CloudBase)
- **运行时**: Node.js 云函数
- **数据库**: CloudBase 数据库
- **存储**: CloudBase 云存储

### AI服务
- **提供商**: 腾讯混元 (Hunyuan)
- **模型**: hunyuan-lite
- **特性**: 支持多轮对话、上下文理解

## 核心功能

- ✅ 用户登录认证
- ✅ 多AI角色对话
- ✅ 聊天历史记录
- ✅ 智能AI回复（腾讯混元）
- 🚧 AI角色解锁机制
- 🚧 广告变现系统
- 📋 语音对话功能
- 📋 AI角色自定义

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 微信开发者工具
- 腾讯云开发账号

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 微信小程序开发
npm run dev:weapp

# H5开发
npm run dev:h5
```

### 构建发布

```bash
# 构建微信小程序
npm run build:weapp

# 构建H5
npm run build:h5
```

## AI服务配置

### 腾讯混元API配置

1. 获取腾讯云API密钥：
   - 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
   - 进入 "访问管理" > "API密钥管理"
   - 创建或获取 SecretId 和 SecretKey

2. 配置云函数环境变量：
   - 进入腾讯云开发控制台
   - 选择 `chat-send-message` 云函数
   - 在函数配置中添加环境变量：
     - `TENCENT_SECRET_ID`: 你的SecretId
     - `TENCENT_SECRET_KEY`: 你的SecretKey

3. 重新部署云函数使配置生效

### 降级机制

如果未配置API密钥，系统会自动使用模拟回复模式，确保基本功能可用。

## 项目结构

```
chatbot/
├── src/
│   ├── pages/          # 页面组件
│   │   ├── index/      # 首页
│   │   ├── chat/       # 聊天页面
│   │   └── profile/    # 个人中心
│   ├── components/     # 公共组件
│   ├── utils/          # 工具函数
│   ├── backend/        # 云函数
│   │   ├── user-login/ # 用户登录
│   │   ├── chat-send-message/ # 发送消息
│   │   └── chat-list-groups/  # 获取聊天列表
│   └── app.config.ts   # 应用配置
├── .trae/
│   └── rules/          # 项目规则文档
├── package.json
└── README.md
```

## 开发规范

项目遵循严格的开发规范，详见 `.trae/rules/` 目录下的规则文档：

- `TECHNICAL_ARCHITECTURE_RULES.md` - 技术架构规范
- `UI_DESIGN_RULES.md` - UI设计规范
- `API_RULES.md` - API设计规范
- `TECHNICAL_RULES.md` - 技术开发规范

## 版本历史

详见 [CHANGELOG.md](./CHANGELOG.md)

## 许可证

本项目仅供学习和研究使用。

## 联系方式

如有问题或建议，请通过项目Issues反馈。