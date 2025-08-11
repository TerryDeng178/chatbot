// 数据库初始化云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 初始化数据库集合和索引
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('开始初始化数据库...')
    
    // 检查数据库环境
    await checkDatabaseEnvironment()
    
    // 初始化Users集合
    await initUsersCollection()
    
    // 初始化Messages集合  
    await initMessagesCollection()
    
    // 初始化ChatSessions集合
    await initChatSessionsCollection()
    
    // 初始化群聊相关集合
    await initGroupsCollection()
    await initGroupMembersCollection()
    await initBotsCollection()
    await initPresenceCollection()
    
    // 预置主题群聊数据
    await initPresetGroups()
    
    console.log('数据库初始化完成')
    
    return {
      success: true,
      code: 200,
      message: '数据库初始化成功',
      data: {
        collections: ['Users', 'Messages', 'ChatSessions', 'Groups', 'GroupMembers', 'Bots', 'Presence'],
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error) {
    console.error('数据库初始化失败:', error)
    return {
      success: false,
      code: 500,
      message: '数据库初始化失败',
      data: {
        error: error.message
      }
    }
  }
}

// 初始化用户集合
async function initUsersCollection() {
  const collection = db.collection('Users')
  
  try {
    // 检查集合是否存在，如果不存在则创建
    const result = await collection.limit(1).get()
    console.log('✅ Users集合初始化完成')
  } catch (error) {
    console.log('⚠️ Users集合访问失败，但继续执行:', error.message)
  }
}

// 初始化消息集合
async function initMessagesCollection() {
  const collection = db.collection('Messages')
  
  try {
    // 检查集合是否存在
    const result = await collection.limit(1).get()
    console.log('✅ Messages集合初始化完成')
  } catch (error) {
    console.log('⚠️ Messages集合访问失败，但继续执行:', error.message)
  }
}

// 初始化聊天会话集合
async function initChatSessionsCollection() {
  const collection = db.collection('ChatSessions')
  
  try {
    // 检查集合是否存在
    const result = await collection.limit(1).get()
    console.log('✅ ChatSessions集合初始化完成')
  } catch (error) {
    console.log('⚠️ ChatSessions集合访问失败，但继续执行:', error.message)
  }
}

// 初始化群聊集合
async function initGroupsCollection() {
  const collection = db.collection('Groups')
  
  try {
    // 检查集合是否存在
    const result = await collection.limit(1).get()
    console.log('✅ Groups集合初始化完成')
  } catch (error) {
    console.log('⚠️ Groups集合访问失败，但继续执行:', error.message)
  }
}

// 初始化群聊成员集合
async function initGroupMembersCollection() {
  const collection = db.collection('GroupMembers')
  
  try {
    // 检查集合是否存在
    const result = await collection.limit(1).get()
    console.log('✅ GroupMembers集合初始化完成')
  } catch (error) {
    console.log('⚠️ GroupMembers集合访问失败，但继续执行:', error.message)
  }
}

// 初始化机器人集合
async function initBotsCollection() {
  const collection = db.collection('Bots')
  
  try {
    // 检查集合是否存在
    const result = await collection.limit(1).get()
    
    // 检查是否已有预设机器人
    const existingBots = await collection.where({
      isPreset: true
    }).get()
    
    if (existingBots.data.length > 0) {
      console.log('✅ 预设机器人已存在，跳过初始化')
      return
    }
    
    // 预设AI机器人数据 - 多种性格
    const presetBots = [
      {
        id: 1,
        name: '温情',
        nickname: '心灵导师温情',
        avatar: '💝',
        personality: '温暖关怀型',
        description: '温柔体贴，善于倾听和安慰，用温暖的话语抚慰心灵',
        characterTraits: ['温暖', '关怀', '倾听', '安慰', '理解'],
        responseStyle: '温柔关怀的语调，充满同理心，善于情绪调节',
        expertise: ['情绪支持', '心理安慰', '人际关系', '生活建议'],
        gender: 'female',
        speakingStyle: 'gentle',
        identity: 'psychologist',
        relationship: 'mentor',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: '小博',
        nickname: '知识助手小博',
        avatar: '📚',
        personality: '博学专业型',
        description: '知识渊博，专业严谨，善于解答各类问题，提供准确信息',
        characterTraits: ['博学', '专业', '严谨', '耐心', '详细'],
        responseStyle: '专业友好的语调，逻辑清晰，信息准确详实',
        expertise: ['知识问答', '学习指导', '技术咨询', '学术讨论'],
        gender: 'male',
        speakingStyle: 'professional',
        identity: 'teacher',
        relationship: 'mentor',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: '小艺',
        nickname: '创意伙伴小艺',
        avatar: '🎨',
        personality: '创意活泼型',
        description: '富有创意，思维活跃，善于激发灵感，让对话充满趣味',
        characterTraits: ['创意', '活泼', '有趣', '想象力', '创新'],
        responseStyle: '活泼有趣的语调，充满创意，善于激发灵感',
        expertise: ['创意激发', '艺术讨论', '灵感分享', '趣味互动'],
        gender: 'female',
        speakingStyle: 'creative',
        identity: 'artist',
        relationship: 'friend',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        name: '小商',
        nickname: '商务顾问小商',
        avatar: '💼',
        personality: '商务专业型',
        description: '商务经验丰富，专业严谨，善于分析问题，提供实用建议',
        characterTraits: ['专业', '严谨', '实用', '分析', '经验丰富'],
        responseStyle: '严谨专业的语调，逻辑清晰，建议实用可行',
        expertise: ['商务咨询', '职场建议', '项目管理', '商业分析'],
        gender: 'male',
        speakingStyle: 'concise',
        identity: 'business-consultant',
        relationship: 'colleague',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: '小码',
        nickname: '技术专家小码',
        avatar: '💻',
        personality: '技术专家型',
        description: '技术功底深厚，善于解决技术问题，用通俗易懂的方式解释复杂概念',
        characterTraits: ['技术', '专业', '耐心', '通俗易懂', '解决问题'],
        responseStyle: '专业易懂的语调，技术准确，解释清晰',
        expertise: ['技术咨询', '编程指导', '系统分析', '问题解决'],
        gender: 'male',
        speakingStyle: 'technical',
        identity: 'engineer',
        relationship: 'mentor',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 6,
        name: '小幽',
        nickname: '幽默大师小幽',
        avatar: '😄',
        personality: '幽默风趣型',
        description: '幽默风趣，善于调节气氛，用轻松愉快的方式让对话充满欢乐',
        characterTraits: ['幽默', '风趣', '轻松', '欢乐', '调节气氛'],
        responseStyle: '幽默风趣的语调，轻松愉快，善于调节气氛',
        expertise: ['幽默调节', '气氛营造', '娱乐互动', '心情提升'],
        gender: 'male',
        speakingStyle: 'humorous',
        identity: 'entertainer',
        relationship: 'friend',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 7,
        name: '小诗',
        nickname: '文艺诗人小诗',
        avatar: '📝',
        personality: '文艺诗意型',
        description: '富有诗意，善于用优美的语言表达情感，让对话充满文学气息',
        characterTraits: ['诗意', '优美', '感性', '文学', '情感丰富'],
        responseStyle: '诗意优美的语调，语言优美，情感丰富',
        expertise: ['文学讨论', '诗歌创作', '情感表达', '美学欣赏'],
        gender: 'female',
        speakingStyle: 'poetic',
        identity: 'poet',
        relationship: 'friend',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 8,
        name: '小智',
        nickname: '智慧长者小智',
        avatar: '🧠',
        personality: '智慧长者型',
        description: '阅历丰富，智慧深邃，善于用人生哲理启发思考，提供深度建议',
        characterTraits: ['智慧', '深邃', '阅历丰富', '哲理', '启发思考'],
        responseStyle: '智慧深邃的语调，富有哲理，善于启发思考',
        expertise: ['人生哲理', '深度思考', '经验分享', '智慧启发'],
        gender: 'male',
        speakingStyle: 'wise',
        identity: 'philosopher',
        relationship: 'mentor',
        isPreset: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    // 批量插入预设机器人
    for (const bot of presetBots) {
      await collection.add({
        data: bot
      })
    }
    
    console.log('✅ 预设机器人数据初始化完成，共创建', presetBots.length, '个AI性格')
  } catch (error) {
    console.log('⚠️ Bots集合访问失败，但继续执行:', error.message)
  }
}

// 初始化在线状态集合
async function initPresenceCollection() {
  const collection = db.collection('Presence')
  
  try {
    // 检查集合是否存在
    const result = await collection.limit(1).get()
    console.log('✅ Presence集合初始化完成')
  } catch (error) {
    console.log('⚠️ Presence集合访问失败，但继续执行:', error.message)
  }
}

// 检查数据库环境
async function checkDatabaseEnvironment() {
  try {
    console.log('🔍 检查数据库环境...')
    
    // 获取所有集合列表
    const collections = await db.listCollections()
    console.log('📚 当前数据库集合:', collections.data.map(col => col.name))
    
    // 检查云环境
    const env = cloud.DYNAMIC_CURRENT_ENV
    console.log('☁️ 当前云环境:', env)
    
    return true
  } catch (error) {
    console.error('❌ 检查数据库环境失败:', error)
    return false
  }
}

// 预置主题群聊数据
async function initPresetGroups() {
  const collection = db.collection('Groups')
  
  try {
    // 检查是否已有预置群聊
    const existingGroups = await collection.where({
      isPreset: true
    }).get()
    
    if (existingGroups.data.length > 0) {
      console.log('✅ 预置群聊已存在，跳过初始化')
      return
    }
    
    // 预置群聊数据
    const presetGroups = [
      {
        name: '情绪调节小站',
        topic: 'emotion-support',
        description: '在这里分享你的心情，获得温暖的陪伴和支持',
        isPreset: true,
        pinned: true,
        memberCount: 0,
        members: [], // 添加空的members数组
        lastMessage: '欢迎来到情绪调节小站！让我们一起分享心情，互相支持 💕',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '职场解压圈',
        topic: 'workplace-relax',
        description: '职场压力大？来这里聊聊工作，找到解压的方法',
        isPreset: true,
        pinned: true,
        memberCount: 0,
        members: [], // 添加空的members数组
        lastMessage: '职场不易，但我们可以一起面对！有什么想聊的吗？💼',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '树洞夜聊',
        topic: 'night-chat',
        description: '夜深人静时，来这里倾诉心事，找到共鸣',
        isPreset: true,
        pinned: true,
        memberCount: 0,
        members: [], // 添加空的members数组
        lastMessage: '夜深了，有什么心事想聊聊吗？我在这里倾听 🌙',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '创意灵感集',
        topic: 'creative-ideas',
        description: '激发创意，分享灵感，让想象力自由飞翔',
        isPreset: true,
        pinned: false,
        memberCount: 0,
        members: [], // 添加空的members数组
        lastMessage: '创意无处不在！今天有什么新想法要分享吗？✨',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '学习互助组',
        topic: 'study-help',
        description: '学习路上不孤单，互相帮助，共同进步',
        isPreset: true,
        pinned: false,
        memberCount: 0,
        members: [], // 添加空的members数组
        lastMessage: '学习是一个持续的过程，有什么问题需要帮助吗？📚',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    // 批量插入预置群聊
    for (const group of presetGroups) {
      await collection.add({
        data: group
      })
    }
    
    console.log('✅ 预置群聊数据初始化完成，共创建', presetGroups.length, '个群聊')
  } catch (error) {
    console.error('预置群聊初始化失败:', error)
    // 不抛出错误，因为这不是核心功能
  }
}
