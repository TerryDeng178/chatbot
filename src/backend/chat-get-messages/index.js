// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('🚀 chat-get-messages 云函数开始执行')
  console.log('📥 接收参数:', event)
  
  const wxContext = cloud.getWXContext();
  const { groupId, afterTime, page = 1, pageSize = 20 } = event;
  const openid = wxContext.OPENID;

  console.log('👤 用户openid:', openid)
  console.log('💬 群组ID:', groupId)
  console.log('⏰ 时间过滤:', afterTime)
  console.log('📄 分页参数:', { page, pageSize })

  if (!groupId) {
    console.error('❌ 缺少必需参数 groupId')
    return {
      success: false,
      code: 400,
      message: 'groupId 参数必需',
      data: null
    };
  }

  try {
    console.log('🔍 查询群聊消息记录...')
    
    // 构建查询条件
    let queryCondition = { groupId: groupId }
    
    // 如果指定了时间，只获取该时间之后的消息
    if (afterTime) {
      queryCondition.createdAt = db.command.gt(new Date(afterTime))
      console.log('⏰ 应用时间过滤:', afterTime)
    }
    
    // 查询群聊消息
    let messagesQuery = db.collection('Messages').where(queryCondition)
    
    // 应用分页
    if (page && pageSize) {
      const skip = (page - 1) * pageSize
      messagesQuery = messagesQuery.skip(skip).limit(pageSize)
      console.log('📄 应用分页:', { skip, limit: pageSize })
    }
    
    const messagesResult = await messagesQuery
      .orderBy('createdAt', 'asc')
      .get();

    console.log('✅ 群聊消息查询成功')
    console.log('📊 消息数量:', messagesResult.data.length)

    // 格式化消息数据
    const formattedMessages = messagesResult.data.map(msg => ({
      id: msg._id,
      groupId: msg.groupId,
      role: msg.senderType === 'ai' || msg.senderType === 'bot' ? 'assistant' : 'user',
      content: msg.content,
      time: formatTime(msg.createdAt),
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      senderType: msg.senderType,
      type: msg.type || 'text'
    }))

    // 更新用户的最后阅读时间
    try {
      const groupMembersCollection = db.collection('GroupMembers')
      await groupMembersCollection.where({
        groupId: groupId,
        userId: openid
      }).update({
        data: {
          lastReadAt: new Date(),
          updatedAt: new Date()
        }
      })
    } catch (updateError) {
      console.log('⚠️ 更新最后阅读时间失败，可能是新用户:', updateError.message)
    }

    return {
      success: true,
      code: 200,
      message: '群聊消息获取成功',
      data: {
        messages: formattedMessages,
        page: page,
        pageSize: pageSize,
        hasMore: messagesResult.data.length === pageSize
      }
    };
  } catch (e) {
    console.error('💥 查询群聊消息失败:', e);
    console.error('💥 错误堆栈:', e.stack);
    
    return {
      success: false,
      code: 500,
      message: '数据库查询错误: ' + e.message,
      data: {
        error: e.message,
        stack: e.stack
      }
    };
  }
};

/**
 * 格式化时间
 */
function formatTime(date) {
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return new Date(date).toLocaleDateString('zh-CN')
}