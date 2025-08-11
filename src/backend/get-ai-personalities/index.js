// 获取AI性格列表云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('🚀 get-ai-personalities 云函数开始执行')
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    const db = cloud.database()
    
    // 检查数据库连接
    console.log('🔍 检查数据库连接...')
    
    // 先尝试获取所有集合列表
    try {
      const collections = await db.listCollections()
      console.log('📚 数据库集合列表:', collections.data)
    } catch (colError) {
      console.log('⚠️ 获取集合列表失败:', colError.message)
    }
    
    // 检查Bots集合是否存在
    console.log('🔍 检查Bots集合...')
    let botsResult
    try {
      botsResult = await db.collection('Bots')
        .where({
          isActive: true
        })
        .orderBy('id', 'asc')
        .get()
      
      console.log('✅ 查询Bots集合成功，结果:', botsResult)
      console.log('📊 查询到的数据数量:', botsResult.data.length)
      
      if (botsResult.data.length > 0) {
        console.log('📋 第一条数据示例:', JSON.stringify(botsResult.data[0]))
      }
      
    } catch (queryError) {
      console.error('❌ 查询Bots集合失败:', queryError)
      
      // 尝试不添加where条件查询
      try {
        console.log('🔄 尝试查询所有Bots数据...')
        const allBots = await db.collection('Bots').get()
        console.log('📊 所有Bots数据数量:', allBots.data.length)
        botsResult = allBots
      } catch (fallbackError) {
        console.error('❌ 查询所有Bots数据也失败:', fallbackError)
        throw new Error(`Bots集合查询失败: ${fallbackError.message}`)
      }
    }
    
    // 格式化返回数据
    const personalities = botsResult.data.map(bot => ({
      id: bot.id,
      name: bot.name,
      nickname: bot.nickname,
      avatar: bot.avatar,
      personality: bot.personality,
      description: bot.description,
      characterTraits: bot.characterTraits,
      responseStyle: bot.responseStyle,
      expertise: bot.expertise,
      gender: bot.gender || 'unknown',
      speakingStyle: bot.speakingStyle || 'default',
      identity: bot.identity || 'assistant',
      relationship: bot.relationship || 'assistant'
    }))
    
    console.log('🎯 格式化后的数据:', JSON.stringify(personalities))
    
    const result = {
      success: true,
      code: 200,
      message: '获取AI性格列表成功',
      data: {
        personalities,
        total: personalities.length,
        timestamp: new Date().toISOString()
      }
    }
    
    console.log('✅ 返回结果:', JSON.stringify(result))
    return result
    
  } catch (error) {
    console.error('❌ 获取AI性格列表失败:', error)
    const errorResult = {
      success: false,
      code: 500,
      message: '获取AI性格列表失败',
      data: {
        error: error.message,
        stack: error.stack
      }
    }
    console.log('❌ 返回错误结果:', JSON.stringify(errorResult))
    return errorResult
  }
}
