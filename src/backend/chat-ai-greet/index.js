// AI主动发言云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * AI主动发言和话题引导
 * 仅在用户在线且满足频控条件时触发
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { groupId, triggerType = 'greeting' } = event
    const userId = wxContext.OPENID
    
    if (!userId || !groupId) {
      return {
        success: false,
        code: 400,
        message: '参数不完整'
      }
    }
    
    console.log(`AI主动发言触发: 群聊 ${groupId}, 类型: ${triggerType}`)
    
    // 检查用户是否在线（30秒内有心跳）
    const presenceCollection = db.collection('Presence')
    const userPresence = await presenceCollection.where({
      userId: userId
    }).get()
    
    if (userPresence.data.length === 0) {
      return {
        success: false,
        code: 400,
        message: '用户不在线'
      }
    }
    
    const lastPing = new Date(userPresence.data[0].lastPingAt)
    const now = new Date()
    const timeDiff = (now - lastPing) / 1000 // 秒
    
    if (timeDiff > 30) {
      return {
        success: false,
        code: 400,
        message: '用户已离线'
      }
    }
    
    // 检查频控（3分钟内最多1次AI主动发言）
    const messagesCollection = db.collection('Messages')
    const recentAIMessages = await messagesCollection.where({
      groupId: groupId,
      senderType: 'ai',
      createdAt: db.command.gte(new Date(now - 3 * 60 * 1000)) // 3分钟内
    }).count()
    
    if (recentAIMessages.total > 0) {
      return {
        success: false,
        code: 429,
        message: '频控限制，请稍后再试'
      }
    }
    
    // 获取群聊信息
    const groupsCollection = db.collection('Groups')
    const groupInfo = await groupsCollection.doc(groupId).get()
    
    if (!groupInfo.data) {
      return {
        success: false,
        code: 404,
        message: '群聊不存在'
      }
    }
    
    // 根据触发类型生成不同的AI发言
    let aiMessage = ''
    let aiName = '小助手'
    
    switch (triggerType) {
      case 'greeting':
        aiMessage = generateGreetingMessage(groupInfo.data)
        break
      case 'topic_suggestion':
        aiMessage = generateTopicSuggestion(groupInfo.data)
        break
      case 'encouragement':
        aiMessage = generateEncouragementMessage(groupInfo.data)
        break
      default:
        aiMessage = generateGreetingMessage(groupInfo.data)
    }
    
    // 添加AI消息到群聊
    const messageResult = await messagesCollection.add({
      data: {
        groupId: groupId,
        senderId: 'ai_greeter',
        senderType: 'ai',
        senderName: aiName,
        content: aiMessage,
        type: 'text',
        createdAt: new Date(),
        meta: {
          triggerType: triggerType,
          isAIGenerated: true
        }
      }
    })
    
    // 更新群聊最后消息
    await groupsCollection.doc(groupId).update({
      data: {
        lastMessage: aiMessage,
        lastActiveAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    return {
      success: true,
      code: 200,
      message: 'AI发言成功',
      data: {
        messageId: messageResult._id,
        content: aiMessage,
        aiName: aiName,
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error) {
    console.error('AI主动发言失败:', error)
    return {
      success: false,
      code: 500,
      message: 'AI主动发言失败',
      data: {
        error: error.message
      }
    }
  }
}

// 生成欢迎消息
function generateGreetingMessage(groupInfo) {
  const greetings = [
    `欢迎来到 ${groupInfo.name}！有什么想聊的吗？`,
    `嗨！我是 ${groupInfo.name} 的小助手，很高兴见到你！`,
    `欢迎新朋友！在 ${groupInfo.name} 里，我们可以畅所欲言 💕`,
    `你好！我是这里的AI助手，有什么需要帮助的吗？`,
    `欢迎加入 ${groupInfo.name}！让我们一起分享快乐时光吧！`
  ]
  
  return greetings[Math.floor(Math.random() * greetings.length)]
}

// 生成话题建议
function generateTopicSuggestion(groupInfo) {
  const topics = [
    '今天天气不错，大家有什么安排吗？',
    '最近有什么有趣的事情想分享吗？',
    '有什么问题需要大家一起讨论的吗？',
    '今天心情怎么样？想聊聊吗？',
    '有什么新发现或新想法要分享的吗？'
  ]
  
  return topics[Math.floor(Math.random() * topics.length)]
}

// 生成鼓励消息
function generateEncouragementMessage(groupInfo) {
  const encouragements = [
    '每个人都有自己的故事，勇敢地分享出来吧！',
    '在这里，我们都是朋友，不用害怕表达自己 💪',
    '你的想法很有价值，说出来让大家听听吧！',
    '记住，你并不孤单，我们都在这里支持你！',
    '勇敢地迈出第一步，你会发现更多美好！'
  ]
  
  return encouragements[Math.floor(Math.random() * encouragements.length)]
}
