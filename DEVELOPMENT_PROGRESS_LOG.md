## 2025-08-11 第三次修复：自动发送消息问题深度修复

### 问题描述
用户报告两个问题仍然存在：
1. **用户进入后，系统会自动以用户的身份发一条信息**
2. **用户输入文字发送后，系统有时会自动再发一次，出现两条一样信息的对话框**

### 问题分析
经过深入代码分析，发现问题的根本原因：

#### 问题1：自动发送消息
- **根本原因**：欢迎消息处理逻辑存在问题
- 在 `onLoad` 中，欢迎消息被添加到 `messageList` 中
- 在 `loadMessages` 中，欢迎消息被保留并重新排序
- 这可能导致消息顺序混乱和意外的消息发送

#### 问题2：重复发送消息
- **根本原因**：`sendMessageWithMultiAI` 函数中的延迟触发逻辑不够严格
- `triggerFollowUpAIReply` 的调用可能导致重复触发
- 状态检查不够严格，延迟触发机制存在问题

### 解决方案

#### 1. 改进欢迎消息处理逻辑
- 将欢迎消息从立即添加到 `messageList` 改为存储在 `pendingWelcomeMessage` 中
- 在 `loadMessages` 完成后再添加欢迎消息，确保正确的消息顺序
- 避免在消息加载过程中干扰消息列表

#### 2. 增强防重复机制
- 在 `sendMessageWithMultiAI` 中立即标记 `hasTriggeredAIReply: true`
- 改进延迟触发的状态检查逻辑
- 确保延迟触发不会重复执行

#### 3. 增强消息去重逻辑
- 改进 `loadNewMessages` 中的本地消息去重检查
- 增加角色匹配检查，确保更准确的去重
- 优化重复消息的日志记录

#### 4. 完善状态重置
- 在 `onShow` 中清除 `pendingWelcomeMessage`
- 确保每次进入页面时状态都是干净的

### 技术实现

#### 修改的文件
- `pages/group-chat/group-chat.js`

#### 关键修改点
1. **onLoad 函数**：
   ```javascript
   // 改为存储待添加的欢迎消息
   this.setData({
     pendingWelcomeMessage: { /* 欢迎消息对象 */ }
   })
   ```

2. **loadMessages 函数**：
   ```javascript
   // 在消息加载完成后添加欢迎消息
   if (this.data.pendingWelcomeMessage) {
     newMessageList = [this.data.pendingWelcomeMessage, ...formattedMessages]
     this.setData({ pendingWelcomeMessage: null })
   }
   ```

3. **sendMessageWithMultiAI 函数**：
   ```javascript
   // 立即标记已触发，防止重复设置
   this.setData({ hasTriggeredAIReply: true })
   
   setTimeout(() => {
     // 增强状态检查
     if (this.data.activeAIs.length > 1 && !this.data.isFirstLoad) {
       this.triggerFollowUpAIReply(content)
     }
   }, delay)
   ```

4. **loadNewMessages 函数**：
   ```javascript
   // 增强本地消息去重检查
   const isLocalMessage = this.data.messageList.some(localMsg => {
     if (!localMsg.isLocalMessage) return false
     
     const contentMatch = localMsg.content === msg.content
     const timeMatch = Math.abs((localMsg.timestamp || 0) - (msg.timestamp || msg.createdAt || 0)) < 5000
     const roleMatch = localMsg.role === (msg.role || 'user')
     
     return contentMatch && timeMatch && roleMatch
   })
   ```

5. **onShow 函数**：
   ```javascript
   // 清除待添加的欢迎消息
   this.setData({
     pendingWelcomeMessage: null
   })
   ```

### 修复结果
- ✅ 解决了欢迎消息处理逻辑问题
- ✅ 增强了防重复触发机制
- ✅ 改进了消息去重逻辑
- ✅ 完善了状态重置机制
- ✅ 提供了更详细的日志记录

### 测试建议
1. 清除小程序缓存并刷新
2. 多次进入和退出群聊页面
3. 发送消息后观察是否出现重复
4. 检查控制台日志，确认防重复机制正常工作

### 后续优化方向
1. 考虑添加消息发送的防抖机制
2. 优化消息状态管理，使用更可靠的状态机模式
3. 添加消息发送失败的重试机制
4. 考虑使用消息队列来管理消息发送顺序
