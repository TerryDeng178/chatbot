// 群聊信息管理云函数
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
  console.log('🚀 group-chat-info 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    // 解析参数
    const { 
      action = 'get', // get, update, updateAI, addMember, removeMember, leaveGroup
      groupId,
      data = {},
      memberOpenid
    } = event
    
    console.log('📝 解析参数:', { action, groupId, data, memberOpenid })
    
    // 基本验证
    if (!groupId) {
      return {
        success: false,
        code: 400,
        message: '缺少群聊ID',
        data: { provided: { groupId } }
      }
    }
    
    const db = cloud.database()
    const now = new Date()
    
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
    
    // 检查用户权限
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
    
    // 预设群聊允许公开访问，不需要成员身份验证
    if (group.isPreset) {
      // 如果是预设群聊，检查用户是否已经是成员
      const userMember = group.members.find(m => m.openid === openid)
      if (!userMember) {
        // 用户不是成员，但预设群聊允许访问，创建一个临时成员对象
        const tempMember = {
          openid: openid,
          role: 'member',
          joinedAt: new Date(),
          status: 'active'
        }
        
        // 根据action执行不同操作
        switch (action) {
          case 'get':
            return await getGroupInfo(group, tempMember)
            
          case 'update':
            return {
              success: false,
              code: 403,
              message: '预设群聊不允许修改',
              data: { groupId }
            }
            
          case 'updateAI':
            return await updateGroupAI(group, data, tempMember, openid)
            
          case 'addMember':
            return await addGroupMember(group, memberOpenid, tempMember, openid)
            
          case 'removeMember':
            return {
              success: false,
              code: 403,
              message: '预设群聊不允许移除成员',
              data: { groupId }
            }
            
          case 'leaveGroup':
            return {
              success: false,
              code: 403,
              message: '预设群聊不允许退出',
              data: { groupId }
            }
            
          default:
            return {
              success: false,
              code: 400,
              message: '不支持的操作类型',
              data: { action, supportedActions: ['get', 'update', 'updateAI', 'addMember', 'removeMember', 'leaveGroup'] }
            }
        }
      }
    }
    
    // 非预设群聊或预设群聊的现有成员，需要验证成员身份
    const userMember = group.members.find(m => m.openid === openid)
    if (!userMember) {
      return {
        success: false,
        code: 403,
        message: '您不是该群聊成员',
        data: { groupId, userOpenid: openid }
      }
    }
    
    // 根据action执行不同操作
    switch (action) {
      case 'get':
        return await getGroupInfo(group, userMember)
        
      case 'update':
        return await updateGroupInfo(group, data, userMember, openid)
        
      case 'updateAI':
        return await updateGroupAI(group, data, userMember, openid)
        
      case 'addMember':
        return await addGroupMember(group, memberOpenid, userMember, openid)
        
      case 'removeMember':
        return await removeGroupMember(group, memberOpenid, userMember, openid)
        
      case 'leaveGroup':
        return await leaveGroup(group, userMember, openid)
        
      default:
        return {
          success: false,
          code: 400,
          message: '不支持的操作类型',
          data: { action, supportedActions: ['get', 'update', 'updateAI', 'addMember', 'removeMember', 'leaveGroup'] }
        }
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 群聊信息管理云函数执行异常:', error)
    
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

// 获取群聊信息
async function getGroupInfo(group, userMember) {
  // 获取群聊统计信息
  const messageCount = await cloud.database().collection('Messages')
    .where({ groupId: group._id })
    .count()
  
  // 获取在线成员数量
  const onlineMembers = group.members.filter(m => m.status === 'active')
  
  // 构建返回的群聊信息
  const groupInfo = {
    ...group,
    stats: {
      ...group.stats,
      messageCount: messageCount.total,
      onlineMemberCount: onlineMembers.length
    },
    userRole: userMember.role,
    userJoinedAt: userMember.joinedAt
  }
  
  return {
    success: true,
    code: 200,
    message: '获取群聊信息成功',
    data: { groupInfo }
  }
}

// 更新群聊信息
async function updateGroupInfo(group, data, userMember, openid) {
  // 检查权限
  if (userMember.role !== 'owner' && userMember.role !== 'admin') {
    return {
      success: false,
      code: 403,
      message: '您没有权限修改群聊信息',
      data: { requiredRole: 'owner或admin', userRole: userMember.role }
    }
  }
  
  const db = cloud.database()
  const updateData = {}
  
  // 允许更新的字段
  const allowedFields = ['groupName', 'description', 'avatar', 'isPublic', 'maxMembers', 'tags', 'settings']
  
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateData[field] = data[field]
    }
  })
  
  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      code: 400,
      message: '没有可更新的数据',
      data: { provided: data }
    }
  }
  
  updateData.updatedAt = new Date()
  
  // 更新群聊信息
  await db.collection('Groups').doc(group._id).update({
    data: updateData
  })
  
  // 发送系统消息
  const systemMessage = {
    groupId: group._id,
    senderId: 'system',
    senderType: 'system',
    content: `群聊信息已更新`,
    type: 'text',
    createdAt: new Date(),
    meta: {
      action: 'updateGroupInfo',
      updatedBy: openid,
      updatedFields: Object.keys(updateData),
      timestamp: Date.now()
    }
  }
  
  await db.collection('Messages').add({
    data: systemMessage
  })
  
  return {
    success: true,
    code: 200,
    message: '群聊信息更新成功',
    data: { updatedFields: Object.keys(updateData) }
  }
}

// 更新群聊AI配置
async function updateGroupAI(group, data, userMember, openid) {
  // 检查权限 - 预设群聊允许临时成员管理AI
  if (group.isPreset) {
    // 预设群聊允许所有用户管理AI配置
  } else if (userMember.role !== 'owner' && userMember.role !== 'admin') {
    return {
      success: false,
      code: 403,
      message: '您没有权限管理群聊AI',
      data: { requiredRole: 'owner或admin', userRole: userMember.role }
    }
  }
  
  const db = cloud.database()
  const { action, aiId } = data
  
  if (!action || !aiId) {
    return {
      success: false,
      code: 400,
      message: '缺少必要参数',
      data: { required: ['action', 'aiId'], provided: data }
    }
  }
  
  let currentAIs = [...(group.activeAIs || [])]
  let updated = false
  
  if (action === 'add') {
    if (!currentAIs.includes(aiId)) {
      if (currentAIs.length >= 5) {
        return {
          success: false,
          code: 400,
          message: '群聊最多只能有5个AI',
          data: { currentCount: currentAIs.length, limit: 5 }
        }
      }
      currentAIs.push(aiId)
      updated = true
    }
  } else if (action === 'remove') {
    const index = currentAIs.indexOf(aiId)
    if (index > -1) {
      currentAIs.splice(index, 1)
      updated = true
    }
  } else {
    return {
      success: false,
      code: 400,
      message: '不支持的操作类型',
      data: { action, supportedActions: ['add', 'remove'] }
    }
  }
  
  if (updated) {
    // 更新群聊的AI配置
    await db.collection('Groups').doc(group._id).update({
      data: {
        activeAIs: currentAIs,
        'aiConfig.currentAIs': currentAIs,
        updatedAt: new Date()
      }
    })
    
    // 发送系统消息
    const aiInfo = getAIInfo(aiId)
    const systemMessage = {
      groupId: group._id,
      senderId: 'system',
      senderType: 'system',
      content: action === 'add' ? 
        `${aiInfo.nickname} 已加入群聊！` : 
        `${aiInfo.nickname} 已离开群聊。`,
      type: 'text',
      createdAt: new Date(),
      meta: {
        action: action,
        aiId: aiId,
        aiName: aiInfo.nickname,
        timestamp: Date.now()
      }
    }
    
    await db.collection('Messages').add({
      data: systemMessage
    })
    
    return {
      success: true,
      code: 200,
      message: '群聊AI配置更新成功',
      data: { 
        action, 
        aiId, 
        aiName: aiInfo.nickname,
        activeAIs: currentAIs 
      }
    }
  }
  
  return {
    success: true,
    code: 200,
    message: '无需更新',
    data: { activeAIs: currentAIs }
  }
}

// 添加群聊成员
async function addGroupMember(group, memberOpenid, userMember, openid) {
  // 检查权限 - 预设群聊允许临时成员添加自己
  if (group.isPreset && memberOpenid === openid) {
    // 预设群聊允许用户自己加入
  } else if (userMember.role !== 'owner' && userMember.role !== 'admin') {
    return {
      success: false,
      code: 403,
      message: '您没有权限添加成员',
      data: { requiredRole: 'owner或admin', userRole: userMember.role }
    }
  }
  
  if (!memberOpenid) {
    return {
      success: false,
      code: 400,
      message: '缺少成员openid',
      data: { required: 'memberOpenid' }
    }
  }
  
  // 检查成员是否已存在
  if (!group.members || !Array.isArray(group.members)) {
    return {
      success: false,
      code: 500,
      message: '群聊成员数据格式错误',
      data: { 
        groupId: group._id,
        membersType: typeof group.members,
        membersIsArray: Array.isArray(group.members)
      }
    }
  }
  
  if (group.members.find(m => m.openid === memberOpenid)) {
    return {
      success: false,
      code: 400,
      message: '该用户已是群聊成员',
      data: { memberOpenid }
    }
  }
  
  // 检查群聊是否已满
  if (group.members.length >= group.maxMembers) {
    return {
      success: false,
      code: 400,
      message: '群聊成员已达上限',
      data: { currentCount: group.members.length, maxMembers: group.maxMembers }
    }
  }
  
  const db = cloud.database()
  
  // 添加新成员
  const newMember = {
    openid: memberOpenid,
    role: 'member',
    joinedAt: new Date(),
    status: 'active'
  }
  
  await db.collection('Groups').doc(group._id).update({
    data: {
      members: db.command.push(newMember),
      memberCount: db.command.inc(1),
      updatedAt: new Date()
    }
  })
  
  // 发送系统消息
  const systemMessage = {
    groupId: group._id,
    senderId: 'system',
    senderType: 'system',
    content: `新成员已加入群聊`,
    type: 'text',
    createdAt: new Date(),
    meta: {
      action: 'addMember',
      memberOpenid: memberOpenid,
      addedBy: openid,
      timestamp: Date.now()
    }
  }
  
  await db.collection('Messages').add({
    data: systemMessage
  })
  
  return {
    success: true,
    code: 200,
    message: '成员添加成功',
    data: { newMember }
  }
}

// 移除群聊成员
async function removeGroupMember(group, memberOpenid, userMember, openid) {
  // 检查权限
  if (userMember.role !== 'owner' && userMember.role !== 'admin') {
    return {
      success: false,
      code: 403,
      message: '您没有权限移除成员',
      data: { requiredRole: 'owner或admin', userRole: userMember.role }
    }
  }
  
  if (!memberOpenid) {
    return {
      success: false,
      code: 400,
      message: '缺少成员openid',
      data: { required: 'memberOpenid' }
    }
  }
  
  // 检查要移除的成员
  if (!group.members || !Array.isArray(group.members)) {
    return {
      success: false,
      code: 500,
      message: '群聊成员数据格式错误',
      data: { 
        groupId: group._id,
        membersType: typeof group.members,
        membersIsArray: Array.isArray(group.members)
      }
    }
  }
  
  const targetMember = group.members.find(m => m.openid === memberOpenid)
  if (!targetMember) {
    return {
      success: false,
      code: 400,
      message: '该用户不是群聊成员',
      data: { memberOpenid }
    }
  }
  
  // 不能移除群主
  if (targetMember.role === 'owner') {
    return {
      success: false,
      code: 400,
      message: '不能移除群主',
      data: { memberRole: targetMember.role }
    }
  }
  
  // 不能移除管理员（除非是群主）
  if (targetMember.role === 'admin' && userMember.role !== 'owner') {
    return {
      success: false,
      code: 403,
      message: '只有群主可以移除管理员',
      data: { userRole: userMember.role, targetRole: targetMember.role }
    }
  }
  
  const db = cloud.database()
  
  // 移除成员
  const updatedMembers = group.members.filter(m => m.openid !== memberOpenid)
  
  await db.collection('Groups').doc(group._id).update({
    data: {
      members: updatedMembers,
      memberCount: db.command.inc(-1),
      updatedAt: new Date()
    }
  })
  
  // 发送系统消息
  const systemMessage = {
    groupId: group._id,
    senderId: 'system',
    senderType: 'system',
    content: `成员已离开群聊`,
    type: 'text',
    createdAt: new Date(),
    meta: {
      action: 'removeMember',
      memberOpenid: memberOpenid,
      removedBy: openid,
      timestamp: Date.now()
    }
  }
  
  await db.collection('Messages').add({
    data: systemMessage
  })
  
  return {
    success: true,
    code: 200,
    message: '成员移除成功',
    data: { removedMember: targetMember }
  }
}

// 离开群聊
async function leaveGroup(group, userMember, openid) {
  const db = cloud.database()
  
  // 群主不能离开群聊，需要先转让群主
  if (userMember.role === 'owner') {
    return {
      success: false,
      code: 400,
      message: '群主不能离开群聊，请先转让群主权限',
      data: { userRole: userMember.role }
    }
  }
  
  // 移除成员
  const updatedMembers = group.members.filter(m => m.openid !== openid)
  
  await db.collection('Groups').doc(group._id).update({
    data: {
      members: updatedMembers,
      memberCount: db.command.inc(-1),
      updatedAt: new Date()
    }
  })
  
  // 发送系统消息
  const systemMessage = {
    groupId: group._id,
    senderId: 'system',
    senderType: 'system',
    content: `成员已主动离开群聊`,
    type: 'text',
    createdAt: new Date(),
    meta: {
      action: 'leaveGroup',
      memberOpenid: openid,
      timestamp: Date.now()
    }
  }
  
  await db.collection('Messages').add({
    data: systemMessage
  })
  
  return {
    success: true,
    code: 200,
    message: '已成功离开群聊',
    data: { leftGroup: true }
  }
}
