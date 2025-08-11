// 群聊消息发送云函数 - 高性能版本
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('🚀 group-chat-send-message 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    // 解析参数
    const { groupId, content, type = 'text' } = event
    console.log('📝 解析参数 - groupId:', groupId, 'content:', content, 'type:', type)
    
    // 基本验证
    if (!groupId || !content) {
      console.log('❌ 参数验证失败')
      return {
        success: false,
        code: 400,
        message: '缺少必要参数 groupId 或 content',
        data: { 
          provided: { groupId, content, type },
          openid: openid
        }
      }
    }
    
    console.log('✅ 参数验证通过')
    
    // 快速数据库操作
    try {
      const db = cloud.database()
      console.log('💾 保存消息到数据库...')
      
      const now = new Date()
      
      // 保存用户消息
      const messageData = {
        groupId: groupId,
        senderId: openid,
        senderType: 'user',
        content: content,
        type: type,
        createdAt: now,
        meta: {
          timestamp: now.getTime()
        }
      }
      
      const messageResult = await db.collection('Messages').add({ data: messageData })
      console.log('✅ 消息保存成功')
      
      // 异步更新群聊信息（不等待完成）
      db.collection('Groups').doc(groupId).update({
        data: {
          lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          lastActiveAt: now,
          updatedAt: now,
          messageCount: db.command.inc(1)
        }
      }).catch(err => console.warn('⚠️ 群聊信息更新失败:', err.message))
      
      const totalTime = Date.now() - startTime
      
      // 返回成功结果
      const result = {
        success: true,
        code: 200,
        message: '消息发送成功',
        data: {
          messageId: messageResult._id,
          content: content,
          type: type,
          timestamp: now.getTime(),
          totalTime: totalTime
        }
      }
      
      console.log('📤 返回结果:', JSON.stringify(result))
      console.log('⏱️ 总执行时间:', totalTime + 'ms')
      return result
      
    } catch (dbError) {
      console.error('💥 数据库操作失败:', dbError)
      throw new Error('数据库操作失败: ' + dbError.message)
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 云函数执行异常:', error)
    console.error('💥 错误消息:', error.message)
    console.error('💥 总执行时间:', totalTime + 'ms')
    
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
