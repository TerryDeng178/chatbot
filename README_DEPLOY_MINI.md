# 群聊最简操作指南（部署与验证）

## 一键部署（仅必要云函数）
1. 双击运行 `deploy-group-chat-essential.bat`
   - 自动部署到环境：`cloud3-8gtjhkakd53d4fdc`
   - 部署函数：
     - `group-chat-get-messages`（严格游标 + 去重）
     - `group-chat-multi-ai`（透传 clientMsgId 用于覆盖本地临时消息）

2. 看到“🎉 必要云函数部署完成”即表示部署成功。

## 前端刷新
1. 打开微信开发者工具 → 项目
2. 点击“编译”或“预览”

## 验证步骤
1. 进入群聊，打开控制台：应看到
   - `polling after => <数字> <id>`
   - 收到数据时：`server first => <时间> <id>`
2. 发送一条短消息（如“12”）：
   - 先出现本地临时条
   - 轮询回来后本地临时条被服务端消息覆盖，最终只保留一条

## 常见问题
- 仍显示重复：
  - 确认云函数日志中为 `phase: poll`，且 `afterTime/afterId` 有值（不是 `initial`）
  - 确认你刚运行了 `deploy-group-chat-essential.bat`（不是旧的部署脚本）
  - 前端重新编译一次再试


