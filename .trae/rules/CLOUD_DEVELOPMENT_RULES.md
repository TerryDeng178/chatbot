# 云开发规则 (CLOUD_DEVELOPMENT_RULES.md)

**引言**
*   本文档为本项目在 **Taro 框架**下使用**腾讯云开发 (TCB)** 提供统一的、强制性的规范。
*   **目标**: 确保所有云资源（特别是云函数和云数据库）的管理和使用都具备规范性、安全性、可维护性和成本效益。

**第一章：核心原则 (Core Principles)**
1.  **环境隔离**: **必须**使用至少两个相互隔离的TCB环境：
    *   `dev` (开发环境): 用于日常开发、测试和调试。
    *   `prod` (生产环境): 用于部署最终面向用户的正式版本。
    *   **严禁**在`prod`环境中进行任何未经测试的直接操作。
2.  **最小权限原则**: 所有资源的访问权限（包括数据库、文件存储、云函数）**必须**设置为“私有读写”，除非有明确的公开访问需求。云函数之间的调用也应遵循最小权限原则。
3.  **成本意识**: 所有开发活动都应考虑成本。优先选择更经济的资源配置，并定期审查资源使用情况，避免浪费。
4.  **日志记录**: 所有云函数**必须**包含关键操作的日志记录，以便于调试和审计。

**第二章：云函数 (Cloud Functions)**
1.  **命名规范**: 云函数名称**必须**遵循 `服务名-操作名` 的格式，全部使用小写字母和短横线。
    *   **正确**: `user-login`, `message-send`, `ads-get-config`, `user-report-unlock`
    *   **错误**: `Login`, `sendMessage`, `create_session`
2.  **单一职责**: 每个云函数应只做一件事情，并把它做好。避免创建包含多种不相关逻辑的“巨型函数”。
3.  **标准目录结构**: 每个云函数都**必须**包含 `index.js` 和 `package.json`。云函数统一存放于 `src/backend` 目录。
4.  **配置与密钥管理**:
    *   **严禁**在代码中硬编码任何密钥、密码或敏感配置。
    *   所有配置项（如API密钥、第三方服务地址）**必须**通过TCB的“配置管理”功能进行注入。
5.  **依赖管理**:
    *   在`package.json`中只声明必要的依赖，保持依赖树的简洁。
    *   在函数根目录执行 `npm install`，并将 `node_modules` 与函数代码一同部署。
6.  **入口与返回**:
    *   云函数的入口文件**必须**是 `index.js`，主函数**必须**是 `main`。
    *   云函数的返回格式**必须**遵循 <mcfile name="API_RULES.md" path="e:\Trae\projects\chatbot\.trae\rules\API_RULES.md"></mcfile> 中定义的标准响应结构。
7.  **错误处理**: 函数中所有可能出错的异步操作（如数据库查询、网络请求）**必须**使用 `try...catch` 块进行包裹，并返回统一的错误响应。

**第三章：云数据库 (Cloud Database)**
1.  **集合命名**: 数据库集合（Collection）名称**必须**使用“复数形式的下划线命名法 (snake_case)”。
    *   **正确**: `users`, `chat_sessions`, `chat_messages`
    *   **错误**: `User`, `chatSession`, `ChatMessage`
2.  **应用层Schema**: 虽然MongoDB是无模式的，但我们在应用层**必须**强制实行Schema。所有数据库的写入操作，其数据结构**必须**严格遵守 <mcfile name="DATA_MODEL.md" path="e:\Trae\projects\chatbot\.trae\rules\DATA_MODEL.md"></mcfile> 中的定义。
3.  **权限控制**: 数据库的权限**必须**设置为“仅云函数可读写”。前端（Taro应用）**严禁**直接操作数据库，所有数据交互**必须**通过云函数进行。
4.  **索引**: **必须**为所有常用的查询字段（如`userId`, `openId`, `sessionId`）创建索引，以提升查询性能。

**第四章：云存储 (Cloud Storage)**
1.  **目录结构**: 云存储**必须**采用以下结构化的目录：
    *   `/public/`: 存放可被公开访问的静态资源（如默认头像、应用图标）。
    *   `/user-uploads/{userId}/`: 存放特定用户上传的文件，`{userId}`是用户的唯一ID。此目录权限需严格控制。
    *   `/system-generated/`: 存放由系统生成的、非用户直接上传的文件（如报表、处理后的图片）。
2.  **文件命名**: 上传的文件名应进行处理，建议使用 `UUID` 或 `时间戳+随机数` 的方式重命名，以避免文件名冲突和潜在的安全问题。

**第五章：开发与部署 (Development & Deployment)**
1.  **环境初始化**: 在 Taro 项目的 `app.ts` (或 `app.js`) 文件中，**必须**调用 `Taro.cloud.init` 来初始化云开发环境。
    ```typescript
    // 在 app.ts 的 onLaunch 方法中
    Taro.cloud.init({
      env: '你的环境ID', // e.g. 'prod-1gxxxxxxxx', 'dev-1gxxxxxxxx'
      traceUser: true,
    });
    ```
2.  **前端调用**: **必须**使用 `Taro.cloud.callFunction` 来调用云函数。
    ```typescript
    // 正确做法：通过云函数调用
    try {
      const res = await Taro.cloud.callFunction({
        name: 'chat-send-message',
        data: {
          content: '七嘴八舌聊起来'
        }
      });
      console.log('消息发送成功', res.result);
    } catch (error) {
      console.error('调用失败', error);
    }
    ```
3.  **文件上传**: **必须**使用 `Taro.chooseImage` 和 `Taro.cloud.uploadFile`。
    ```typescript
    const chooseResult = await Taro.chooseImage({ count: 1 });
    const tempFilePath = chooseResult.tempFilePaths[0];
    const uploadResult = await Taro.cloud.uploadFile({
      cloudPath: `user-uploads/your-user-id/${Date.now()}.png`, // 遵循规则的存储路径
      filePath: tempFilePath,
    });
    console.log('上传成功，文件ID：', uploadResult.fileID);
    ```
4.  **部署工具**: 云函数的开发和部署，推荐使用 **Taro CLI** 或 **CloudBase CLI** 进行统一管理。
5.  **版本控制**: 云函数的发布**必须**开启“版本发布”功能，以便在出现问题时可以快速回滚到上一个稳定版本。