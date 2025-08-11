// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    console.error('Login failed: openid is missing.')
    return {
      success: false,
      code: 400,
      message: '登录失败：无法获取用户 OpenID',
      data: null
    }
  }

  const usersCollection = db.collection('Users')

  try {
    // 尝试根据 openid 查找用户
    const userQueryResult = await usersCollection.where({
      _id: openid
    }).get()

    let userRecord

    if (userQueryResult.data.length > 0) {
      // 用户已存在，直接返回用户信息
      userRecord = userQueryResult.data[0]
      console.log(`用户 ${openid} 已存在，直接返回用户信息。`)
    } else {
      // 用户不存在，创建新用户
      console.log(`用户 ${openid} 不存在，开始创建新用户。`)
      const newUser = {
        _id: openid,
        openid: openid,
        nickName: '新用户',
        avatarUrl: '', // 可在后续流程中引导用户授权获取
        gender: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isVip: false,
        vipExpiresAt: null,
        remainingMessages: 20, // 新用户赠送20条免费消息
        totalMessages: 20,     // 总共获得的消息数
        usedMessages: 0,       // 已使用的消息数
        lastLoginAt: new Date(),
        characterUnlocked: [1], // 默认解锁第一个角色
        favoriteCharacters: [] // 收藏的角色
      }
      await usersCollection.add({
        data: newUser
      })
      userRecord = newUser
      console.log(`新用户 ${openid} 创建成功。`)
    }

    // 更新最后登录时间（如果是老用户）
    if (userQueryResult.data.length > 0) {
      await usersCollection.doc(openid).update({
        data: {
          lastLoginAt: new Date()
        }
      })
    }

    return {
      success: true,
      code: 200,
      message: '登录成功',
      data: {
        openid: openid,
        user: userRecord,
        isNewUser: userQueryResult.data.length === 0
      }
    }

  } catch (e) {
    console.error(`[${openid}] 登录或注册过程中发生数据库错误`, e)
    return {
      success: false,
      code: 500,
      message: '服务器内部错误，请稍后重试。',
      data: {
        error: e.message
      }
    }
  }
}