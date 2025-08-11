// 群聊获取消息云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('🚀 group-chat-get-messages 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    // 解析参数
    const { groupId, page = 1, pageSize = 20, afterTime, afterId, phase } = event
    console.log('📝 解析参数 - groupId:', groupId, 'page:', page, 'pageSize:', pageSize, 'phase:', phase || 'initial', 'afterTime:', afterTime, 'afterId:', afterId)
    
    // 基本验证
    if (!groupId) {
      console.log('❌ 参数验证失败')
      return {
        success: false,
        code: 400,
        message: '缺少必要参数 groupId',
        data: { 
          provided: { groupId, page, pageSize, afterTime },
          openid: openid
        }
      }
    }
    
    console.log('✅ 参数验证通过')
    
    // 数据库操作
    try {
      const db = cloud.database()
      console.log('💾 查询群聊消息...')
      
      // 构建查询条件
      let query = { groupId: groupId }
      
      // 如果指定了时间，只获取该时间“之后”的消息（严格大于，避免重复取到最后一条）
      let ts = null
      if (afterTime) {
        ts = typeof afterTime === 'number' ? new Date(afterTime) : new Date(afterTime)
        // 使用 gt 严格大于，进一步降低重复概率；仍保留内存二级游标过滤作为兜底
        query.createdAt = db.command.gt(ts)
      }
      
      // 查询消息
      const messagesResult = await db.collection('Messages')
        .where(query)
        .orderBy('createdAt', 'desc') // 按时间倒序
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      
      console.log('✅ 消息查询成功，获取到', messagesResult.data.length, '条消息')
      
      // 格式化消息数据
      let messages = messagesResult.data.map(msg => ({
        _id: msg._id,
        id: msg._id,
        groupId: msg.groupId,
        senderId: msg.senderId,
        senderType: msg.senderType,
        senderName: msg.senderName || (msg.senderType === 'ai' ? 'AI助手' : '用户'),
        content: msg.content,
        type: msg.type || 'text',
        createdAt: msg.createdAt,
        timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
        meta: msg.meta || {}
      }))

      // 严格过滤：createdAt > ts 或 (== ts 且 id > afterId)
      if (ts) {
        const baseMs = ts.getTime()
        messages = messages.filter(m => {
          const ms = (m.timestamp || (m.createdAt ? new Date(m.createdAt).getTime() : 0))
          if (ms > baseMs) return true
          if (ms === baseMs && afterId) return String(m.id) > String(afterId)
          return false
        })
      }
      
      // 按时间正序排列（最新的在最后）
      messages.reverse()
      
      const totalTime = Date.now() - startTime
      
      // 返回成功结果
      const result = {
        success: true,
        code: 200,
        message: '获取消息成功',
        data: {
          messages: messages,
          total: messages.length,
          page: page,
          pageSize: pageSize,
          hasMore: messages.length === pageSize
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
