const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    console.error('Missing openid in context.')
    return { 
      success: false, 
      message: '请求参数错误：缺少openid' 
    }
  }

  try {
    // 获取预置群聊列表
    const groupsCollection = db.collection('Groups')
    const presetGroupsResult = await groupsCollection
      .where({
        isPreset: true
      })
      .orderBy('pinned', 'desc')
      .orderBy('lastActiveAt', 'desc')
      .get()

    // 获取用户加入的群聊
    const groupMembersCollection = db.collection('GroupMembers')
    const userGroupsResult = await groupMembersCollection
      .where({
        userId: openid
      })
      .get()

    const userGroupIds = userGroupsResult.data.map(item => item.groupId)

    // 获取用户群聊的详细信息
    let userGroups = []
    if (userGroupIds.length > 0) {
      const userGroupsDetailResult = await groupsCollection
        .where({
          _id: db.command.in(userGroupIds)
        })
        .orderBy('lastActiveAt', 'desc')
        .get()
      
      userGroups = userGroupsDetailResult.data
    }

    // 合并预置群聊和用户群聊，去重
    const allGroups = [...presetGroupsResult.data]
    userGroups.forEach(userGroup => {
      const exists = allGroups.find(group => group._id === userGroup._id)
      if (!exists) {
        allGroups.push(userGroup)
      }
    })

    // 为每个群聊添加未读消息数和格式化时间
    const groupsWithUnread = await Promise.all(allGroups.map(async (group) => {
      // 获取用户在该群的最后阅读时间
      const memberInfo = userGroupsResult.data.find(member => member.groupId === group._id)
      const lastReadAt = memberInfo ? memberInfo.lastReadAt : null

      // 计算未读消息数
      let unreadCount = 0
      if (lastReadAt) {
        const messagesCollection = db.collection('Messages')
        const unreadResult = await messagesCollection
          .where({
            groupId: group._id,
            createdAt: db.command.gt(lastReadAt)
          })
          .count()
        unreadCount = unreadResult.total
      }

      // 格式化时间
      const lastActiveAt = group.lastActiveAt ? formatTime(group.lastActiveAt) : '刚刚'

      return {
        _id: group._id,
        name: group.name,
        description: group.description || '',
        topic: group.topic || '',
        isPreset: group.isPreset || false,
        pinned: group.pinned || false,
        memberCount: group.memberCount || 1,
        lastMessage: group.lastMessage || '暂无消息',
        lastActiveAt: lastActiveAt,
        unreadCount: unreadCount,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    }))

    console.log(`成功为用户 ${openid} 查询到 ${groupsWithUnread.length} 个群聊。`)

    return {
      success: true,
      message: '群聊列表获取成功',
      data: {
        groups: groupsWithUnread
      }
    }

  } catch (e) {
    console.error(`[${openid}] 查询群聊列表失败`, e)
    return {
      success: false,
      message: '服务器内部错误，请稍后重试',
      error: e.message
    }
  }
}

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