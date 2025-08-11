// 修复群聊成员数据云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 主函数
exports.main = async (event, context) => {
  console.log('🚀 fix-group-members 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    const db = cloud.database()
    
    // 查找所有没有members字段或members字段为null的群聊
    const groupsWithoutMembers = await db.collection('Groups')
      .where({
        $or: [
          { members: null },
          { members: db.command.exists(false) }
        ]
      })
      .get()
    
    console.log('🔍 发现需要修复的群聊数量:', groupsWithoutMembers.data.length)
    
    if (groupsWithoutMembers.data.length === 0) {
      return {
        success: true,
        code: 200,
        message: '所有群聊数据都已正确',
        data: { 
          fixedCount: 0,
          totalTime: Date.now() - startTime
        }
      }
    }
    
    let fixedCount = 0
    
    // 修复每个群聊
    for (const group of groupsWithoutMembers.data) {
      try {
        // 为每个群聊添加空的members数组
        await db.collection('Groups').doc(group._id).update({
          data: {
            members: [],
            memberCount: 0,
            updatedAt: new Date()
          }
        })
        
        console.log('✅ 修复群聊:', group._id, group.name || '未命名群聊')
        fixedCount++
        
      } catch (error) {
        console.error('❌ 修复群聊失败:', group._id, error.message)
      }
    }
    
    const totalTime = Date.now() - startTime
    
    console.log('📊 修复完成:', { fixedCount, totalTime })
    
    return {
      success: true,
      code: 200,
      message: `成功修复 ${fixedCount} 个群聊的成员数据`,
      data: {
        fixedCount,
        totalTime,
        details: {
          totalFound: groupsWithoutMembers.data.length,
          successCount: fixedCount,
          failedCount: groupsWithoutMembers.data.length - fixedCount
        }
      }
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 修复群聊成员数据云函数执行异常:', error)
    
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
