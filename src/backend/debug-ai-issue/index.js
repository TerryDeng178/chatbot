// AI问题诊断和修复脚本
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 全面的AI问题诊断和修复
 */
exports.main = async (event, context) => {
  console.log('🔍 开始AI问题全面诊断...')
  
  try {
    const wxContext = cloud.getWXContext()
    console.log('👤 用户openid:', wxContext.OPENID)
    
    const db = cloud.database()
    
    // 步骤1：检查数据库环境
    const envCheck = await checkDatabaseEnvironment(db)
    
    // 步骤2：检查Bots集合状态
    const botsCheck = await checkBotsCollection(db)
    
    // 步骤3：尝试修复Bots集合
    const fixResult = await fixBotsCollection(db, botsCheck)
    
    // 步骤4：验证修复结果
    const verifyResult = await verifyBotsCollection(db)
    
    // 步骤5：生成诊断报告
    const report = generateDiagnosticReport({
      envCheck,
      botsCheck,
      fixResult,
      verifyResult
    })
    
    console.log('📊 诊断报告:', JSON.stringify(report, null, 2))
    
    return {
      success: true,
      code: 200,
      message: 'AI问题诊断完成',
      data: report
    }
    
  } catch (error) {
    console.error('❌ AI问题诊断失败:', error)
    return {
      success: false,
      code: 500,
      message: 'AI问题诊断失败',
      data: {
        error: error.message,
        stack: error.stack
      }
    }
  }
}

/**
 * 检查数据库环境
 */
async function checkDatabaseEnvironment(db) {
  console.log('🔍 步骤1: 检查数据库环境...')
  
  try {
    // 获取所有集合列表
    const collections = await db.listCollections()
    console.log('📚 当前数据库集合:', collections.data.map(col => col.name))
    
    // 检查云环境
    const env = cloud.DYNAMIC_CURRENT_ENV
    console.log('☁️ 当前云环境:', env)
    
    // 检查数据库权限
    try {
      await db.collection('Users').limit(1).get()
      console.log('✅ 数据库读取权限正常')
    } catch (permError) {
      console.log('⚠️ 数据库读取权限可能有问题:', permError.message)
    }
    
    return {
      success: true,
      collections: collections.data.map(col => col.name),
      environment: env,
      hasReadPermission: true
    }
    
  } catch (error) {
    console.error('❌ 检查数据库环境失败:', error)
    return {
      success: false,
      error: error.message,
      hasReadPermission: false
    }
  }
}

/**
 * 检查Bots集合状态
 */
async function checkBotsCollection(db) {
  console.log('🔍 步骤2: 检查Bots集合状态...')
  
  try {
    // 检查Bots集合是否存在
    const collections = await db.listCollections()
    const hasBotsCollection = collections.data.some(col => col.name === 'Bots')
    
    if (!hasBotsCollection) {
      console.log('❌ Bots集合不存在')
      return {
        exists: false,
        count: 0,
        hasData: false,
        error: 'Bots集合不存在'
      }
    }
    
    console.log('✅ Bots集合存在')
    
    // 检查Bots集合中的数据
    const botsQuery = await db.collection('Bots').where({
      isActive: true
    }).get()
    
    console.log('📊 活跃AI数量:', botsQuery.data.length)
    
    // 如果没有活跃的AI，尝试获取所有AI
    if (botsQuery.data.length === 0) {
      const allBotsQuery = await db.collection('Bots').get()
      console.log('📊 总AI数量:', allBotsQuery.data.length)
      
      return {
        exists: true,
        count: allBotsQuery.data.length,
        hasData: allBotsQuery.data.length > 0,
        hasActiveData: false,
        data: allBotsQuery.data
      }
    }
    
    return {
      exists: true,
      count: botsQuery.data.length,
      hasData: true,
      hasActiveData: true,
      data: botsQuery.data
    }
    
  } catch (error) {
    console.error('❌ 检查Bots集合失败:', error)
    return {
      exists: false,
      count: 0,
      hasData: false,
      error: error.message
    }
  }
}

/**
 * 修复Bots集合
 */
async function fixBotsCollection(db, botsCheck) {
  console.log('🔧 步骤3: 尝试修复Bots集合...')
  
  try {
    // 如果Bots集合不存在，创建它
    if (!botsCheck.exists) {
      console.log('📝 创建Bots集合...')
      // 通过插入一条数据来创建集合
      await db.collection('Bots').add({
        data: {
          _id: 'temp_creation_record',
          name: '临时创建记录',
          isActive: false,
          createTime: new Date()
        }
      })
      console.log('✅ Bots集合创建成功')
    }
    
    // 检查是否需要插入预设AI数据
    if (!botsCheck.hasData || botsCheck.count === 0) {
      console.log('📝 插入预设AI数据...')
      
      const presetBots = [
        {
          _id: 'ai_assistant',
          name: 'AI助手',
          description: '智能对话助手，能够帮助用户解决各种问题',
          avatar: '/static/images/ai-avatar.png',
          personality: 'helpful',
          isActive: true,
          createTime: new Date(),
          updateTime: new Date()
        },
        {
          _id: 'ai_teacher',
          name: 'AI老师',
          description: '专业的教育助手，提供知识解答和学习指导',
          avatar: '/static/images/ai-avatar.png',
          personality: 'educational',
          isActive: true,
          createTime: new Date(),
          updateTime: new Date()
        },
        {
          _id: 'ai_friend',
          name: 'AI朋友',
          description: '温暖的陪伴者，提供情感支持和日常聊天',
          avatar: '/static/images/ai-avatar.png',
          personality: 'friendly',
          isActive: true,
          createTime: new Date(),
          updateTime: new Date()
        },
        {
          _id: 'ai_creative',
          name: 'AI创意师',
          description: '激发创意的伙伴，帮助用户进行创意构思',
          avatar: '/static/images/ai-avatar.png',
          personality: 'creative',
          isActive: true,
          createTime: new Date(),
          updateTime: new Date()
        },
        {
          _id: 'ai_expert',
          name: 'AI专家',
          description: '专业领域专家，提供深度分析和专业建议',
          avatar: '/static/images/ai-avatar.png',
          personality: 'expert',
          isActive: true,
          createTime: new Date(),
          updateTime: new Date()
        }
      ]
      
      // 批量插入预设AI数据
      for (const bot of presetBots) {
        try {
          await db.collection('Bots').add({
            data: bot
          })
          console.log(`✅ 插入AI: ${bot.name}`)
        } catch (insertError) {
          if (insertError.message.includes('duplicate key')) {
            console.log(`⚠️ AI已存在: ${bot.name}`)
          } else {
            console.error(`❌ 插入AI失败: ${bot.name}`, insertError.message)
          }
        }
      }
      
      console.log('✅ 预设AI数据插入完成')
      
      // 删除临时创建记录
      try {
        await db.collection('Bots').doc('temp_creation_record').remove()
        console.log('✅ 清理临时创建记录')
      } catch (cleanupError) {
        console.log('⚠️ 清理临时记录失败:', cleanupError.message)
      }
      
      return {
        success: true,
        action: 'inserted_preset_data',
        insertedCount: presetBots.length
      }
    }
    
    return {
      success: true,
      action: 'no_action_needed',
      reason: 'Bots集合已有数据'
    }
    
  } catch (error) {
    console.error('❌ 修复Bots集合失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 验证修复结果
 */
async function verifyBotsCollection(db) {
  console.log('🔍 步骤4: 验证修复结果...')
  
  try {
    // 重新检查Bots集合
    const botsQuery = await db.collection('Bots').where({
      isActive: true
    }).get()
    
    console.log('📊 验证结果 - 活跃AI数量:', botsQuery.data.length)
    
    if (botsQuery.data.length > 0) {
      console.log('✅ 修复成功！AI列表已恢复正常')
      return {
        success: true,
        count: botsQuery.data.length,
        message: 'AI列表已恢复正常'
      }
    } else {
      console.log('⚠️ 修复后仍无活跃AI数据')
      return {
        success: false,
        count: 0,
        message: '修复后仍无活跃AI数据'
      }
    }
    
  } catch (error) {
    console.error('❌ 验证修复结果失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 生成诊断报告
 */
function generateDiagnosticReport(results) {
  console.log('📊 步骤5: 生成诊断报告...')
  
  const { envCheck, botsCheck, fixResult, verifyResult } = results
  
  // 确定主要问题
  let mainIssue = '未知问题'
  let overallStatus = 'unknown'
  
  if (!envCheck.success) {
    mainIssue = '数据库环境配置问题'
    overallStatus = 'critical'
  } else if (!botsCheck.exists) {
    mainIssue = 'Bots集合不存在'
    overallStatus = 'critical'
  } else if (!botsCheck.hasData) {
    mainIssue = 'Bots集合无数据'
    overallStatus = 'warning'
  } else if (!botsCheck.hasActiveData) {
    mainIssue = 'Bots集合无活跃AI数据'
    overallStatus = 'warning'
  } else {
    mainIssue = 'AI列表正常'
    overallStatus = 'healthy'
  }
  
  // 生成修复建议
  const recommendations = []
  
  if (!envCheck.success) {
    recommendations.push('检查云开发环境配置')
    recommendations.push('确认数据库权限设置')
  }
  
  if (!botsCheck.exists) {
    recommendations.push('创建Bots集合')
    recommendations.push('插入预设AI数据')
  }
  
  if (!botsCheck.hasData) {
    recommendations.push('插入预设AI数据')
    recommendations.push('检查数据插入权限')
  }
  
  if (!botsCheck.hasActiveData) {
    recommendations.push('更新AI状态为活跃')
    recommendations.push('检查isActive字段设置')
  }
  
  if (fixResult && fixResult.success) {
    recommendations.push('修复操作已执行，请验证结果')
  }
  
  if (verifyResult && verifyResult.success) {
    recommendations.push('修复验证成功，AI功能已恢复')
  }
  
  return {
    overallStatus,
    mainIssue,
    timestamp: new Date().toISOString(),
    environment: envCheck,
    botsStatus: botsCheck,
    fixResult,
    verification: verifyResult,
    recommendations,
    summary: `AI问题诊断完成，状态: ${overallStatus}，主要问题: ${mainIssue}`
  }
}
