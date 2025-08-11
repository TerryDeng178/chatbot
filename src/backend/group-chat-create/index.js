// 群聊创建云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 获取AI性格信息
function getAIInfo(aiId) {
  const aiPersonalities = {
    1: { id: 1, name: '温情', nickname: '心灵导师温情', personality: '温暖关怀型', avatar: '💖' },
    2: { id: 2, name: '小博', nickname: '知识助手小博', personality: '博学专业型', avatar: '📚' },
    3: { id: 3, name: '小艺', nickname: '创意伙伴小艺', personality: '创意活泼型', avatar: '🎨' },
    4: { id: 4, name: '小商', nickname: '商务顾问小商', personality: '商务专业型', avatar: '💼' },
    5: { id: 5, name: '小码', nickname: '技术专家小码', personality: '技术专家型', avatar: '💻' }
  }
  
  return aiPersonalities[aiId] || { id: aiId, name: '未知AI', nickname: '未知AI', personality: '未知类型', avatar: '🤖' }
}

// 主函数
exports.main = async (event, context) => {
  console.log('🚀 group-chat-create 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    // 解析参数
    const { 
      groupName = '新群聊',
      description = '欢迎来到新群聊！',
      avatar = '👥',
      maxMembers = 100,
      isPublic = true,
      initialAIs = [1, 2, 3], // 默认激活3个AI
      tags = [],
      settings = {}
    } = event
    
    console.log('📝 解析参数:', { groupName, description, avatar, maxMembers, isPublic, initialAIs, tags, settings })
    
    // 基本验证
    if (!groupName || groupName.trim().length === 0) {
      return {
        success: false,
        code: 400,
        message: '群聊名称不能为空',
        data: { provided: { groupName } }
      }
    }
    
    if (initialAIs.length === 0 || initialAIs.length > 5) {
      return {
        success: false,
        code: 400,
        message: '初始AI数量必须在1-5个之间',
        data: { provided: { initialAIs } }
      }
    }
    
    const db = cloud.database()
    const now = new Date()
    
    // 检查用户是否已有过多群聊
    const userGroupsCount = await db.collection('Groups')
      .where({
        creatorId: openid,
        status: 'active'
      })
      .count()
    
    if (userGroupsCount.total >= 10) {
      return {
        success: false,
        code: 400,
        message: '您创建的群聊数量已达上限（10个）',
        data: { currentCount: userGroupsCount.total, limit: 10 }
      }
    }
    
    // 创建群聊
    const groupResult = await db.collection('Groups').add({
      data: {
        groupName: groupName.trim(),
        description: description.trim(),
        avatar: avatar,
        creatorId: openid,
        creatorInfo: {
          openid: openid,
          createdAt: now
        },
        members: [{
          openid: openid,
          role: 'owner',
          joinedAt: now,
          status: 'active'
        }],
        memberCount: 1,
        maxMembers: maxMembers,
        isPublic: isPublic,
        status: 'active',
        activeAIs: initialAIs,
        aiConfig: {
          maxAIs: 5,
          currentAIs: initialAIs,
          aiSettings: initialAIs.reduce((acc, aiId) => {
            const aiInfo = getAIInfo(aiId)
            acc[aiId] = {
              enabled: true,
              personality: aiInfo.personality,
              nickname: aiInfo.nickname,
              avatar: aiInfo.avatar
            }
            return acc
          }, {})
        },
        tags: tags,
        settings: {
          allowMemberInvite: true,
          allowAIManagement: true,
          messageRetention: 30, // 消息保留30天
          ...settings
        },
        stats: {
          messageCount: 0,
          lastActiveAt: now,
          createdAt: now
        },
        createdAt: now,
        updatedAt: now
      }
    })
    
    console.log('✅ 群聊创建成功:', groupResult._id)
    
    // 创建欢迎消息
    const welcomeMessage = {
      groupId: groupResult._id,
      senderId: 'system',
      senderType: 'system',
      content: `欢迎来到群聊"${groupName}"！我是AI助手，有什么可以帮助您的吗？`,
      type: 'text',
      createdAt: now,
      meta: {
        isWelcomeMessage: true,
        timestamp: now.getTime()
      }
    }
    
    await db.collection('Messages').add({
      data: welcomeMessage
    })
    
    // 创建AI介绍消息
    const aiIntroMessage = {
      groupId: groupResult._id,
      senderId: 'system',
      senderType: 'system',
      content: `当前群聊已激活 ${initialAIs.length} 个AI助手：${initialAIs.map(id => getAIInfo(id).nickname).join('、')}`,
      type: 'text',
      createdAt: now,
      meta: {
        isSystemMessage: true,
        timestamp: now.getTime()
      }
    }
    
    await db.collection('Messages').add({
      data: aiIntroMessage
    })
    
    // 更新群聊统计信息
    await db.collection('Groups').doc(groupResult._id).update({
      data: {
        'stats.messageCount': 2, // 欢迎消息 + AI介绍消息
        'stats.lastActiveAt': now,
        updatedAt: now
      }
    })
    
    // 获取创建后的群聊信息
    const createdGroup = await db.collection('Groups').doc(groupResult._id).get()
    
    const totalTime = Date.now() - startTime
    
    // 返回结果
    const result = {
      success: true,
      code: 200,
      message: '群聊创建成功',
      data: {
        groupId: groupResult._id,
        groupInfo: createdGroup.data,
        welcomeMessage: welcomeMessage,
        aiIntroMessage: aiIntroMessage,
        totalTime: totalTime
      }
    }
    
    console.log('📤 返回结果:', JSON.stringify(result))
    console.log('⏱️ 总执行时间:', totalTime + 'ms')
    return result
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 群聊创建云函数执行异常:', error)
    
    return {
      success: false,
      code: 500,
      message: '服务器内部错误: ' + error.message,
      data: {
        error: error.message,
        totalTime: totalTime
      }
    }
  }
}
