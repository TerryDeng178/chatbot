# 数据模型与变量ID规范 (DATA_MODEL.md)

**引言**
*   本文档是项目中所有核心数据模型的“唯一真相来源”。
*   **目标**: 确保前端、后端、数据库之间的数据结构完全一致，实现真正的“丝滑连接”。
*   **核心原则**: 所有变量命名，**必须**遵循**小驼峰命名法 (camelCase)**。

---

### 1. 用户模型 (`User`)
代表使用我们应用的每一个独立用户。

| 变量名 (ID) | 数据类型 | 描述 | 示例 |
| :--- | :--- | :--- | :--- |
| `userId` | String | 用户的唯一标识符。**主键**。通常是UUID或数据库自增ID。 | `"user-a1b2-c3d4"` |
| `openId` | String | 用户在微信小程序生态中的唯一ID。需要建立索引以快速查询。 | `"o6zAJs-abcdefg1234567"` |
| `nickname` | String | 用户公开显示的昵称。 | `"张三"` |
| `avatarUrl` | String | 指向用户头像图片的URL。 | `"https://example.com/avatar.png"` |
| `gender` | Number | 性别。`0`: 未知, `1`: 男, `2`: 女。 | `1` |
| `createdAt` | ISO 8601 | 账户创建时的时间戳 (UTC)。 | `"2023-10-27T10:00:00Z"` |
| `updatedAt` | ISO 8601 | 用户资料最后更新时的时间戳 (UTC)。 | `"2023-10-27T11:00:00Z"` |
| `lastLoginAt`| ISO 8601 | 用户最后一次登录的时间戳 (UTC)。 | `"2023-10-28T09:00:00Z"` |
| `unlockedCharacterIds` | Array<String> | 用户已解锁的AI角色ID列表。通过观看激励广告来填充。 | `["char-001", "char-005"]` |

---

### 2. 聊天会话模型 (`ChatSession`)
代表用户与AI之间的一次完整对话。

| 变量名 (ID) | 数据类型 | 描述 | 示例 |
| :--- | :--- | :--- | :--- |
| `sessionId` | String | 聊天会话的唯一标识符。**主键**。 | `"session-e5f6-g7h8"` |
| `userId` | String | 发起此次会话的用户的ID。**外键**，关联`User`。 | `"user-a1b2-c3d4"` |
| `title` | String | 会话的标题。可由用户自定义，或由系统根据首条消息自动生成。 | `"关于如何学习编程"` |
| `createdAt` | ISO 8601 | 会话创建时的时间戳 (UTC)。 | `"2023-10-28T12:00:00Z"` |
| `updatedAt` | ISO 8601 | 此会话中最后一则消息的时间戳 (UTC)。 | `"2023-10-28T13:30:00Z"` |
| `messageCount`| Number | 此会话中包含的总消息数量。 | `52` |

---

### 3. 聊天消息模型 (`ChatMessage`)
代表在一次会话中的单条消息。

| 变量名 (ID) | 数据类型 | 描述 | 示例 |
| :--- | :--- | :--- | :--- |
| `messageId` | String | 消息的唯一标识符。**主键**。 | `"msg-i9j0-k1l2"` |
| `sessionId` | String | 此消息所属会话的ID。**外键**，关联`ChatSession`。 | `"session-e5f6-g7h8"` |
| `senderId` | String | 发送者的ID。可以是`userId`，也可以是代表AI的系统ID。 | `"user-a1b2-c3d4"` |
| `senderRole` | String | 发送者的角色。枚举值: `"user"`, `"assistant"`。 | `"user"` |
| `contentType` | String | 消息内容的类型。枚举值: `"text"`, `"image"`, `"audio"`, `"video"`。 | `"text"` |
| `content` | String | 消息的具体内容。如果是文本，就是文本字符串；如果是媒体，就是指向媒体文件的URL。 | `"你好，请问你都能做什么？"` |
| `status` | String | 消息的状态。枚举值: `"sending"`, `"sent"`, `"delivered"`, `"read"`, `"error"`。 | `"sent"` |
| `createdAt` | ISO 8601 | 消息创建时的时间戳 (UTC)。 | `"2023-10-28T12:00:15Z"` |