// 用户在线状态上报云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 用户在线状态上报
 * 用于实现心跳机制和在线状态管理
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { page = 'home' } = event
    const userId = wxContext.OPENID
    
    if (!userId) {
      return {
        success: false,
        code: 400,
        message: '用户身份验证失败'
      }
    }
    
    console.log(`用户 ${userId} 在 ${page} 页面上报在线状态`)
    
    // 更新或创建在线状态记录
    const presenceCollection = db.collection('Presence')
    
    try {
      // 尝试更新现有记录
      await presenceCollection.where({
        userId: userId
      }).update({
        data: {
          lastPingAt: new Date(),
          currentPage: page,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      // 如果更新失败，创建新记录
      await presenceCollection.add({
        data: {
          userId: userId,
          lastPingAt: new Date(),
          currentPage: page,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }
    
    return {
      success: true,
      code: 200,
      message: '在线状态上报成功',
      data: {
        userId: userId,
        page: page,
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error) {
    console.error('在线状态上报失败:', error)
    return {
      success: false,
      code: 500,
      message: '在线状态上报失败',
      data: {
        error: error.message
      }
    }
  }
}
