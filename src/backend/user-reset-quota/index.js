// 重置用户消息额度的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { openid } = cloud.getWXContext()
  
  console.log(`🔄 重置用户消息额度请求，用户: ${openid}`)
  
  try {
    const usersCollection = db.collection('Users')
    
    // 获取用户信息
    const userQueryResult = await usersCollection.where({ openid }).get()
    
    if (userQueryResult.data.length === 0) {
      return {
        success: false,
        code: 404,
        message: '用户不存在',
        data: null
      }
    }
    
    const user = userQueryResult.data[0]
    
    // 重置消息额度
    const newQuota = event.quota || 100 // 默认给100条消息
    
    await usersCollection.doc(user._id).update({
      data: {
        remainingMessages: newQuota,
        totalMessages: _.inc(newQuota),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ 用户 ${openid} 消息额度重置成功，新额度: ${newQuota}`)
    
    return {
      success: true,
      code: 200,
      message: '消息额度重置成功',
      data: {
        openid: openid,
        newQuota: newQuota,
        previousQuota: user.remainingMessages
      }
    }
    
  } catch (error) {
    console.error('❌ 重置消息额度失败:', error)
    
    return {
      success: false,
      code: 500,
      message: '服务器错误',
      data: {
        error: error.message
      }
    }
  }
}
