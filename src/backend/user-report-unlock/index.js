const cloud = require('tcb-admin-node')
const app = cloud.init()
const db = app.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // unlockType: 'vip', 'message_pack', etc.
  // productId: 具体的商品ID
  const { unlockType, productId } = event

  if (!openid || !unlockType || !productId) {
    return { errCode: 1, errMsg: 'Missing required parameters.' }
  }

  const usersCollection = db.collection('Users')

  try {
    const userQueryResult = await usersCollection.where({ openid }).get()
    if (userQueryResult.data.length === 0) {
      return { errCode: 1001, errMsg: 'User not found.' }
    }
    const user = userQueryResult.data[0]

    // --- 付费逻辑占位符 ---
    // TODO: 在此对接真实的微信支付回调验证，确保支付成功
    console.log(`User ${openid} is reporting unlock for ${unlockType} with product ${productId}`)

    let updateData = {
      unlocks: _.push(productId) // 记录解锁的产品ID
    }

    // 根据解锁类型更新用户信息
    if (unlockType === 'vip') {
      updateData.isVip = true
      // 假设VIP有效期为30天
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)
      updateData.vipExpiresAt = expires
    } else if (unlockType === 'message_pack') {
      // 假设购买的是一个包含20条消息的包
      updateData.remainingMessages = _.inc(20)
    }
    // --- 付费逻辑占位符结束 ---

    await usersCollection.doc(user._id).update(updateData)

    return {
      errCode: 0,
      errMsg: 'Unlock reported successfully.'
    }

  } catch (e) {
    console.error('reportUnlock function error:', e)
    return {
      errCode: -1,
      errMsg: 'Internal server error',
      error: e
    }
  }
}