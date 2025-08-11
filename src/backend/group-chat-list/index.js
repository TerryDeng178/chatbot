// 群聊列表管理云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 主函数
exports.main = async (event, context) => {
  console.log('🚀 group-chat-list 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    // 解析参数
    const { 
      action = 'getMyGroups', // getMyGroups, searchGroups, joinGroup, getPublicGroups
      groupId,
      searchKeyword,
      page = 1,
      pageSize = 20
    } = event
    
    console.log('📝 解析参数:', { action, groupId, searchKeyword, page, pageSize })
    
    const db = cloud.database()
    const now = new Date()
    
    // 根据action执行不同操作
    switch (action) {
      case 'getMyGroups':
        return await getMyGroups(openid, page, pageSize)
        
      case 'searchGroups':
        return await searchGroups(searchKeyword, page, pageSize)
        
      case 'joinGroup':
        return await joinGroup(openid, groupId)
        
      case 'getPublicGroups':
        return await getPublicGroups(page, pageSize)
        
      default:
        return {
          success: false,
          code: 400,
          message: '不支持的操作类型',
          data: { action, supportedActions: ['getMyGroups', 'searchGroups', 'joinGroup', 'getPublicGroups'] }
        }
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 群聊列表管理云函数执行异常:', error)
    
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

// 获取我的群聊列表
async function getMyGroups(openid, page, pageSize) {
  const db = cloud.database()
  const skip = (page - 1) * pageSize
  
  try {
    // 获取我的群聊列表（包括预设群聊）
    const myGroups = await db.collection('Groups')
      .where({
        $or: [
          { 'members.openid': openid, status: 'active' },
          { isPreset: true, status: 'active' }
        ]
      })
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const totalCount = await db.collection('Groups')
      .where({
        $or: [
          { 'members.openid': openid, status: 'active' },
          { isPreset: true, status: 'active' }
        ]
      })
      .count()
    
    // 处理群聊数据
    const groups = myGroups.data.map(group => {
      // 安全检查 members 字段
      if (!group.members || !Array.isArray(group.members)) {
        console.warn('群聊数据格式错误:', { groupId: group._id, membersType: typeof group.members })
        return {
          ...group,
          userRole: 'unknown',
          userJoinedAt: null,
          lastMessage: group.lastMessage ? {
            content: group.lastMessage.content,
            senderType: group.lastMessage.senderType,
            createdAt: group.lastMessage.createdAt
          } : null
        }
      }
      
      const userMember = group.members.find(m => m.openid === openid)
      
      // 如果是预设群聊且用户不是成员，创建临时成员信息
      if (group.isPreset && !userMember) {
        return {
          ...group,
          userRole: 'member',
          userJoinedAt: new Date(),
          lastMessage: group.lastMessage ? {
            content: group.lastMessage.content,
            senderType: group.lastMessage.senderType,
            createdAt: group.lastMessage.createdAt
          } : null
        }
      }
      
      return {
        ...group,
        userRole: userMember ? userMember.role : 'unknown',
        userJoinedAt: userMember ? userMember.joinedAt : null,
        lastMessage: group.lastMessage ? {
          content: group.lastMessage.content,
          senderType: group.lastMessage.senderType,
          createdAt: group.lastMessage.createdAt
        } : null
      }
    })
    
    return {
      success: true,
      code: 200,
      message: '获取我的群聊列表成功',
      data: {
        groups,
        pagination: {
          page,
          pageSize,
          total: totalCount.total,
          totalPages: Math.ceil(totalCount.total / pageSize)
        }
      }
    }
    
  } catch (error) {
    console.error('获取我的群聊列表失败:', error)
    throw error
  }
}

// 搜索群聊
async function searchGroups(searchKeyword, page, pageSize) {
  if (!searchKeyword || searchKeyword.trim().length === 0) {
    return {
      success: false,
      code: 400,
      message: '搜索关键词不能为空',
      data: { searchKeyword }
    }
  }
  
  const db = cloud.database()
  const skip = (page - 1) * pageSize
  
  try {
    // 搜索公开群聊（包括预设群聊）
    const searchResults = await db.collection('Groups')
      .where({
        status: 'active',
        $or: [
          { isPublic: true },
          { isPreset: true }
        ]
      })
      .where({
        $or: [
          {
            groupName: db.RegExp({
              regexp: searchKeyword.trim(),
              options: 'i'
            })
          },
          {
            description: db.RegExp({
              regexp: searchKeyword.trim(),
              options: 'i'
            })
          },
          {
            tags: db.RegExp({
              regexp: searchKeyword.trim(),
              options: 'i'
            })
          }
        ]
      })
      .orderBy('stats.lastActiveAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const totalCount = await db.collection('Groups')
      .where({
        status: 'active',
        $or: [
          { isPublic: true },
          { isPreset: true }
        ]
      })
      .where({
        $or: [
          {
            groupName: db.RegExp({
              regexp: searchKeyword.trim(),
              options: 'i'
            })
          },
          {
            description: db.RegExp({
              regexp: searchKeyword.trim(),
              options: 'i'
            })
          },
          {
            tags: db.RegExp({
              regexp: searchKeyword.trim(),
              options: 'i'
            })
          }
        ]
      })
      .count()
    
    // 处理搜索结果
    const groups = searchResults.data.map(group => ({
      ...group,
      memberCount: group.members ? group.members.length : 0,
      canJoin: true
    }))
    
    return {
      success: true,
      code: 200,
      message: '搜索群聊成功',
      data: {
        groups,
        searchKeyword: searchKeyword.trim(),
        pagination: {
          page,
          pageSize,
          total: totalCount.total,
          totalPages: Math.ceil(totalCount.total / pageSize)
        }
      }
    }
    
  } catch (error) {
    console.error('搜索群聊失败:', error)
    throw error
  }
}

// 加入群聊
async function joinGroup(openid, groupId) {
  if (!groupId) {
    return {
      success: false,
      code: 400,
      message: '缺少群聊ID',
      data: { required: 'groupId' }
    }
  }
  
  const db = cloud.database()
  
  try {
    // 获取群聊信息
    const groupInfo = await db.collection('Groups').doc(groupId).get()
    if (!groupInfo.data) {
      return {
        success: false,
        code: 404,
        message: '群聊不存在',
        data: { groupId }
      }
    }
    
    const group = groupInfo.data
    
    // 检查群聊状态
    if (group.status !== 'active') {
      return {
        success: false,
        code: 400,
        message: '群聊已关闭或不存在',
        data: { groupId, status: group.status }
      }
    }
    
    // 检查是否已是成员
    if (!group.members || !Array.isArray(group.members)) {
      return {
        success: false,
        code: 500,
        message: '群聊成员数据格式错误',
        data: { 
          groupId,
          membersType: typeof group.members,
          membersIsArray: Array.isArray(group.members)
        }
      }
    }
    
    if (group.members.find(m => m.openid === openid)) {
      return {
        success: false,
        code: 400,
        message: '您已是该群聊成员',
        data: { groupId, userOpenid: openid }
      }
    }
    
    // 检查群聊是否已满
    if (group.members.length >= group.maxMembers) {
      return {
        success: false,
        code: 400,
        message: '群聊成员已达上限',
        data: { 
          groupId, 
          currentCount: group.members.length, 
          maxMembers: group.maxMembers 
        }
      }
    }
    
    // 检查群聊是否公开
    if (!group.isPublic && !group.isPreset) {
      return {
        success: false,
        code: 403,
        message: '该群聊不公开，无法加入',
        data: { groupId, isPublic: group.isPublic, isPreset: group.isPreset }
      }
    }
    
    // 添加新成员
    const newMember = {
      openid: openid,
      role: 'member',
      joinedAt: new Date(),
      status: 'active'
    }
    
    await db.collection('Groups').doc(groupId).update({
      data: {
        members: db.command.push(newMember),
        memberCount: db.command.inc(1),
        updatedAt: new Date()
      }
    })
    
    // 发送欢迎消息
    const welcomeMessage = {
      groupId: groupId,
      senderId: 'system',
      senderType: 'system',
      content: `新成员已加入群聊！`,
      type: 'text',
      createdAt: new Date(),
      meta: {
        action: 'joinGroup',
        memberOpenid: openid,
        timestamp: Date.now()
      }
    }
    
    await db.collection('Messages').add({
      data: welcomeMessage
    })
    
    // 更新群聊统计信息
    await db.collection('Groups').doc(groupId).update({
      data: {
        'stats.lastActiveAt': new Date(),
        'stats.messageCount': db.command.inc(1)
      }
    })
    
    return {
      success: true,
      code: 200,
      message: '成功加入群聊',
      data: {
        groupId,
        groupName: group.groupName,
        newMember
      }
    }
    
  } catch (error) {
    console.error('加入群聊失败:', error)
    throw error
  }
}

// 获取公开群聊列表
async function getPublicGroups(page, pageSize) {
  const db = cloud.database()
  const skip = (page - 1) * pageSize
  
  try {
    // 获取公开群聊（包括预设群聊）
    const publicGroups = await db.collection('Groups')
      .where({
        status: 'active',
        $or: [
          { isPublic: true },
          { isPreset: true }
        ]
      })
      .orderBy('stats.lastActiveAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const totalCount = await db.collection('Groups')
      .where({
        status: 'active',
        $or: [
          { isPublic: true },
          { isPreset: true }
        ]
      })
      .count()
    
    // 处理群聊数据
    const groups = publicGroups.data.map(group => ({
      ...group,
      memberCount: group.members ? group.members.length : 0,
      canJoin: true
    }))
    
    return {
      success: true,
      code: 200,
      message: '获取公开群聊列表成功',
      data: {
        groups,
        pagination: {
          page,
          pageSize,
          total: totalCount.total,
          totalPages: Math.ceil(totalCount.total / pageSize)
        }
      }
    }
    
  } catch (error) {
    console.error('获取公开群聊列表失败:', error)
    throw error
  }
}
