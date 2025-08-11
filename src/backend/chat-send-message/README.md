# chat-send-message 云函数

这个云函数负责处理用户发送的聊天消息，并调用腾讯混元AI API生成智能回复。

## 功能特性

- 接收用户消息并存储到数据库
- 获取聊天历史记录作为上下文
- 调用腾讯混元AI API生成智能回复
- 支持多轮对话上下文
- 完善的错误处理和降级机制

## 环境变量配置

为了使用腾讯混元AI服务，需要在云函数环境中配置以下环境变量：

### 必需的环境变量

- `TENCENT_SECRET_ID`: 腾讯云API密钥ID
- `TENCENT_SECRET_KEY`: 腾讯云API密钥Key

### 如何获取腾讯云密钥

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 "访问管理" > "API密钥管理"
3. 创建新的API密钥或使用现有密钥
4. 复制 SecretId 和 SecretKey

### 如何配置环境变量

在腾讯云开发控制台中：

1. 进入云函数管理页面
2. 选择 `chat-send-message` 函数
3. 点击 "函数配置" 标签
4. 在 "环境变量" 部分添加：
   - 变量名：`TENCENT_SECRET_ID`，变量值：`在GitHub Secrets配置，不要写进代码库`
   - 变量名：`TENCENT_SECRET_KEY`，变量值：`在GitHub Secrets配置，不要写进代码库`
5. 保存配置

**注意**：SecretKey是敏感信息，请妥善保管，不要在代码中硬编码或公开分享。

## 降级机制

如果未配置环境变量或API调用失败，函数会自动降级为模拟回复模式，确保基本功能可用。

## API参数

### 输入参数

```json
{
  "groupId": "群组ID",
  "message": "用户消息内容",
  "characterId": "AI角色ID（可选）"
}
```

### 返回结果

```json
{
  "success": true,
  "data": {
    "messageId": "消息ID",
    "aiReply": "AI回复内容",
    "timestamp": "时间戳"
  }
}
```

## 使用的AI模型

- **模型**: hunyuan-lite（腾讯混元轻量版）
- **特点**: 免费使用，适合对话场景
- **参数**: Temperature=0.7, TopP=0.9
- **上下文**: 最多保留最近10条消息

## 注意事项

1. 请妥善保管API密钥，不要在代码中硬编码
2. 建议定期轮换API密钥以确保安全
3. 监控API调用量，避免超出配额
4. 测试时可以先不配置密钥，使用模拟回复模式