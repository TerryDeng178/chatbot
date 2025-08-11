# 项目版本变更日志 (Changelog)

本文档记录了项目在开发过程中的所有重要版本快照。

| 版本号 (Version) | 保存日期 (Date) | 主要变更内容 (Description) | 快照存储路径 (Snapshot Path) |
| :--- | :--- | :--- | :--- |
| v1.06.2504010 | 2024-12-19 | fix: 修复AI性格列表获取失败和群聊信息加载错误，添加全面的空值检查和防护措施，优化AI数据加载流程，创建AI调试工具和诊断页面 | HEAD (f47474f) |
| v1.05.2504010 | 2024-12-18 | fix: 修复云函数配置问题，完善群聊导航栏，优化AI头像显示 | - |
| v1.04.2504010 | 2024-12-17 | feat: 实现多AI协作功能，添加AI性能统计，优化群聊界面 | - |
| v0.2.2 | 2025-08-09 | docs: 修正规则文档一致性问题，更新技术栈描述 | .snapshot/v0.2.2 |
| v0.2.1 | 2025-08-09 | docs: 更新UI设计规范以匹配新版原型 | .snapshot/v0.2.1 |
| v0.2.0 | 2025-08-09 | refactor: 全面重构云函数与前端调用逻辑 | .snapshot/v0.2.0 |
| v0.1.0 | 2025-08-09 | feat: 初始化项目并完成数据库核心功能 | .snapshot/v0.1.0 |

## [2025-08-11] - 第五次修复：自动发送消息问题深度修复

### 🔧 修复
- **自动发送消息问题深度修复**：实施多层防护机制，防止系统自动发送消息
  - 增强欢迎消息标记：添加 `isSystemMessage`, `isWelcomeMessage`, `senderType: 'ai'`
  - 增强用户消息标记：添加 `isUserMessage`, `senderType: 'user'`
  - 增强AI消息标记：添加 `isAIMessage`, `senderType: 'ai'`
  - 在 `sendMessage()` 中添加 `isFirstLoad` 检查和消息内容关键词检查
  - 在 `sendMessageWithMultiAI()` 中添加相同的防护检查
  - 在 `triggerAIReply()` 中添加消息对象有效性检查和系统消息检查
  - 在 `triggerFollowUpAIReply()` 中添加系统消息内容检查
  - 在 `loadNewMessages()` 中添加系统消息和欢迎消息过滤

### 📝 文档更新
- 更新 `[NEW]DEVELOPMENT_PROGRESS_LOG.md`：添加第五次修复的详细记录
- 更新 `[NEW]TODAY_FIX_SUMMARY.md`：添加第五次修复的总结

### 🚀 技术改进
- 建立完整的消息类型识别系统
- 从多个层面防止系统自动发送消息
- 增强消息处理的健壮性
- 提供清晰的调试日志

---

## [2025-08-11] - 第四次修复：消息排序问题修复 + 消息时间显示问题修复