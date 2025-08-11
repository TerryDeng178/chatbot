// 创建群聊云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 创建自定义群聊
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { name, topic, description, botIds = [] } = event
    const userId = wxContext.OPENID
    
    if (!userId) {
      return {
        success: false,
        code: 400,
        message: '用户身份验证失败'
      }
    }
    
    if (!name || !topic) {
      return {
        success: false,
        code: 400,
        message: '群聊名称和主题不能为空'
      }
    }
    
    console.log(`用户 ${userId} 创建群聊: ${name}`)
    
    // 创建群聊
    const groupsCollection = db.collection('Groups')
    const groupResult = await groupsCollection.add({
      data: {
        name: name,
        topic: topic,
        description: description || '',
        isPreset: false,
        pinned: false,
        memberCount: 1, // 创建者自动加入
        lastMessage: `欢迎来到 ${name}！`,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId
      }
    })
    
    const groupId = groupResult._id
    
    // 创建者自动加入群聊
    const groupMembersCollection = db.collection('GroupMembers')
    await groupMembersCollection.add({
      data: {
        groupId: groupId,
        userId: userId,
        role: 'user',
        joinedAt: new Date(),
        lastReadAt: new Date(),
        createdAt: new Date()
      }
    })
    
    // 如果有选择AI角色，添加到群聊
    if (botIds.length > 0) {
      const botsCollection = db.collection('Bots')
      
      for (const botId of botIds) {
        // 这里应该根据botId获取AI角色信息
        // 暂时使用占位符
        await groupMembersCollection.add({
          data: {
            groupId: groupId,
            userId: `bot_${botId}`,
            role: 'bot',
            joinedAt: new Date(),
            lastReadAt: new Date(),
            createdAt: new Date()
          }
        })
      }
      
      // 更新群聊成员数
      await groupsCollection.doc(groupId).update({
        data: {
          memberCount: 1 + botIds.length,
          updatedAt: new Date()
        }
      })
    }
    
    // 添加系统欢迎消息
    const messagesCollection = db.collection('Messages')
    await messagesCollection.add({
      data: {
        groupId: groupId,
        senderId: 'system',
        senderType: 'system',
        content: `欢迎来到 ${name}！群聊创建成功，开始你的对话吧！`,
        type: 'text',
        createdAt: new Date(),
        meta: {
          isSystemMessage: true
        }
      }
    })
    
    return {
      success: true,
      code: 200,
      message: '群聊创建成功',
      data: {
        groupId: groupId,
        name: name,
        topic: topic,
        memberCount: 1 + botIds.length,
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error) {
    console.error('创建群聊失败:', error)
    return {
      success: false,
      code: 500,
      message: '创建群聊失败',
      data: {
        error: error.message
      }
    }
  }
}
