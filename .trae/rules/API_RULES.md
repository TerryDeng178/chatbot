# 云函数接口规则 (API_RULES.md)

**引言**
*   本文档为本项目所有**云函数**的设计、开发和维护提供统一的、强制性的规范。
*   **目标**: 确保所有云函数接口都具备清晰性 (Clarity)、一致性 (Consistency)、易用性 (Usability) 和可预测性 (Predictability)。

**第一章：核心原则 (Core Principles)**
1.  **函数即服务 (Function as a Service)**: 每个云函数都是一个独立的、原子化的服务，负责一项明确的业务逻辑。
2.  **无状态 (Stateless)**: 每个云函数都应是无状态的，不依赖于先前调用的上下文。
3.  **JSON独占**: 云函数的数据交换格式**必须**是JSON。
4.  **调用方式**: 前端**必须**通过 `Taro.cloud.callFunction` 来调用云函数。

**第二章：命名与职责 (Naming & Responsibility)**
1.  **命名规范**: 云函数名称应清晰地反映其功能，采用 `资源-操作` 的格式。
    *   **正确**: `user-login`, `chat-sendMessage`, `character-getList`
    *   **错误**: `login`, `send`, `getCharacters`
2.  **单一职责**: 每个云函数应严格遵守单一职责原则，只做一件事情并把它做好。
    *   例如，`user-login` 只负责用户登录逻辑，不应包含获取用户信息的逻辑。获取用户信息应由另一个函数 `user-getInfo` 负责。

**第三章：输入与输出规范 (Input & Output Specification)**
1.  **统一输入**: 所有云函数的调用都通过一个 `event` 对象接收参数。我们约定，所有业务参数都放置在 `event.data` 字段中。
    ```typescript
    // 调用示例
    Taro.cloud.callFunction({
      name: 'chat-sendMessage',
      data: {
        characterId: 'char-007',
        content: '你好！'
      }
    });
    ```
2.  **统一输出**: 所有云函数的返回结果（无论成功或失败）都**必须**使用统一的包装结构：
    ```json
    {
      "success": boolean,
      "code": number,
      "message": string,
      "data": object | array | null
    }
    ```
3.  **业务状态码 (`code`)**: 我们将维护一个专门的业务状态码文档，用于提供精细的业务状态信息。
    *   例如，`20001`: 操作成功, `40001`: 参数无效, `50001`: 数据库操作失败。
4.  **空数据**: 如果一个请求成功但没有数据返回（例如，一个空的列表），`data` 字段应返回一个空数组 `[]` 或 `null`，而不是省略该字段。

**第四章：身份认证与权限 (Authentication & Permissions)**
1.  **隐式认证**: 云函数天然可以获取到调用用户的 `OPENID`，这是识别用户身份的主要方式。
2.  **权限控制**: 对于需要特定权限的操作（例如，管理员操作），必须在云函数内部进行显式的权限检查。

**第五章：文档 (Documentation)**
1.  **强制文档**: **每一个**云函数都必须有对应的文档说明。
2.  **位置**: 云函数的文档将集中记录在 `.trae/rules/TECHNICAL_ARCHITECTURE_RULES.md` 文件中。
3.  **内容**: 文档必须清晰地描述函数的功能、`event.data` 的输入参数（字段、类型、是否必需）以及返回结果中 `data` 字段的结构。
4.  **同步**: 云函数的代码或逻辑发生任何变更，都必须同步更新到文档中。

**第六章：业务函数示例 (Business Function Examples)**

本章节提供核心业务的云函数设计示例，所有相关函数都应遵循此结构。

1.  **获取广告配置**
    *   **功能**: 客户端启动或在需要展示广告前，调用此函数获取最新的广告配置。
    *   **函数名**: `ads-getConfig`
    *   **输入 (`event.data`)**: (无)
    *   **成功响应 (`return`)**:
        ```json
        {
          "success": true,
          "code": 20000,
          "message": "获取成功",
          "data": {
            "adUnitId": "adunit-xxxxxxxxxxxx"
          }
        }
        ```

2.  **上报AI角色解锁**
    *   **功能**: 当用户成功观看完激励视频广告后，客户端调用此函数，告知服务器为该用户解锁指定的AI角色。
    *   **函数名**: `user-unlockCharacter`
    *   **输入 (`event.data`)**:
        ```json
        {
          "characterId": "char-007"
        }
        ```
    *   **成功响应 (`return`)**:
        ```json
        {
          "success": true,
          "code": 20000,
          "message": "角色解锁成功",
          "data": {
            "unlockedCharacterIds": ["char-001", "char-005", "char-007"]
          }
        }
        ```