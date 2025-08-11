# 云函数部署指南 - 解决 FunctionName 参数找不到问题

## 问题描述
错误信息：`FunctionName parameter could not be found`
- 影响功能：在线状态上报、群聊列表获取
- 错误位置：`user-report-presence` 和 `chat-list-groups` 云函数

## 问题原因
云函数未正确部署到腾讯云开发环境 `cloud3-8gtjhkakd53d4fdc`

## 解决步骤

### 1. 检查云开发环境
1. 打开微信开发者工具
2. 点击顶部菜单栏的"云开发"
3. 确认环境ID是否为：`cloud3-8gtjhkakd53d4fdc`

### 2. 部署云函数
#### 方法一：通过微信开发者工具部署
1. 在微信开发者工具中，右键点击 `src/backend/` 目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

#### 方法二：逐个部署云函数
1. 右键点击 `src/backend/user-report-presence/` 目录
2. 选择"上传并部署：云端安装依赖"
3. 重复上述步骤，部署以下云函数：
   - `chat-list-groups`
   - `chat-create-group`
   - `chat-send-message`
   - `chat-get-messages`
   - `chat-ai-greet`
   - `user-login`
   - `user-update-profile`
   - `user-reset-quota`
   - `user-report-unlock`
   - `user-get-welcome-package`
   - `system-status`
   - `init-database`

### 3. 验证部署状态
1. 在云开发控制台中，点击"云函数"
2. 确认所有云函数都已部署成功
3. 检查云函数状态是否为"正常"

### 4. 测试云函数
1. 重新编译小程序
2. 检查控制台是否还有 `FunctionName` 错误
3. 测试群聊列表加载功能

## 常见问题

### Q: 部署时提示权限不足
A: 确认微信开发者工具已登录正确的微信账号，且该账号有云开发权限

### Q: 部署后仍然报错
A: 尝试以下步骤：
1. 清除微信开发者工具缓存
2. 重新编译项目
3. 检查云函数名称是否与代码中调用的一致

### Q: 云函数部署失败
A: 检查：
1. 网络连接是否正常
2. 云开发环境是否可用
3. 云函数代码是否有语法错误

## 预防措施
1. 每次修改云函数代码后，及时重新部署
2. 定期检查云函数运行状态
3. 保持微信开发者工具版本更新

## 联系支持
如果问题仍然存在，请：
1. 查看云开发控制台错误日志
2. 联系腾讯云技术支持
3. 提供详细的错误信息和环境配置
