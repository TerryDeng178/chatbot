// pages/group-chat/group-chat.js
const app = getApp()

Page({
  data: {
    groupId: '',
    groupName: '',
    messageList: [],
    inputMessage: '',
    loading: false,
    sending: false,
    refreshing: false,
    isOnline: true,
    showMemberModal: false,
    memberList: [],
    scrollToView: '',
    page: 1,
    pageSize: 20,
    hasMore: true,
    userScrolled: false, // 用户是否手动滚动过
    lastScrollTop: 0, // 记录上次滚动位置
    lastPollTime: null, // 记录上次轮询时间，用于去重
    messagesLoaded: false, // 消息是否已加载完成
    // AI相关
    aiPersonalities: [],
    activeAIs: [1, 2, 3], // 当前激活的AI列表，默认3个
    // 添加AI相关
    showAddAISelector: false,
    availableAIs: [], // 可添加的AI列表
    // 预处理后的AI标签数据
    activeAITags: [], // 当前激活AI的标签数据
    aiStatusList: [], // AI状态列表数据
    // AI回复频率控制
    aiReplyFrequency: {
      lastReplyTime: {}, // 每个AI的最后回复时间
      minInterval: 30000, // 最小回复间隔（毫秒）
      maxRepliesPerMinute: 2, // 每分钟最大回复次数
      replyCounts: {}, // 每个AI的回复计数
      cooldownPeriod: 60000 // 冷却期（毫秒）
    },
    // AI性能监控
    aiPerformance: {
      totalReplies: 0, // 总回复次数
      averageResponseTime: 0, // 平均响应时间
      successRate: 100, // 成功率
      lastUpdateTime: null, // 最后更新时间
      performanceHistory: [] // 性能历史记录
    },
    // 群聊管理相关
    showCreateGroupModal: false,
    newGroupData: {
      groupName: '',
      description: '',
      avatar: '👥',
      maxMembers: 100,
      isPublic: true,
      initialAIs: [1, 2, 3],
      initialAINames: ['温情', '智慧', '幽默'], // 预处理后的AI昵称
      tags: []
    },
    showGroupInfoModal: false,
    showEditGroupModal: false,
    editGroupData: {},
    groupInfo: {}, // 群聊详细信息
    showMemberManagementModal: false,
    // 新增的群聊信息字段
    groupDescription: '',
    groupAvatar: '👥',
    groupMaxMembers: 100,
    groupIsPublic: true,
    groupTags: [],
    // 新增的成员管理字段
    memberOpenid: '',
    memberName: '',
    memberRole: '',
    // 新增的转让群主字段
    newOwnerOpenid: '',
    // 新增的离开群聊字段
    isLeavingGroup: false,
    // 新增的转让群主字段
    isTransferringOwnership: false,
    // 新增的群聊头像选择
    groupAvatars: ['👥', '🎉', '🌟', '💬', '🚀', '🎯', '🌈', '🎨', '💡', '🔮'],
    // 新增：智能轮询相关
    pollingTimer: null,
    pollingInterval: 8000, // 基础轮询间隔8秒
    adaptivePolling: true, // 是否启用自适应轮询
    lastMessageCount: 0, // 上次消息数量
    consecutiveEmptyPolls: 0, // 连续空轮询次数
    maxEmptyPolls: 3, // 最大连续空轮询次数
    // 成员列表缓存
    memberListCache: null,
    lastMemberUpdate: null,
    // 防重复触发标志
    isFirstLoad: true, // 是否是首次加载
    hasTriggeredAIReply: false, // 是否已经触发过AI回复
    lastAIReplyTime: 0, // 上次AI回复时间
    pendingWelcomeMessage: null // 等待添加到消息列表的欢迎消息
  },

  // 统一近时窗去重：即使ID不同，只要在2秒窗口内同角色+同内容也视为重复
  dedupeMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return messages || []
    const seenIds = new Set()
    const result = []
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      const mid = m._id || m.id
      let isDup = false
      if (mid && seenIds.has(mid)) {
        isDup = true
      }
      // 近时窗策略（检查最近10条）
      if (!isDup) {
        for (let j = result.length - 1; j >= 0 && j >= result.length - 10; j--) {
          const prev = result[j]
          const sameRole = (prev.role || prev.senderType || '') === (m.role || m.senderType || '')
          const sameContent = (prev.content || '') === (m.content || '')
          const dt = Math.abs((this.parseTs(prev.createdAt || prev.timestamp) || 0) - (this.parseTs(m.createdAt || m.timestamp) || 0))
          if (sameRole && sameContent && dt <= 2000) { // 2秒窗口
            isDup = true
            break
          }
        }
      }
      if (!isDup) {
        if (mid) seenIds.add(mid)
        result.push(m)
      }
    }
    return result
  },

  /**
   * 页面加载
   */
  onLoad(options) {
    console.log('群聊页面加载:', options)
    
    if (options.groupId) {
      this.setData({ groupId: options.groupId })
      this.loadGroupInfo()
      
      // 检查是否是首次进入该群聊，避免重复显示欢迎消息
      const welcomeKey = `welcome_${options.groupId}`
      const hasShownWelcome = wx.getStorageSync(welcomeKey)

      // 修复：读取最近一次发送签名，用于避免返回页面时误触发相同内容
      try {
        this.lastSendSignature = wx.getStorageSync('last_send_signature') || ''
      } catch (_) { this.lastSendSignature = '' }
      
      if (!hasShownWelcome) {
        // 只在首次进入时添加默认欢迎消息，但不立即添加到messageList
        // 而是等待loadMessages完成后再添加，确保正确的消息顺序
        this.setData({
          pendingWelcomeMessage: {
            id: `welcome_${Date.now()}`,
            _id: `welcome_${Date.now()}`,
            role: 'assistant', // 明确标记为AI消息
            content: '欢迎来到群聊！我是AI助手，有什么可以帮助您的吗？',
            time: this.formatMessageTime(new Date()),
            createdAt: new Date().toISOString(),
            timestamp: Date.now(),
            // 添加AI角色信息，确保名字能正确显示
            aiCharacter: {
              nickname: 'AI助手',
              name: '智能助手',
              avatar: '🤖'
            },
            // 添加明确的标记，防止被误识别
            isSystemMessage: true,
            isWelcomeMessage: true,
            senderType: 'ai' // 明确标记发送者类型
          }
        })
        
        // 标记已显示欢迎消息
        wx.setStorageSync(welcomeKey, true)
      }
      
      // 先加载历史消息，欢迎消息会在loadMessages完成后添加
      this.loadMessages()
    }
    
    // 加载AI性格列表
    this.loadAIPersonalities()
    
    // 开始心跳检测
    this.startHeartbeat()
    
    // 注意：startSmartPolling 将在 loadMessages 完成后调用，确保消息顺序正确
  },

  onShow() {
    // 页面显示时报告在线状态
    this.reportPresence('group-chat')
    
    // 重置防重复触发标志，允许用户主动触发AI回复
    this.setData({
      isFirstLoad: false,
      // 关键修复：不要在页面重新进入时把 hasTriggeredAIReply 重置为 false，避免之前延迟触发的计时器在回到页面后再次触发
      // hasTriggeredAIReply: 保持原值
      sending: false,
      pendingWelcomeMessage: null
    })
    
    console.log('🔄 页面显示，重置状态:', {
      isFirstLoad: false,
      hasTriggeredAIReply: this.data.hasTriggeredAIReply,
      lastAIReplyTime: this.data.lastAIReplyTime,
      sending: false,
      pendingWelcomeMessage: null
    })
    
    // 注意：startSmartPolling 已经在 loadMessages 完成后调用，这里不需要重复调用
    // 只有在消息已加载的情况下才继续轮询
    if (this.data.messagesLoaded && this.data.messageList.length > 0) {
      // 如果轮询已停止，重新启动
      if (!this.data.pollingTimer) {
        this.startSmartPolling()
      }
    }
  },

  onHide() {
    // 页面隐藏时停止轮询
    this.stopSmartPolling()
  },

  onUnload() {
    // 页面卸载时清理资源
    this.stopHeartbeat()
    this.stopSmartPolling()
  },

  /**
   * 开始心跳检测
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.reportPresence('group-chat')
    }, 30000) // 30秒一次
  },

  /**
   * 停止心跳检测
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  },

  /**
   * 报告在线状态
   */
  reportPresence(page) {
    app.cloudCall('user-report-presence', { page })
      .then(res => {
        if (res.result && res.result.success) {
          this.setData({ isOnline: true })
        }
      })
      .catch(err => {
        console.warn('报告在线状态失败:', err)
        this.setData({ isOnline: false })
      })
  },

  /**
   * 加载群聊信息
   */
  loadGroupInfo() {
    // 这里可以调用后端接口获取群聊详细信息
    console.log('📋 加载群聊信息:', this.data.groupId)
    app.cloudCall('group-chat-info', { groupId: this.data.groupId })
      .then(res => {
        console.log('📥 加载群聊信息返回结果:', res)
        if (res.result && res.result.success) {
          const raw = res.result.data || {}
          // 兜底，避免 setData 传入 undefined
          const safe = {
            name: raw.groupName || raw.name || '群聊',
            description: raw.description || '',
            avatar: raw.avatar || '👥',
            maxMembers: typeof raw.maxMembers === 'number' ? raw.maxMembers : 100,
            isPublic: typeof raw.isPublic === 'boolean' ? raw.isPublic : true,
            tags: Array.isArray(raw.tags) ? raw.tags : []
          }
          this.setData({
            groupInfo: { ...raw, groupName: safe.name, description: safe.description, avatar: safe.avatar, maxMembers: safe.maxMembers, isPublic: safe.isPublic, tags: safe.tags },
            groupName: safe.name,
            groupDescription: safe.description,
            groupAvatar: safe.avatar,
            groupMaxMembers: safe.maxMembers,
            groupIsPublic: safe.isPublic,
            groupTags: safe.tags
          })
          // 注意：AI标签数据会在 loadAIPersonalities 完成后更新，这里不调用 updateAITags
          console.log('✅ 群聊信息加载完成，等待AI数据加载后更新标签')
        } else {
          console.error('❌ 加载群聊信息失败:', res.result?.message || '未知错误')
        }
      })
      .catch(err => {
        console.error('🔥 调用加载群聊信息云函数失败:', err)
      })
  },

  /**
   * 加载AI性格列表
   */
  loadAIPersonalities() {
    console.log('🚀 开始加载AI性格列表...')
    app.cloudCall('get-ai-personalities')
      .then(res => {
        console.log('🔍 获取AI性格列表返回:', res)
        console.log('🔍 返回结果详情:', {
          hasResult: !!res.result,
          resultType: typeof res.result,
          resultKeys: res.result ? Object.keys(res.result) : 'null',
          success: res.result?.success,
          message: res.result?.message,
          data: res.result?.data,
          code: res.result?.code
        })
        
        if (res.result && res.result.success) {
          const personalities = res.result.data?.personalities || res.result.data || []
          console.log('✅ AI性格列表获取成功，共', personalities.length, '个')
          this.setData({ aiPersonalities: personalities })
          
          // 预处理AI标签数据
          this.updateAITags()
          
          // 如果AI性格列表为空，尝试初始化数据库
          if (personalities.length === 0) {
            console.log('⚠️ AI性格列表为空，尝试初始化数据库...')
            this.initDatabase()
          }
        } else {
          console.error('❌ 获取AI性格列表失败:', {
            message: res.result?.message || '未知错误',
            code: res.result?.code,
            data: res.result?.data
          })
          // 尝试初始化数据库
          this.initDatabase()
        }
      })
      .catch(err => {
        console.error('🔥 调用AI性格列表云函数失败:', err)
        // 尝试初始化数据库
        this.initDatabase()
      })
  },

  /**
   * 初始化数据库
   */
  initDatabase() {
    console.log('🔄 开始初始化数据库...')
    app.cloudCall('init-database')
      .then(res => {
        console.log('🔍 数据库初始化返回:', res)
        console.log('🔍 数据库初始化结果详情:', {
          hasResult: !!res.result,
          resultType: typeof res.result,
          resultKeys: res.result ? Object.keys(res.result) : 'null',
          success: res.result?.success,
          message: res.result?.message,
          code: res.result?.code,
          data: res.result?.data
        })
        
        if (res.result && res.result.success) {
          console.log('✅ 数据库初始化成功，重新获取AI性格列表')
          // 延迟一下再重新获取
          setTimeout(() => {
            console.log('⏰ 延迟2秒后重新获取AI性格列表...')
            this.loadAIPersonalities()
          }, 2000)
        } else {
          console.error('❌ 数据库初始化失败:', {
            message: res.result?.message || '未知错误',
            code: res.result?.code,
            data: res.result?.data
          })
        }
      })
      .catch(err => {
        console.error('🔥 调用数据库初始化云函数失败:', err)
      })
  },

  /**
   * 更新AI标签数据
   */
  updateAITags() {
    const { activeAIs, aiPersonalities } = this.data
    
    // 防护：如果AI性格列表为空，直接返回
    if (!aiPersonalities || aiPersonalities.length === 0) {
      console.log('⚠️ AI性格列表为空，跳过标签更新')
      return
    }
    
    // 防护：如果activeAIs为空或无效，使用默认值
    if (!activeAIs || !Array.isArray(activeAIs) || activeAIs.length === 0) {
      console.log('⚠️ activeAIs无效，使用默认值')
      this.setData({ activeAIs: [1, 2, 3] })
      return
    }
    
    // 生成激活AI的标签数据
    const activeAITags = activeAIs.map(aiId => {
      const ai = aiPersonalities.find(p => p.id === aiId)
      if (!ai) {
        console.log(`⚠️ 未找到AI ID ${aiId}，使用默认值`)
        return {
          id: aiId,
          name: 'AI助手',
          nickname: 'AI助手',
          avatar: '🤖',
          personality: '智能助手',
          description: '智能AI助手'
        }
      }
      return {
        id: aiId,
        name: ai.name || 'AI助手',
        nickname: ai.nickname || ai.name || 'AI助手',
        avatar: ai.avatar || '🤖',
        personality: ai.personality || '智能助手',
        description: ai.description || '智能AI助手'
      }
    })
    
    // 生成AI状态列表数据
    const aiStatusList = aiPersonalities.map(ai => ({
      ...ai,
      isActive: activeAIs.includes(ai.id)
    }))
    
    this.setData({
      activeAITags,
      aiStatusList
    })
    
    console.log('✅ AI标签数据已更新:', { activeAITags, aiStatusList })
  },

  /**
   * 切换AI激活状态
   */
  toggleAIStatus(e) {
    const { aiId } = e.currentTarget.dataset
    const { activeAIs } = this.data
    
    let newActiveAIs
    let action
    let message
    
    if (activeAIs.includes(aiId)) {
      // 如果已激活，则停用
      newActiveAIs = activeAIs.filter(id => id !== aiId)
      action = '停用'
      message = `${this.getAINickname(aiId)} 已停用`
    } else {
      // 如果未激活，则激活
      if (activeAIs.length >= 5) {
        wx.showToast({
          title: '最多只能激活5个AI',
          icon: 'none',
          duration: 2000
        })
        return
      }
      newActiveAIs = [...activeAIs, aiId]
      action = '激活'
      message = `${this.getAINickname(aiId)} 已激活`
    }
    
    this.setData({ activeAIs: newActiveAIs })
    
    // 更新AI标签数据
    this.updateAITags()
    
    // 发送系统消息通知
    this.addSystemMessage(message)
    
    // 显示操作结果
    wx.showToast({
      title: `已${action}AI助手`,
      icon: 'success',
      duration: 1500
    })
    
    console.log(`AI状态已切换: ${action} AI ${aiId}`)
  },

  /**
   * 开始智能轮询
   */
  startSmartPolling() {
    // 清除之前的定时器
    this.stopSmartPolling()
    
    // 计算当前轮询间隔
    const currentInterval = this.calculatePollingInterval()
    
    const timer = setInterval(() => {
      if (this.data.isOnline && !this.data.loading) {
        this.loadNewMessages()
      }
    }, currentInterval)
    
    this.setData({ 
      pollingTimer: timer,
      pollingInterval: currentInterval
    })
    
    console.log(`🔄 启动智能轮询，间隔: ${currentInterval}ms`)
  },

  /**
   * 停止智能轮询
   */
  stopSmartPolling() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer)
      this.setData({ pollingTimer: null })
      console.log('⏹️ 停止智能轮询')
    }
  },

  /**
   * 计算轮询间隔（智能调整）
   */
  calculatePollingInterval() {
    if (!this.data.adaptivePolling) {
      return this.data.pollingInterval
    }
    
    const { consecutiveEmptyPolls, lastMessageCount, messageList } = this.data
    const currentMessageCount = messageList.length
    
    // 基础间隔
    let interval = 8000 // 8秒
    
    // 如果连续多次轮询都没有新消息，增加间隔
    if (consecutiveEmptyPolls >= 2) {
      interval = Math.min(interval * (1 + consecutiveEmptyPolls * 0.5), 30000) // 最大30秒
    }
    
    // 如果最近有新消息，缩短间隔
    if (currentMessageCount > lastMessageCount) {
      interval = Math.max(interval * 0.7, 3000) // 最短3秒
    }
    
    // 如果用户正在活跃输入，进一步缩短间隔
    if (this.data.inputMessage && this.data.inputMessage.length > 0) {
      interval = Math.max(interval * 0.5, 2000) // 最短2秒
    }
    
    return Math.round(interval)
  },

  /**
   * 动态调整轮询间隔
   */
  adjustPollingInterval() {
    if (!this.data.adaptivePolling) return
    
    const newInterval = this.calculatePollingInterval()
    if (newInterval !== this.data.pollingInterval) {
      console.log(`🔄 调整轮询间隔: ${this.data.pollingInterval}ms → ${newInterval}ms`)
      
      // 重新启动轮询
      this.stopSmartPolling()
      this.startSmartPolling()
    }
  },

  /**
   * 轮询新消息
   */
  loadNewMessages() {
    // 如果消息还没有加载完成，不进行轮询
    if (!this.data.messagesLoaded || this.data.messageList.length === 0) {
      return
    }

    const app = getApp()
    const lastMessage = this.data.messageList[this.data.messageList.length - 1]
    const lastMessageTime = this.parseTs(lastMessage.createdAt || lastMessage.timestamp)
    const lastMessageId = lastMessage.id || lastMessage._id || ''

    const afterTime = this.lastAcceptedTs || lastMessageTime
    const afterId = this.lastAcceptedId || lastMessageId
    console.log('polling after =>', afterTime, afterId)
    
    // 防止重复加载：时间去重 + 最近发送签名去重
    if (this.data.lastPollTime && lastMessageTime <= this.data.lastPollTime) {
      return
    }
    
    // 使用群聊专用的消息获取云函数
    app.cloudCall('group-chat-get-messages', {
      groupId: this.data.groupId,
      page: 1,
      pageSize: 20, // 减少每次加载的消息数量
      afterTime: afterTime, // 只获取指定时间之后的消息
      afterId: afterId,
      phase: 'poll'
    })
    .then(res => {
      console.log('📥 轮询新消息返回结果:', res)
      
      if (res.result && res.result.success) {
        const newMessages = res.result.data?.messages || []
        if (newMessages.length > 0) {
          const first = newMessages[0]
          console.log('server first =>', first?.createdAt || first?.timestamp, first?.id || first?._id)
        }
        const currentMessageCount = this.data.messageList.length
        
        if (newMessages.length > 0) {
          console.log('🆕 发现新消息:', newMessages.length, '条')
          
          // 严格窗口过滤：createdAt > afterTime 或 (== 且 id > afterId)
          const baseMs = afterTime || 0
          const strictFiltered = newMessages.filter(m => {
            const ms = this.parseTs(m.createdAt || m.timestamp)
            if (ms > baseMs) return true
            if (ms === baseMs && (m.id || m._id)) return String(m.id || m._id) > String(afterId || '')
            return false
          })

          // 增强去重处理，避免重复消息 - 使用多种ID字段和内容进行去重
          const existingIds = new Set()
          const existingContents = new Set()
          
          this.data.messageList.forEach(msg => {
            if (msg._id) existingIds.add(msg._id)
            if (msg.id) existingIds.add(msg.id)
            // 添加内容去重，防止相同内容的消息重复显示
            if (msg.content) {
              const contentKey = `${msg.role}_${msg.content}_${msg.timestamp}`
              existingContents.add(contentKey)
            }
          })
          
            const lastSig = this.lastSendSignature
            const uniqueNewMessages = strictFiltered.filter(msg => {
            const msgId = msg._id || msg.id
            const contentKey = `${msg.role || 'user'}_${msg.content || ''}_${msg.timestamp || msg.createdAt || 0}`
            
            // 检查ID和内容是否重复
            const isIdDuplicate = msgId && existingIds.has(msgId)
            const isContentDuplicate = contentKey && existingContents.has(contentKey)
            
            // 增强本地消息去重检查：检查5秒内的相同内容消息
            const isLocalMessage = this.data.messageList.some(localMsg => {
              if (!localMsg.isLocalMessage) return false
              
              // 检查内容是否相同
              const contentMatch = localMsg.content === msg.content
              // 检查时间是否在5秒内
              const timeMatch = Math.abs((localMsg.timestamp || 0) - (msg.timestamp || msg.createdAt || 0)) < 5000
              // 检查角色是否相同
              const roleMatch = localMsg.role === (msg.role || 'user')
              
              return contentMatch && timeMatch && roleMatch
            })
            
            // 新增：检查是否是系统消息或欢迎消息，如果是则跳过
            const isSystemOrWelcomeMessage = msg.isSystemMessage || msg.isWelcomeMessage || msg.senderType === 'system'
            
             // 新增：若命中最近发送签名（刷新/返回场景极短期重复），则跳过
             const matchesLastSignature = lastSig && msg.content && lastSig.startsWith(msg.content)
             if (isIdDuplicate || isContentDuplicate || isLocalMessage || isSystemOrWelcomeMessage || matchesLastSignature) {
              console.log('🚫 跳过重复或系统消息:', {
                id: msgId,
                content: msg.content?.substring(0, 20),
                 reason: isIdDuplicate ? 'ID重复' : isContentDuplicate ? '内容重复' : isLocalMessage ? '本地消息重复' : (matchesLastSignature ? '命中发送签名' : '系统消息'),
                localMessage: isLocalMessage,
                isSystemOrWelcome: isSystemOrWelcomeMessage
              })
              return false
            }
            
            return true
          })
          
          if (uniqueNewMessages.length > 0) {
            // 格式化新消息，确保ID格式一致
            const formattedNewMessages = uniqueNewMessages.map(msg => {
              const isAIMessage = msg.senderType === 'ai' || msg.role === 'assistant'
              
              // 为AI消息添加角色信息
              let aiCharacter = null
              if (isAIMessage) {
                // 尝试从消息中获取AI角色信息
                aiCharacter = msg.aiCharacter || msg.character || {
                  nickname: msg.aiName || msg.senderName || 'AI助手',
                  name: msg.aiType || msg.personality || '智能助手',
                  avatar: msg.avatar || '🤖'
                }
              }
              
              return {
                ...msg,
                time: this.formatMessageTime(msg.createdAt || msg.timestamp),
                id: msg._id || msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                role: isAIMessage ? 'assistant' : 'user', // 转换角色类型
                aiCharacter: aiCharacter // 添加AI角色信息
              }
            })
            
            console.log('✅ 添加新消息:', formattedNewMessages.length, '条')
            
            // 按时间戳排序，确保消息顺序正确
            // 注意：这里只对新消息进行排序，不重新排序整个列表，避免破坏现有顺序
            const sortedNewMessages = formattedNewMessages.sort((a, b) => {
              const timeA = this.parseTs(a.createdAt || a.timestamp || 0)
              const timeB = this.parseTs(b.createdAt || b.timestamp || 0)
              return timeA - timeB
            })
            
            // 将新消息追加到现有消息列表后面，保持原有顺序
            // 在追加前，移除本地临时的用户消息（与服务端同内容且时间接近）以避免视觉重复
            const cleanedExisting = this.data.messageList.filter(m => {
              if (!m.isLocalMessage || m.role !== 'user') return true
              const isCoveredByServer = sortedNewMessages.some(n => {
                if (n.role !== 'user') return false
                const dt = Math.abs((this.parseTs(n.createdAt || n.timestamp) || 0) - (m.timestamp || 0))
                const clientMatch = n.meta && n.meta.clientMsgId && m.clientMsgId && (n.meta.clientMsgId === m.clientMsgId)
                return clientMatch || (n.content === m.content && dt < 60000) // 优先用 clientMsgId，其次60秒内内容一致
              })
              return !isCoveredByServer
            })
            const updatedMessageList = this.dedupeMessages([...cleanedExisting, ...sortedNewMessages])
            
            const maxAcceptedTs = sortedNewMessages.reduce((mx, m) => {
              const t = this.parseTs(m.createdAt || m.timestamp || 0)
              return t > mx ? t : mx
            }, this.data.lastPollTime || 0)
            const maxAcceptedId = sortedNewMessages[sortedNewMessages.length - 1]?.id || sortedNewMessages[sortedNewMessages.length - 1]?._id || afterId

            this.setData({
              messageList: updatedMessageList,
              lastPollTime: maxAcceptedTs || Date.now(),
              consecutiveEmptyPolls: 0, // 重置连续空轮询计数
              lastMessageCount: currentMessageCount
            })
            this.lastAcceptedTs = maxAcceptedTs || this.lastAcceptedTs
            this.lastAcceptedId = maxAcceptedId || this.lastAcceptedId
            
            // 只有在用户没有手动滚动时才自动滚动到底部
            this.scrollToBottom()
            
            // 调整轮询间隔
            this.adjustPollingInterval()
          } else {
            // 服务器返回了消息，但全部被判定为重复或系统消息
            // 为避免下一次轮询仍然拿到同一批数据，推进 lastPollTime 到这批返回的最大时间戳
            const maxTs = newMessages.reduce((mx, m) => {
              const t = this.parseTs(m.createdAt || m.timestamp || 0)
              return t > mx ? t : mx
            }, this.data.lastPollTime || 0)
            if (maxTs) {
              this.setData({ lastPollTime: maxTs })
            }
            this.handleEmptyPoll()
          }
        } else {
          // 没有新消息
          this.handleEmptyPoll()
        }
      } else {
        // 处理轮询失败的情况
        const errorMessage = res.result?.message || res.result?.error || '未知错误'
        console.warn('⚠️ 轮询新消息失败:', {
          message: errorMessage,
          code: res.result?.code || '未知代码'
        })
        
        // 轮询失败时增加间隔
        this.handlePollingError()
      }
    }).catch(error => {
      console.error('💥 轮询新消息异常:', error)
      this.handlePollingError()
    })
  },

  /**
   * 处理空轮询
   */
  handleEmptyPoll() {
    const { consecutiveEmptyPolls } = this.data
    const newCount = consecutiveEmptyPolls + 1
    
    this.setData({
      consecutiveEmptyPolls: newCount,
      lastPollTime: this.lastAcceptedTs || Date.now()
    })
    
    console.log(`📭 连续空轮询: ${newCount}/${this.data.maxEmptyPolls}`)
    
    // 如果连续多次空轮询，调整间隔
    if (newCount >= 2) {
      this.adjustPollingInterval()
    }
  },

  /**
   * 处理轮询错误
   */
  handlePollingError() {
    const { consecutiveEmptyPolls } = this.data
    const newCount = consecutiveEmptyPolls + 1
    
    this.setData({
      consecutiveEmptyPolls: newCount,
      lastPollTime: this.lastAcceptedTs || Date.now()
    })
    
    // 错误时增加轮询间隔
    this.adjustPollingInterval()
  },

  // 解析各种时间格式为 number
  parseTs(v) {
    if (!v) return 0
    if (typeof v === 'number') return v
    if (v instanceof Date) return v.getTime()
    const t = Date.parse(v)
    return isNaN(t) ? 0 : t
  },

  /**
   * 加载消息列表（初始加载和下拉刷新）
   */
  loadMessages(silent = false) {
    if (!silent) {
      this.setData({ loading: true })
    }

    const app = getApp()
    // 使用群聊专用的消息获取云函数
    app.cloudCall('group-chat-get-messages', {
      groupId: this.data.groupId,
      page: this.data.page,
      pageSize: this.data.pageSize,
      phase: 'initial'
    })
    .then(res => {
      console.log('📥 云函数返回结果:', res)
      
      if (res.result && res.result.success) {
        const messages = res.result.data?.messages || []
        console.log('✅ 成功加载消息:', messages.length, '条')
        
        // 格式化消息时间，确保ID格式一致
        const formattedMessages = messages.map(msg => {
          const isAIMessage = msg.senderType === 'ai' || msg.role === 'assistant'
          
          // 为AI消息添加角色信息
          let aiCharacter = null
          if (isAIMessage) {
            // 尝试从消息中获取AI角色信息
            aiCharacter = msg.aiCharacter || msg.character || {
              nickname: msg.aiName || msg.senderName || 'AI助手',
              name: msg.aiType || msg.personality || '智能助手',
              avatar: msg.avatar || '🤖'
            }
          }
          
          return {
            ...msg,
            time: this.formatMessageTime(msg.createdAt || msg.timestamp),
            id: msg._id || msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: isAIMessage ? 'assistant' : 'user', // 转换角色类型
            aiCharacter: aiCharacter // 添加AI角色信息
          }
        })
        
        // 如果是第一页，保留欢迎消息并追加历史消息；如果是加载更多，则追加
        if (this.data.page === 1) {
          // 检查是否有待添加的欢迎消息
          let newMessageList = formattedMessages
          
          if (this.data.pendingWelcomeMessage) {
            // 将欢迎消息添加到历史消息之前，确保正确的顺序
            // 但首先验证欢迎消息的完整性
            const welcomeMsg = this.data.pendingWelcomeMessage
            if (welcomeMsg && welcomeMsg.isWelcomeMessage && welcomeMsg.role === 'assistant') {
              newMessageList = [welcomeMsg, ...formattedMessages]
              console.log('✅ 添加欢迎消息到消息列表')
            } else {
              console.log('❌ 欢迎消息格式不正确，跳过添加')
            }
            // 清除待添加的欢迎消息
            this.setData({ pendingWelcomeMessage: null })
          }
          
          // 统一近时窗去重，避免初始化阶段临近重复
          newMessageList = this.dedupeMessages(newMessageList)

          // 初始化游标：使用服务端返回的最后一条真实消息（不含欢迎本地注入）
          const lastServerMsg = formattedMessages[formattedMessages.length - 1]
          const initAcceptedTs = this.parseTs(lastServerMsg?.createdAt || lastServerMsg?.timestamp)
          const initAcceptedId = lastServerMsg?.id || lastServerMsg?._id || ''

          this.setData({
            messageList: newMessageList,
            loading: false,
            hasMore: messages.length === this.data.pageSize,
            lastPollTime: initAcceptedTs || Date.now(), // 记录加载时间（服务端时间）
            messagesLoaded: true // 标记消息已加载完成
          })
          this.lastAcceptedTs = initAcceptedTs || this.lastAcceptedTs
          this.lastAcceptedId = initAcceptedId || this.lastAcceptedId
          
          // 在消息加载完成后再开始智能轮询，确保消息顺序正确
          this.startSmartPolling()
        } else {
          this.setData({
            messageList: [...formattedMessages, ...this.data.messageList],
            loading: false,
            hasMore: messages.length === this.data.pageSize
          })
        }
        
        // 滚动到底部（仅在第一页加载时）
        if (this.data.page === 1) {
          this.scrollToBottom()
        }
      } else {
        // 更详细的错误处理
        const errorMessage = res.result?.message || res.result?.error || '未知错误'
        const errorCode = res.result?.code || '未知代码'
        console.error('❌ 加载消息失败:', {
          message: errorMessage,
          code: errorCode,
          fullResult: res.result,
          fullResponse: res
        })
        
        this.setData({ loading: false })
        
        // 显示错误提示
        wx.showToast({
          title: `加载失败: ${errorMessage}`,
          icon: 'error',
          duration: 3000
        })
      }
    }).catch(error => {
      console.error('💥 获取消息异常:', error)
      if (!silent) {
        this.setData({ loading: false })
        
        // 显示错误提示
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'error',
          duration: 2000
        })
      }
    })
  },

  /**
   * 发送消息
   */
  sendMessage() {
    const message = this.data.inputMessage.trim()
    if (!message) return
    
    // 防重复发送：检查是否正在发送中
    if (this.data.sending) {
      console.log('❌ 正在发送中，忽略重复发送')
      return
    }
    
    // 新增：检查是否是系统自动发送
    if (this.data.isFirstLoad) {
      console.log('❌ 页面首次加载中，禁止发送消息')
      return
    }
    
    // 新增：检查消息内容是否为空或无效
    if (!message || message.length === 0) {
      console.log('❌ 消息内容为空，禁止发送')
      return
    }
    
    // 新增：检查是否是系统消息或欢迎消息
    if (message.includes('欢迎来到群聊') || message.includes('AI助手')) {
      console.log('❌ 检测到系统消息内容，禁止发送')
      return
    }
    
    console.log('发送消息:', message)
    console.log('当前消息列表长度:', this.data.messageList.length)
    
    // 清空输入框
    this.setData({
      inputMessage: '',
      sending: true
    })
    
    // 添加用户消息到列表，使用唯一ID - 增强唯一性
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    const clientMsgId = `user_${timestamp}_${randomId}`
    const userMessage = {
      id: `user_${timestamp}_${randomId}`,
      _id: `user_${timestamp}_${randomId}`, // 确保_id也存在
      role: 'user',
      content: message,
      time: this.formatMessageTime(timestamp),
      createdAt: timestamp,
      timestamp: timestamp,
      // 添加发送状态标记，防止重复处理
      isLocalMessage: true,
      sendTime: timestamp,
      // 新增：明确标记为用户消息
      isUserMessage: true,
      clientMsgId: clientMsgId,
      senderType: 'user'
    }
    
    console.log('用户消息对象:', userMessage)
    
    const newMessageList = [...this.data.messageList, userMessage]
    console.log('更新后的消息列表长度:', newMessageList.length)
    console.log('最新消息:', newMessageList[newMessageList.length - 1])
    
    this.setData({
      messageList: newMessageList
    })
    
    // 滚动到底部
    this.scrollToBottom()
    
    // 检查是否有多AI模式
    if (this.data.activeAIs.length === 0) {
      wx.showToast({
        title: '请先激活AI助手',
        icon: 'none'
      })
      // 重置发送状态
      this.setData({ sending: false })
      return
    }
    
    // 多AI模式：使用新的多AI云函数
    this.sendMessageWithMultiAI(message, clientMsgId)

    // 关键修复：发送后即刻设置窗口级别的“最近发送内容签名”，用于页面返回时去重
    try {
      const sig = `${message}_${Date.now()}`
      wx.setStorageSync('last_send_signature', sig)
      this.lastSendSignature = sig
    } catch (_) {}
  },

  /**
   * 保存消息到数据库
   */
  saveMessageToDatabase(content) {
    const app = getApp()
    app.cloudCall('group-chat-send-message', {
      groupId: this.data.groupId,
      content: content,
      type: 'text'
    })
    .then(res => {
      console.log('✅ 消息保存成功:', res)
      if (res.result.success) {
        // 更新本地消息的ID为服务器返回的ID
        const lastMessage = this.data.messageList[this.data.messageList.length - 1]
        if (lastMessage && lastMessage.role === 'user') {
          const updatedMessageList = this.data.messageList.map(msg => {
            if (msg === lastMessage) {
              return {
                ...msg,
                id: res.result.data.messageId,
                _id: res.result.data.messageId
              }
            }
            return msg
          })
          this.setData({ messageList: updatedMessageList })
        }
      }
    })
    .catch(err => {
      console.error('❌ 消息保存失败:', err)
      // 显示错误提示
      wx.showToast({
        title: '消息发送失败',
        icon: 'error',
        duration: 2000
      })
    })
  },

    /**
   * 发送多AI消息
   */
  async sendMessageWithMultiAI(content, clientMsgId) {
    // 新增：检查是否是系统自动发送
    if (this.data.isFirstLoad) {
      console.log('❌ 页面首次加载中，禁止发送AI消息')
      this.setData({ sending: false })
      return
    }
    
    // 新增：检查消息内容是否为空或无效
    if (!content || content.length === 0) {
      console.log('❌ AI消息内容为空，禁止发送')
      this.setData({ sending: false })
      return
    }
    
    // 新增：检查是否是系统消息或欢迎消息
    if (content.includes('欢迎来到群聊') || content.includes('AI助手')) {
      console.log('❌ 检测到系统消息内容，禁止AI发送')
      this.setData({ sending: false })
      return
    }
    
    if (this.data.activeAIs.length === 0) {
      console.log('多AI模式未启用或无激活AI')
      this.setData({ sending: false }) // 重置发送状态
      return
    }
    
    console.log('发送多AI消息:', content)
    console.log('当前激活的AI:', this.data.activeAIs)
    
    try {
      // 智能选择AI进行回复
      const selectedAI = this.selectAIForReply({ content })
      if (!selectedAI) {
        console.log('没有合适的AI进行回复')
        this.setData({ sending: false }) // 重置发送状态
        return
      }
      
      console.log('选择的AI:', selectedAI)
      
      // 检查频率限制
      if (!this.checkAIReplyFrequency(selectedAI.id)) {
        console.log(`AI ${selectedAI.id} 频率限制中，跳过回复`)
        this.setData({ sending: false }) // 重置发送状态
        return
      }
      
      // 显示发送中状态
      this.setData({ sending: true })
      
      // 调用云函数获取AI回复 - 修复参数格式
      const result = await wx.cloud.callFunction({
        name: 'group-chat-multi-ai',
        data: {
          groupId: this.data.groupId,
          content: content,
          type: 'text',
          triggerAI: true,
          activeAIs: this.data.activeAIs,
          clientMsgId: clientMsgId
        }
      })
      
      console.log('云函数返回结果:', result)
      
      if (result.result && result.result.success) {
        const aiReplies = result.result.data.aiReplies || []
        
        if (aiReplies.length > 0) {
          // 处理AI回复
          for (const aiReply of aiReplies) {
            // 防护：如果AI性格列表为空，使用默认值
            let aiInfo = null
            if (this.data.aiPersonalities && this.data.aiPersonalities.length > 0) {
              aiInfo = this.data.aiPersonalities.find(p => p.id === aiReply.aiId)
            }
            
            // 创建AI回复消息 - 增强唯一性
            const timestamp = Date.now()
            const randomId = Math.random().toString(36).substr(2, 9)
            const aiMessage = {
              id: `ai_${timestamp}_${randomId}`,
              _id: aiReply.messageId || `ai_${timestamp}_${randomId}`,
              role: 'assistant',
              content: aiReply.content,
              time: this.formatMessageTime(new Date()),
              createdAt: new Date().toISOString(),
              timestamp: timestamp,
              // 新增：明确标记为AI消息
              isAIMessage: true,
              senderType: 'ai',
              aiCharacter: {
                id: aiReply.aiId,
                name: aiInfo ? aiInfo.name : `AI${aiReply.aiId}`,
                nickname: aiInfo ? aiInfo.nickname : `AI助手${aiReply.aiId}`,
                avatar: aiInfo ? aiInfo.avatar : '🤖',
                personality: aiInfo ? aiInfo.personality : '智能助手'
              }
            }
            
            // 添加到消息列表
            const newMessageList = [...this.data.messageList, aiMessage]
            this.setData({
              messageList: newMessageList
            })
            
            // 更新AI回复频率统计
            this.updateAIReplyFrequency(aiReply.aiId)
            
            console.log(`AI ${aiReply.aiId} 回复成功:`, aiReply.content)
          }
          
          // 滚动到底部
          this.scrollToBottom()
          
          // 延迟后触发更多AI回复（如果启用）- 增强防重复机制
          if (this.data.activeAIs.length > 1 && Math.random() < 0.6 && !this.data.hasTriggeredAIReply) {
            // 设置延迟触发，避免立即重复
            const delay = Math.random() * 3000 + 2000 // 2-5秒延迟
            console.log(`🔄 设置后续AI回复延迟: ${delay}ms`)
            
            // 立即标记已触发，防止重复设置
            this.setData({ hasTriggeredAIReply: true })
            
            setTimeout(() => {
              // 再次检查状态，确保不会重复触发
              if (this.data.activeAIs.length > 1 && !this.data.isFirstLoad && !this.data.hasTriggeredAIReply) {
                console.log('🔄 执行延迟的后续AI回复')
                this.triggerFollowUpAIReply(content)
              } else {
                console.log('❌ 延迟触发条件不满足，跳过后续AI回复')
              }
            }, delay)
          }
        } else {
          console.log('没有AI回复')
        }
        
        this.setData({ sending: false })
        
      } else {
        console.error('AI回复失败:', result.result?.message || '未知错误')
        this.setData({ sending: false })
        
        // 显示错误提示
        wx.showToast({
          title: 'AI回复失败，请稍后重试',
          icon: 'none',
          duration: 2000
        })
      }
      
    } catch (error) {
      console.error('发送多AI消息失败:', error)
      this.setData({ sending: false })
      
      // 显示错误提示
      wx.showToast({
        title: '发送失败，请检查网络连接',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 触发AI回复
   */
  triggerAIReply(message) {
    console.log('🔍 检查AI回复触发条件:', {
      hasTriggered: this.data.hasTriggeredAIReply,
      isFirstLoad: this.data.isFirstLoad,
      timeSinceLastReply: Date.now() - this.data.lastAIReplyTime,
      activeAIs: this.data.activeAIs.length,
      isOnline: this.data.isOnline
    })
    
    // 防止重复触发
    if (this.data.hasTriggeredAIReply) {
      console.log('❌ 已触发过AI回复，跳过重复触发')
      return
    }
    
    // 防止页面首次加载时自动触发
    if (this.data.isFirstLoad) {
      console.log('❌ 页面首次加载，跳过自动AI回复')
      return
    }
    
    // 新增：检查消息是否有效
    if (!message || typeof message !== 'object' || !message.content) {
      console.log('❌ 消息对象无效，跳过AI回复')
      return
    }
    
    // 新增：检查是否是系统消息或欢迎消息
    if (message.isSystemMessage || message.isWelcomeMessage || message.senderType === 'system') {
      console.log('❌ 系统消息，跳过AI回复')
      return
    }
    
    // 新增：检查消息内容是否包含系统关键词
    if (message.content && (message.content.includes('欢迎来到群聊') || message.content.includes('AI助手'))) {
      console.log('❌ 检测到系统消息内容，跳过AI回复')
      return
    }
    
    // 检查时间间隔，防止频繁触发
    const now = Date.now()
    if (now - this.data.lastAIReplyTime < 5000) { // 5秒内不重复触发
      console.log('❌ AI回复间隔太短，跳过触发')
      return
    }
    
    // 检查是否有活跃的AI
    if (!this.data.activeAIs || this.data.activeAIs.length === 0) {
      console.log('❌ 没有活跃的AI，跳过回复')
      return
    }
    
    // 检查是否在线
    if (!this.data.isOnline) {
      console.log('❌ 用户离线，跳过AI回复')
      return
    }
    
    // 智能选择AI进行回复
    const selectedAI = this.selectAIForReply(message)
    if (!selectedAI) {
      console.log('❌ 没有合适的AI进行回复')
      return
    }
    
    // 检查频率限制
    if (!this.checkAIReplyFrequency(selectedAI.id)) {
      console.log(`❌ AI ${selectedAI.id} 频率限制中，跳过回复`)
      return
    }
    
    console.log('✅ 满足所有触发条件，开始AI回复')
    
    // 标记已触发AI回复
    this.setData({
      hasTriggeredAIReply: true,
      lastAIReplyTime: now
    })
    
    // 触发AI回复
    this.requestAIReply(message, selectedAI.id)
  },

  /**
   * 触发后续AI回复（多AI协作）
   */
  triggerFollowUpAIReply(originalMessage) {
    console.log('🔍 检查后续AI回复触发条件:', {
      hasTriggered: this.data.hasTriggeredAIReply,
      isFirstLoad: this.data.isFirstLoad,
      activeAIs: this.data.activeAIs.length,
      sending: this.data.sending
    })
    
    // 防止重复触发
    if (this.data.hasTriggeredAIReply) {
      console.log('❌ 已触发过AI回复，跳过后续回复')
      return
    }
    
    // 防止页面首次加载时自动触发
    if (this.data.isFirstLoad) {
      console.log('❌ 页面首次加载，跳过后续AI回复')
      return
    }
    
    // 防止正在发送消息时触发
    if (this.data.sending) {
      console.log('❌ 正在发送消息，跳过后续AI回复')
      return
    }
    
    // 检查消息内容，确保不是用户消息
    if (typeof originalMessage === 'string' && originalMessage.trim()) {
      // 新增：检查是否是系统消息或欢迎消息
      if (originalMessage.includes('欢迎来到群聊') || originalMessage.includes('AI助手')) {
        console.log('❌ 检测到系统消息内容，跳过后续AI回复')
        return
      }
      console.log('✅ 消息内容检查通过:', originalMessage.substring(0, 50))
    } else {
      console.log('❌ 消息内容无效，跳过后续AI回复')
      return
    }
    
    const { activeAIs, aiPersonalities, aiReplyFrequency } = this.data
    
    // 如果没有多个AI，不触发后续回复
    if (activeAIs.length <= 1) {
      console.log('❌ 只有一个AI，跳过后续回复')
      return
    }
    
    // 随机选择一个不同的AI进行后续回复
    const availableAIs = activeAIs.filter(aiId => {
      const lastReplyTime = aiReplyFrequency.lastReplyTime[aiId] || 0
      const now = Date.now()
      // 放宽频率限制，允许更频繁的回复
      return (now - lastReplyTime) > 3000 // 3秒间隔
    })
    
    if (availableAIs.length === 0) {
      console.log('没有可用的AI进行后续回复')
      return
    }
    
    // 随机选择一个AI
    const randomIndex = Math.floor(Math.random() * availableAIs.length)
    const selectedAIId = availableAIs[randomIndex]
    
    // 构建后续回复的提示
    const followUpPrompt = `基于这条消息："${originalMessage}"，请提供一个有趣的后续回复或补充观点。`
    
    console.log(`🔄 触发后续AI回复，选择AI: ${selectedAIId}`)
    
    // 标记已触发AI回复
    this.setData({
      hasTriggeredAIReply: true,
      lastAIReplyTime: Date.now()
    })
    
    // 触发AI回复
    this.requestAIReply(followUpPrompt, selectedAIId)
  },

  /**
   * 智能选择AI进行回复
   */
  selectAIForReply(message) {
    const { activeAIs, aiPersonalities, aiReplyFrequency } = this.data
    const now = Date.now()
    
    console.log('选择AI回复，当前激活AI:', activeAIs)
    console.log('AI个性列表:', aiPersonalities)
    
    // 防护：如果AI性格列表为空，返回默认AI
    if (!aiPersonalities || aiPersonalities.length === 0) {
      console.log('⚠️ AI性格列表为空，返回默认AI')
      if (activeAIs.length > 0) {
        const defaultAI = {
          id: activeAIs[0],
          name: 'AI助手',
          nickname: 'AI助手',
          avatar: '🤖',
          personality: '智能助手'
        }
        return defaultAI
      }
      return null
    }
    
    // 过滤掉频率限制中的AI，但放宽限制
    const availableAIs = activeAIs.filter(aiId => {
      const lastReplyTime = aiReplyFrequency.lastReplyTime[aiId] || 0
      const timeSinceLastReply = now - lastReplyTime
      // 放宽频率限制：从30秒改为10秒
      return timeSinceLastReply >= 10000
    })
    
    console.log('频率限制后可用AI:', availableAIs)
    
    if (availableAIs.length === 0) {
      // 如果没有可用AI，强制选择一个
      console.log('没有可用AI，强制选择一个')
      const randomAI = activeAIs[Math.floor(Math.random() * activeAIs.length)]
      return aiPersonalities.find(p => p.id === randomAI) || { id: randomAI, name: `AI${randomAI}`, nickname: `AI助手${randomAI}`, avatar: '🤖', personality: '智能助手' }
    }
    
    // 基于消息内容和AI特性进行智能选择
    const messageContent = message.content.toLowerCase()
    const aiScores = availableAIs.map(aiId => {
      const ai = aiPersonalities.find(p => p.id === aiId)
      if (!ai) return { aiId, score: 0 }
      
      let score = 0
      
      // 基于关键词匹配评分
      if (messageContent.includes('心理') || messageContent.includes('情绪') || messageContent.includes('感受') || messageContent.includes('心情')) {
        if (ai.id === 1) score += 5 // 心灵导师温情
      }
      if (messageContent.includes('学习') || messageContent.includes('知识') || messageContent.includes('问题') || messageContent.includes('解释')) {
        if (ai.id === 2) score += 5 // 知识助手小博
      }
      if (messageContent.includes('创意') || messageContent.includes('艺术') || messageContent.includes('想法') || messageContent.includes('有趣')) {
        if (ai.id === 3) score += 5 // 创意伙伴小艺
      }
      if (messageContent.includes('商务') || messageContent.includes('职场') || messageContent.includes('工作') || messageContent.includes('商业')) {
        if (ai.id === 4) score += 5 // 商务顾问小商
      }
      if (messageContent.includes('技术') || messageContent.includes('编程') || messageContent.includes('代码') || messageContent.includes('电脑')) {
        if (ai.id === 5) score += 5 // 技术专家小码
      }
      
      // 基于回复频率评分（频率越低分数越高）
      const lastReplyTime = aiReplyFrequency.lastReplyTime[aiId] || 0
      const timeSinceLastReply = now - lastReplyTime
      score += Math.min(timeSinceLastReply / 5000, 3) // 最多加3分
      
      // 基于回复计数评分（计数越少分数越高）
      const replyCount = aiReplyFrequency.replyCounts[aiId] || 0
      score += Math.max(10 - replyCount, 0) // 最多加10分
      
      // 基础分数，确保每个AI都有机会
      score += 2
      
      return { aiId, score }
    })
    
    console.log('AI评分结果:', aiScores)
    
    // 按分数排序，选择分数最高的AI
    aiScores.sort((a, b) => b.score - a.score)
    
    // 增加随机因子，让AI更活跃
    if (aiScores.length > 1 && Math.random() < 0.5) {
      const randomIndex = Math.floor(Math.random() * Math.min(3, aiScores.length))
      const selectedAI = aiPersonalities.find(p => p.id === aiScores[randomIndex].aiId)
      console.log('随机选择AI:', selectedAI)
      return selectedAI
    }
    
    const selectedAI = aiPersonalities.find(p => p.id === aiScores[0].aiId)
    console.log('评分选择AI:', selectedAI)
    return selectedAI
  },

  /**
   * 检查AI回复频率
   */
  checkAIReplyFrequency(aiId) {
    const { aiReplyFrequency } = this.data
    const now = Date.now()
    
    console.log(`检查AI ${aiId} 回复频率`)
    
    // 检查最小回复间隔（放宽到10秒）
    const lastReplyTime = aiReplyFrequency.lastReplyTime[aiId] || 0
    const timeSinceLastReply = now - lastReplyTime
    if (timeSinceLastReply < 10000) { // 10秒
      console.log(`AI ${aiId} 回复间隔太短: ${timeSinceLastReply}ms`)
      return false
    }
    
    // 检查每分钟回复次数（放宽到5次）
    const replyCount = aiReplyFrequency.replyCounts[aiId] || 0
    if (replyCount >= 5) { // 每分钟最多5次
      console.log(`AI ${aiId} 回复次数过多: ${replyCount}`)
      return false
    }
    
    // 检查冷却期（缩短到30秒）
    if (timeSinceLastReply < 30000) { // 30秒
      console.log(`AI ${aiId} 还在冷却期: ${timeSinceLastReply}ms`)
      return false
    }
    
    console.log(`AI ${aiId} 频率检查通过`)
    return true
  },

  /**
   * 更新AI回复频率统计
   */
  updateAIReplyFrequency(aiId) {
    const { aiReplyFrequency } = this.data
    const now = Date.now()
    
    // 更新最后回复时间
    aiReplyFrequency.lastReplyTime[aiId] = now
    
    // 更新回复计数
    aiReplyFrequency.replyCounts[aiId] = (aiReplyFrequency.replyCounts[aiId] || 0) + 1
    
    // 每分钟重置计数
    setTimeout(() => {
      const currentCount = this.data.aiReplyFrequency.replyCounts[aiId] || 0
      if (currentCount > 0) {
        this.setData({
          [`aiReplyFrequency.replyCounts.${aiId}`]: Math.max(currentCount - 1, 0)
        })
      }
    }, 60000)
    
    this.setData({
      aiReplyFrequency: aiReplyFrequency
    })
    
    console.log(`AI ${aiId} 回复频率已更新`)
  },

  /**
   * 更新AI性能统计
   */
  updateAIPerformance(aiId, responseTime, success = true) {
    const { aiPerformance } = this.data
    const now = Date.now()
    
    // 更新总回复次数
    aiPerformance.totalReplies += 1
    
    // 更新平均响应时间
    if (aiPerformance.totalReplies === 1) {
      aiPerformance.averageResponseTime = responseTime
    } else {
      aiPerformance.averageResponseTime = 
        (aiPerformance.averageResponseTime * (aiPerformance.totalReplies - 1) + responseTime) / aiPerformance.totalReplies
    }
    
    // 更新成功率
    const totalReplies = aiPerformance.totalReplies
    const successReplies = aiPerformance.performanceHistory.filter(p => p.success).length
    aiPerformance.successRate = Math.round((successReplies / totalReplies) * 100)
    
    // 添加性能记录
    aiPerformance.performanceHistory.push({
      aiId,
      responseTime,
      success,
      timestamp: now
    })
    
    // 只保留最近100条记录
    if (aiPerformance.performanceHistory.length > 100) {
      aiPerformance.performanceHistory = aiPerformance.performanceHistory.slice(-100)
    }
    
    // 更新最后更新时间
    aiPerformance.lastUpdateTime = now
    
    this.setData({
      aiPerformance: aiPerformance
    })
    
    console.log(`AI性能已更新: 总回复${aiPerformance.totalReplies}次，平均响应时间${aiPerformance.averageResponseTime}ms，成功率${aiPerformance.successRate}%`)
  },

  /**
   * 获取AI性能报告
   */
  getAIPerformanceReport() {
    const { aiPerformance, aiPersonalities, activeAIs } = this.data
    
    // 防护：如果AI性格列表为空，返回默认报告
    if (!aiPersonalities || aiPersonalities.length === 0) {
      console.log('⚠️ AI性格列表为空，getAIPerformanceReport返回默认报告')
      return {
        overall: {
          totalReplies: 0,
          averageResponseTime: 0,
          successRate: 100,
          lastUpdateTime: null
        },
        aiStats: {}
      }
    }
    
    // 防护：如果activeAIs为空或无效，返回默认报告
    if (!activeAIs || !Array.isArray(activeAIs) || activeAIs.length === 0) {
      console.log('⚠️ activeAIs无效，getAIPerformanceReport返回默认报告')
      return {
        overall: {
          totalReplies: 0,
          averageResponseTime: 0,
          successRate: 100,
          lastUpdateTime: null
        },
        aiStats: {}
      }
    }
    
    // 按AI统计性能
    const aiStats = {}
    activeAIs.forEach(aiId => {
      const ai = aiPersonalities.find(p => p.id === aiId)
      const aiHistory = aiPerformance.performanceHistory.filter(p => p.aiId === aiId)
      
      if (aiHistory.length > 0) {
        const successCount = aiHistory.filter(p => p.success).length
        const avgResponseTime = aiHistory.reduce((sum, p) => sum + p.responseTime, 0) / aiHistory.length
        
        aiStats[aiId] = {
          name: ai ? ai.nickname : `AI${aiId}`,
          totalReplies: aiHistory.length,
          successRate: Math.round((successCount / aiHistory.length) * 100),
          averageResponseTime: Math.round(avgResponseTime),
          lastReplyTime: aiHistory[aiHistory.length - 1]?.timestamp || null
        }
      }
    })
    
    return {
      overall: {
        totalReplies: aiPerformance.totalReplies,
        averageResponseTime: Math.round(aiPerformance.averageResponseTime),
        successRate: aiPerformance.successRate,
        lastUpdateTime: aiPerformance.lastUpdateTime
      },
      aiStats: aiStats
    }
  },

  /**
   * 显示AI性能报告
   */
  showAIPerformanceReport() {
    const report = this.getAIPerformanceReport()
    
    let content = `📊 AI性能报告\n\n`
    content += `总体表现：\n`
    content += `• 总回复次数：${report.overall.totalReplies}\n`
    content += `• 平均响应时间：${report.overall.averageResponseTime}ms\n`
    content += `• 成功率：${report.overall.successRate}%\n\n`
    
    content += `各AI表现：\n`
    Object.values(report.aiStats).forEach(ai => {
      content += `• ${ai.name}：${ai.totalReplies}次回复，成功率${ai.successRate}%，平均响应${ai.averageResponseTime}ms\n`
    })
    
    wx.showModal({
      title: '🤖 AI性能报告',
      content: content,
      showCancel: false,
      confirmText: '了解'
    })
  },

  /**
   * 请求AI回复
   */
  requestAIReply(message, characterId) {
    console.log('请求AI回复:', message)
    const app = getApp()
    
    // 使用选中的AI性格ID
    // const characterId = this.data.selectedAIId || 1 // 移除硬编码，改为传入
    
    // 使用正确的云函数调用AI回复
    app.cloudCall('chat-send-message', {
      groupId: this.data.groupId,
      content: message,
      type: 'text',
      characterId: characterId, // 使用选中的AI性格
      region: this.inferRegion(),
      triggerAI: true // 标记需要AI回复
    })
      .then(res => {
        console.log('AI回复结果:', res)
        if (res.result.success) {
          // 添加AI消息到列表，使用唯一ID
          const aiMessage = {
            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 确保_id也存在
            groupId: this.data.groupId,
            role: 'assistant',
            content: res.result.data.aiReply || '收到您的消息，我正在思考中...',
            type: 'text',
            time: this.formatMessageTime(new Date()),
            timestamp: Date.now(),
            // 添加AI性格信息
            aiCharacter: {
              id: characterId,
              name: this.getAINickname(characterId),
              nickname: this.getAINickname(characterId)
            }
          }
          
          console.log('AI消息对象:', aiMessage)
          
          this.setData({
            messageList: [...this.data.messageList, aiMessage],
            sending: false
          })
          
          this.scrollToBottom()
          this.updateAIReplyFrequency(characterId) // 更新回复频率统计
        } else {
          console.error('AI回复失败:', res.result.message)
          this.setData({ sending: false })
          
          // 显示错误提示
          wx.showToast({
            title: 'AI回复失败',
            icon: 'error',
            duration: 2000
          })
        }
      })
      .catch(err => {
        console.error('AI回复失败:', err)
        this.setData({ sending: false })
        
        // 显示错误提示
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'error',
          duration: 2000
        })
      })
  },

  // 区域推断：简化规则，中文语言环境视为国内，否则视为国际
  inferRegion() {
    try {
      const sys = wx.getSystemInfoSync()
      const lang = (sys.language || '').toLowerCase()
      return lang.startsWith('zh') ? 'cn' : 'intl'
    } catch (e) {
      return 'cn'
    }
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    if (this.data.messageList.length > 0 && !this.data.userScrolled) {
      const lastMessage = this.data.messageList[this.data.messageList.length - 1]
      this.setData({
        scrollToView: `msg-${lastMessage.id}`
      })
    }
  },

  /**
   * 处理滚动事件
   */
  onScroll(e) {
    const scrollTop = e.detail.scrollTop
    const scrollHeight = e.detail.scrollHeight
    const clientHeight = e.detail.scrollHeight - e.detail.scrollTop
    
    // 如果用户向上滚动，标记为用户手动滚动
    if (scrollTop < this.data.lastScrollTop && scrollTop > 100) {
      this.setData({
        userScrolled: true
      })
    }
    
    // 如果用户滚动到底部，重置手动滚动标记
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      this.setData({
        userScrolled: false
      })
    }
    
    this.setData({
      lastScrollTop: scrollTop
    })
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value
    })
    // 输入时调整轮询间隔
    this.adjustPollingInterval()
  },

  /**
   * 输入框获得焦点
   */
  onInputFocus(e) {
    console.log('输入框获得焦点')
    this.setData({
      inputFocused: true
    })
    // 确保输入框可见
    this.ensureInputVisible()
  },

  /**
   * 输入框失去焦点
   */
  onInputBlur(e) {
    console.log('输入框失去焦点')
    this.setData({
      inputFocused: false
    })
  },

  /**
   * 输入框点击
   */
  onInputTap(e) {
    console.log('输入框被点击')
    this.setData({
      inputFocused: true
    })
    // 确保输入框可见
    this.ensureInputVisible()
  },

  /**
   * 确保输入框可见
   */
  ensureInputVisible() {
    // 延迟执行，确保DOM更新完成
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.select('.message-input').boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec((res) => {
        if (res && res[0]) {
          const inputRect = res[0]
          const scrollOffset = res[1]
          console.log('输入框位置:', inputRect)
          console.log('滚动位置:', scrollOffset)
          
          // 如果输入框被遮挡，滚动到可见位置
          if (inputRect.top < 100) {
            wx.pageScrollTo({
              scrollTop: scrollOffset.scrollTop + 100,
              duration: 300
            })
          }
        }
      })
    }, 100)
  },

  /**
   * 显示成员列表
   */
  showMemberList() {
    console.log('显示成员列表弹窗')
    
    // 显示加载状态
    wx.showLoading({
      title: '加载中...',
      mask: true
    })
    
    // 加载成员列表
    this.loadMemberList()
    
    // 延迟显示弹窗，确保数据加载完成
    setTimeout(() => {
      wx.hideLoading()
      this.setData({
        showMemberModal: true
      })
      
      // 添加弹窗显示动画
      setTimeout(() => {
        const modal = wx.createSelectorQuery().select('.member-modal .modal-content')
        if (modal) {
          modal.fields({
            node: true,
            size: true,
          }, (res) => {
            if (res && res.node) {
              res.node.style.transform = 'scale(1)'
            }
          }).exec()
        }
      }, 100)
    }, 300)
  },

  /**
   * 隐藏成员列表
   */
  hideMemberList() {
    console.log('隐藏成员列表弹窗')
    
    // 添加弹窗隐藏动画
    const modal = wx.createSelectorQuery().select('.member-modal .modal-content')
    if (modal) {
      modal.fields({
        node: true,
        size: true,
      }, (res) => {
        if (res && res.node) {
          res.node.style.transform = 'scale(0.9)'
        }
      }).exec()
    }
    
    // 延迟隐藏弹窗
    setTimeout(() => {
      this.setData({
        showMemberModal: false
      })
    }, 200)
  },

  /**
   * 加载成员列表（优化版本）
   */
  loadMemberList() {
    const { groupInfo, activeAITags, aiPersonalities, memberListCache, lastMemberUpdate } = this.data
    
    // 检查缓存是否有效（5分钟内）
    const now = Date.now()
    if (memberListCache && lastMemberUpdate && (now - lastMemberUpdate < 300000)) {
      console.log('使用缓存的成员列表')
      this.setData({
        memberList: memberListCache
      })
      return
    }
    
    // 构建成员列表：包括AI和用户
    let members = []
    
    // 添加AI成员
    if (activeAITags && activeAITags.length > 0) {
      activeAITags.forEach(ai => {
        members.push({
          id: `ai_${ai.id}`,
          role: 'bot',
          name: ai.nickname,
          avatar: ai.avatar || '🤖',
          type: 'AI助手',
          description: ai.description || '智能AI助手',
          isAI: true
        })
      })
    }
    
    // 添加用户成员（如果有的话）
    if (groupInfo.members && groupInfo.members.length > 0) {
      groupInfo.members.forEach(user => {
        members.push({
          id: `user_${user.openid}`,
          role: 'user',
          name: user.nickName || '未知用户',
          avatar: user.avatarUrl || '👤',
          type: user.role === 'owner' ? '群主' : user.role === 'admin' ? '管理员' : '成员',
          description: `加入时间：${user.joinedAt || '未知'}`,
          isAI: false
        })
      })
    }
    
    // 如果没有成员信息，使用默认数据
    if (members.length === 0) {
      members = [
        {
          id: 'user_self',
          role: 'user',
          name: '我',
          avatar: '👤',
          type: '成员',
          description: '当前用户',
          isAI: false
        }
      ]
    }
    
    // 按类型分组：AI在前，用户在后
    const aiMembers = members.filter(m => m.isAI)
    const userMembers = members.filter(m => !m.isAI)
    const sortedMembers = [...aiMembers, ...userMembers]
    
    console.log('加载成员列表:', sortedMembers)
    
    // 更新数据和缓存
    this.setData({
      memberList: sortedMembers,
      memberListCache: sortedMembers,
      lastMemberUpdate: now
    })
  },

  /**
   * 刷新成员列表（强制更新）
   */
  refreshMemberList() {
    console.log('强制刷新成员列表')
    this.setData({
      memberListCache: null,
      lastMemberUpdate: null
    })
    this.loadMemberList()
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadMessages()
    wx.stopPullDownRefresh()
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  /**
   * 添加新AI到群聊
   */
  addNewAIToGroup() {
    // 获取当前未激活的AI列表
    const availableAIs = this.data.aiPersonalities.filter(ai => 
      !this.data.activeAIs.includes(ai.id)
    )
    
    if (availableAIs.length === 0) {
      wx.showToast({
        title: '所有AI都已激活',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    // 显示可添加的AI列表
    this.showAddAISelector()
  },

  /**
   * 显示添加AI选择器
   */
  showAddAISelector() {
    console.log('显示添加AI选择器')
    
    // 显示加载状态
    wx.showLoading({
      title: '加载AI列表...',
      mask: true
    })
    
    // 获取当前未激活的AI列表
    const availableAIs = this.data.aiPersonalities.filter(ai => 
      !this.data.activeAIs.includes(ai.id)
    )
    
    if (availableAIs.length === 0) {
      wx.hideLoading()
      wx.showToast({
        title: '所有AI都已激活',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    // 更新可用AI列表
    this.setData({
      availableAIs: availableAIs
    })
    
    // 延迟显示弹窗，确保数据加载完成
    setTimeout(() => {
      wx.hideLoading()
      this.setData({
        showAddAISelector: true
      })
    }, 200)
  },

  /**
   * 隐藏添加AI选择器
   */
  hideAddAISelector() {
    console.log('隐藏添加AI选择器')
    
    // 添加弹窗隐藏动画
    const modal = wx.createSelectorQuery().select('.add-ai-selector-content')
    if (modal) {
      modal.fields({
        node: true,
        size: true,
      }, (res) => {
        if (res && res.node) {
          res.node.style.transform = 'translateY(100rpx)'
          res.node.style.opacity = '0'
        }
      }).exec()
    }
    
    // 延迟隐藏弹窗
    setTimeout(() => {
      this.setData({
        showAddAISelector: false
      })
    }, 300)
  },

  /**
   * 选择AI添加到群聊
   */
  selectAIToAdd(e) {
    const aiId = e.currentTarget.dataset.aiId
    console.log('选择添加AI:', aiId)
    
    // 显示加载状态
    wx.showLoading({
      title: '添加中...',
      mask: true
    })
    
    // 模拟添加AI的过程
    setTimeout(() => {
      wx.hideLoading()
      
      // 检查是否还能添加更多AI
      if (this.data.activeAIs.length >= 5) {
        wx.showToast({
          title: '已达到最大AI数量限制',
          icon: 'error',
          duration: 2000
        })
        return
      }
      
      // 添加到激活AI列表
      const newActiveAIs = [...this.data.activeAIs, aiId]
      this.setData({
        activeAIs: newActiveAIs
      })
      
      // 更新AI标签数据
      this.updateAITags()
      
      // 显示成功提示
      wx.showToast({
        title: 'AI添加成功！',
        icon: 'success',
        duration: 2000
      })
      
      // 隐藏弹窗
      this.hideAddAISelector()
      
      // 刷新成员列表
      this.refreshMemberList()
      
      // 添加系统消息
      const aiName = this.getAINickname(aiId)
      this.addSystemMessage(`欢迎 ${aiName} 加入群聊！`)
      
    }, 1000)
  },

  /**
   * 获取AI昵称
   */
  getAINickname(aiId) {
    // 防护：如果AI性格列表为空，返回默认值
    if (!this.data.aiPersonalities || this.data.aiPersonalities.length === 0) {
      console.log('⚠️ AI性格列表为空，getAINickname返回默认值')
      return 'AI助手'
    }
    
    const ai = this.data.aiPersonalities.find(p => p.id === aiId)
    return ai ? ai.nickname : 'AI助手'
  },

  /**
   * 添加系统消息
   */
  addSystemMessage(content) {
    const systemMessage = {
      id: `sys_${Date.now()}`,
      role: 'system',
      content: content,
      timestamp: Date.now(),
      type: 'system'
    }
    
    // 添加到消息列表
    const newMessageList = [...this.data.messageList, systemMessage]
    this.setData({
      messageList: newMessageList
    })
    
    // 滚动到底部
    this.scrollToBottom()
  },

  /**
   * 错误处理函数
   */
  handleError(error, operation = '操作') {
    console.error(`${operation}失败:`, error)
    
    let errorMessage = '操作失败，请重试'
    
    if (error && error.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    wx.showToast({
      title: errorMessage,
      icon: 'error',
      duration: 3000
    })
  },

  /**
   * 成功提示函数
   */
  showSuccess(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: duration
    })
  },

  /**
   * 信息提示函数
   */
  showInfo(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: duration
    })
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡
  },

  /**
   * 加载更多消息
   */
  onLoadMore() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }
    
    console.log('加载更多消息')
    this.setData({
      page: this.data.page + 1
    })
    
    // 这里可以实现加载更多历史消息的逻辑
    // 暂时只是记录日志
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: `${this.data.groupName} - 一起来聊天吧！`,
      path: `/pages/group-chat/group-chat?groupId=${this.data.groupId}&groupName=${encodeURIComponent(this.data.groupName)}`
    }
  },

  /**
   * 格式化消息时间
   */
  formatMessageTime(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    // 今天的消息显示时间
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    
    // 昨天的消息显示"昨天"
    if (diff < 2 * 24 * 60 * 60 * 1000) {
      return '昨天'
    }
    
    // 更早的消息显示日期
    return date.toLocaleDateString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit' 
    })
  },

  /**
   * 创建新群聊
   */
  createNewGroup() {
    wx.showModal({
      title: '创建新群聊',
      content: '确定要创建新群聊吗？',
      success: (res) => {
        if (res.confirm) {
          this.showCreateGroupModal()
        }
      }
    })
  },

  /**
   * 显示创建群聊弹窗
   */
  showCreateGroupModal() {
    this.setData({
      showCreateGroupModal: true,
      newGroupData: {
        groupName: '',
        description: '',
        avatar: '👥',
        maxMembers: 100,
        isPublic: true,
        initialAIs: [1, 2, 3],
        tags: []
      }
    })
  },

  /**
   * 隐藏创建群聊弹窗
   */
  hideCreateGroupModal() {
    this.setData({
      showCreateGroupModal: false,
      newGroupData: {}
    })
  },

  /**
   * 创建群聊输入变化
   */
  onCreateGroupInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`newGroupData.${field}`]: value
    })
  },

  /**
   * 选择群聊头像
   */
  selectGroupAvatar() {
    const avatars = ['👥', '🎉', '🌟', '💬', '🚀', '🎯', '🌈', '🎨', '💡', '🔮']
    
    wx.showActionSheet({
      itemList: avatars,
      success: (res) => {
        const selectedAvatar = avatars[res.tapIndex]
        this.setData({
          'newGroupData.avatar': selectedAvatar
        })
      }
    })
  },

  /**
   * 选择初始AI
   */
  selectInitialAIs() {
    const { aiPersonalities } = this.data
    const { initialAIs } = this.data.newGroupData
    
    // 防护：如果AI性格列表为空，显示提示并返回
    if (!aiPersonalities || aiPersonalities.length === 0) {
      console.log('⚠️ AI性格列表为空，selectInitialAIs无法执行')
      wx.showToast({
        title: 'AI数据未加载，请稍后再试',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    const items = aiPersonalities.map(ai => ({
      name: ai.nickname,
      value: ai.id,
      checked: initialAIs.includes(ai.id)
    }))
    
    wx.showActionSheet({
      itemList: items.map(item => `${item.checked ? '✅' : '❌'} ${item.name}`),
      success: (res) => {
        const selectedIndex = res.tapIndex
        const selectedAI = items[selectedIndex]
        
        let newInitialAIs = [...initialAIs]
        if (selectedAI.checked) {
          // 移除AI
          newInitialAIs = newInitialAIs.filter(id => id !== selectedAI.value)
        } else {
          // 添加AI（最多5个）
          if (newInitialAIs.length < 5) {
            newInitialAIs.push(selectedAI.value)
          } else {
            wx.showToast({
              title: '最多只能选择5个AI',
              icon: 'none'
            })
            return
          }
        }
        
        // 更新AI昵称数组
        const newInitialAINames = newInitialAIs.map(aiId => {
          const ai = aiPersonalities.find(p => p.id === aiId)
          return ai ? ai.nickname : 'AI助手'
        })
        
        this.setData({
          'newGroupData.initialAIs': newInitialAIs,
          'newGroupData.initialAINames': newInitialAINames
        })
      }
    })
  },

  /**
   * 确认创建群聊
   */
  async confirmCreateGroup() {
    const { newGroupData } = this.data
    
    // 验证输入
    if (!newGroupData.groupName || newGroupData.groupName.trim().length === 0) {
      wx.showToast({
        title: '请输入群聊名称',
        icon: 'none'
      })
      return
    }
    
    if (newGroupData.initialAIs.length === 0) {
      wx.showToast({
        title: '请至少选择一个AI',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '创建中...'
    })
    
    try {
      const app = getApp()
      const result = await app.cloudCall('group-chat-create', {
        groupName: newGroupData.groupName.trim(),
        description: newGroupData.description.trim(),
        avatar: newGroupData.avatar,
        maxMembers: newGroupData.maxMembers,
        isPublic: newGroupData.isPublic,
        initialAIs: newGroupData.initialAIs,
        tags: newGroupData.tags
      })
      
      wx.hideLoading()
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        })
        
        this.hideCreateGroupModal()
        
        // 跳转到新创建的群聊
        const { groupId } = result.result.data
        wx.redirectTo({
          url: `/pages/group-chat/group-chat?groupId=${groupId}`
        })
      } else {
        throw new Error(result.result?.message || '创建失败')
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('创建群聊失败:', error)
      
      wx.showToast({
        title: error.message || '创建失败',
        icon: 'none'
      })
    }
  },

  /**
   * 显示群聊信息
   */
  showGroupInfo() {
    this.setData({
      showGroupInfoModal: true
    })
  },

  /**
   * 隐藏群聊信息
   */
  hideGroupInfoModal() {
    this.setData({
      showGroupInfoModal: false
    })
  },

  /**
   * 编辑群聊信息
   */
  editGroupInfo() {
    const { groupInfo } = this.data
    
    this.setData({
      showEditGroupModal: true,
      editGroupData: {
        groupName: groupInfo.groupName,
        description: groupInfo.description,
        avatar: groupInfo.avatar,
        maxMembers: groupInfo.maxMembers,
        isPublic: groupInfo.isPublic,
        tags: groupInfo.tags || []
      }
    })
  },

  /**
   * 隐藏编辑群聊弹窗
   */
  hideEditGroupModal() {
    this.setData({
      showEditGroupModal: false,
      editGroupData: {}
    })
  },

  /**
   * 编辑群聊输入变化
   */
  onEditGroupInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`editGroupData.${field}`]: value
    })
  },

  /**
   * 确认编辑群聊
   */
  async confirmEditGroup() {
    const { editGroupData, groupId } = this.data
    
    // 验证输入
    if (!editGroupData.groupName || editGroupData.groupName.trim().length === 0) {
      wx.showToast({
        title: '请输入群聊名称',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '更新中...'
    })
    
    try {
      const app = getApp()
      const result = await app.cloudCall('group-chat-info', {
        action: 'update',
        groupId: groupId,
        data: {
          groupName: editGroupData.groupName.trim(),
          description: editGroupData.description.trim(),
          avatar: editGroupData.avatar,
          maxMembers: editGroupData.maxMembers,
          isPublic: editGroupData.isPublic,
          tags: editGroupData.tags
        }
      })
      
      wx.hideLoading()
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
        
        this.hideEditGroupModal()
        
        // 重新加载群聊信息
        this.loadGroupInfo()
      } else {
        throw new Error(result.result?.message || '更新失败')
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('更新群聊信息失败:', error)
      
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'none'
      })
    }
  },

  /**
   * 显示成员管理
   */
  showMemberManagement() {
    this.setData({
      showMemberManagementModal: true
    })
    
    // 加载成员列表
    this.loadMemberList()
  },

  /**
   * 隐藏成员管理
   */
  hideMemberManagement() {
    this.setData({
      showMemberManagementModal: false
    })
  },

  /**
   * 添加成员
   */
  addMember() {
    wx.showModal({
      title: '添加成员',
      content: '请输入要添加的用户的openid',
      editable: true,
      placeholderText: '请输入openid',
      success: (res) => {
        if (res.confirm && res.content) {
          this.confirmAddMember(res.content.trim())
        }
      }
    })
  },

  /**
   * 确认添加成员
   */
  async confirmAddMember(memberOpenid) {
    if (!memberOpenid) {
      wx.showToast({
        title: '请输入openid',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '添加中...'
    })
    
    try {
      const app = getApp()
      const result = await app.cloudCall('group-chat-info', {
        action: 'addMember',
        groupId: this.data.groupId,
        memberOpenid: memberOpenid
      })
      
      wx.hideLoading()
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        
        // 重新加载成员列表
        this.loadMemberList()
        
        // 重新加载群聊信息
        this.loadGroupInfo()
      } else {
        throw new Error(result.result?.message || '添加失败')
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('添加成员失败:', error)
      
      wx.showToast({
        title: error.message || '添加失败',
        icon: 'none'
      })
    }
  },

  /**
   * 移除成员
   */
  removeMember(e) {
    const { memberOpenid, memberName } = e.currentTarget.dataset
    
    wx.showModal({
      title: '移除成员',
      content: `确定要移除成员"${memberName}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.confirmRemoveMember(memberOpenid)
        }
      }
    })
  },

  /**
   * 确认移除成员
   */
  async confirmRemoveMember(memberOpenid) {
    wx.showLoading({
      title: '移除中...'
    })
    
    try {
      const app = getApp()
      const result = await app.cloudCall('group-chat-info', {
        action: 'removeMember',
        groupId: this.data.groupId,
        memberOpenid: memberOpenid
      })
      
      wx.hideLoading()
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '移除成功',
          icon: 'success'
        })
        
        // 重新加载成员列表
        this.loadMemberList()
        
        // 重新加载群聊信息
        this.loadGroupInfo()
      } else {
        throw new Error(result.result?.message || '移除失败')
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('移除成员失败:', error)
      
      wx.showToast({
        title: error.message || '移除失败',
        icon: 'none'
      })
    }
  },

  /**
   * 离开群聊
   */
  leaveGroup() {
    wx.showModal({
      title: '离开群聊',
      content: '确定要离开这个群聊吗？',
      success: (res) => {
        if (res.confirm) {
          this.confirmLeaveGroup()
        }
      }
    })
  },

  /**
   * 确认离开群聊
   */
  async confirmLeaveGroup() {
    wx.showLoading({
      title: '离开中...'
    })
    
    try {
      const app = getApp()
      const result = await app.cloudCall('group-chat-info', {
        action: 'leaveGroup',
        groupId: this.data.groupId
      })
      
      wx.hideLoading()
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '已离开群聊',
          icon: 'success'
        })
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result.result?.message || '离开失败')
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('离开群聊失败:', error)
      
      wx.showToast({
        title: error.message || '离开失败',
        icon: 'none'
      })
    }
  },

  /**
   * 转让群主
   */
  transferOwnership() {
    const { memberList } = this.data
    const members = memberList.filter(m => m.role !== 'owner')
    
    if (members.length === 0) {
      wx.showToast({
        title: '没有可转让的成员',
        icon: 'none'
      })
      return
    }
    
    const memberNames = members.map(m => m.nickName || m.openid)
    
    wx.showActionSheet({
      itemList: memberNames,
      success: (res) => {
        const selectedMember = members[res.tapIndex]
        this.confirmTransferOwnership(selectedMember.openid)
      }
    })
  },

  /**
   * 确认转让群主
   */
  async confirmTransferOwnership(newOwnerOpenid) {
    wx.showModal({
      title: '转让群主',
      content: '确定要转让群主权限吗？转让后您将变为普通成员。',
      success: (res) => {
        if (res.confirm) {
          this.executeTransferOwnership(newOwnerOpenid)
        }
      }
    })
  },

  /**
   * 执行转让群主
   */
  async executeTransferOwnership(newOwnerOpenid) {
    wx.showLoading({
      title: '转让中...'
    })
    
    try {
      const app = getApp()
      const result = await app.cloudCall('group-chat-info', {
        action: 'transferOwnership',
        groupId: this.data.groupId,
        data: {
          newOwnerOpenid: newOwnerOpenid
        }
      })
      
      wx.hideLoading()
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '转让成功',
          icon: 'success'
        })
        
        // 重新加载群聊信息
        this.loadGroupInfo()
        
        // 重新加载成员列表
        this.loadMemberList()
      } else {
        throw new Error(result.result?.message || '转让失败')
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('转让群主失败:', error)
      
      wx.showToast({
        title: error.message || '转让失败',
        icon: 'none'
      })
    }
  },

  /**
   * 获取最近消息的上下文
   */
  getRecentMessagesContext() {
    const recentMessages = this.data.messageList.slice(-5) // 获取最近的5条消息作为上下文
    return recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }
})