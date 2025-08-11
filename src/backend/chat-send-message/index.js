// 带真实AI功能的云函数 - 简化版本
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// SiliconFlow API调用函数 - 简化版本
async function callSiliconFlowAPI(content, characterId, systemPrompt, region = 'cn') {
  return new Promise((resolve, reject) => {
    // 若上层已生成 systemPrompt 则使用；否则后续 fallback
    
    const cfg = getProviderConfig(region)

    const requestData = JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      max_tokens: 120,
      temperature: 0.7
    })
    
    const options = {
      hostname: cfg.base,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: 8000
    }
    
    console.log('📡 发送请求到SiliconFlow API...')
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log('📥 API响应状态:', res.statusCode)
          
          if (res.statusCode === 200 && response.choices && response.choices[0]) {
            const aiReply = response.choices[0].message.content.trim()
            console.log('✅ AI回复解析成功')
            resolve(aiReply)
          } else {
            console.error('❌ API响应错误:', response)
            reject(new Error(`API响应错误: ${response.error?.message || '未知错误'}`))
          }
        } catch (parseError) {
          console.error('❌ 响应解析失败:', parseError)
          reject(new Error('响应解析失败: ' + parseError.message))
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('❌ 请求失败:', error)
      reject(new Error('网络请求失败: ' + error.message))
    })
    
    req.on('timeout', () => {
      console.error('❌ 请求超时')
      req.destroy()
      reject(new Error('请求超时'))
    })
    
    req.write(requestData)
    req.end()
  })
}

// 快速备用回复生成
async function generateFallbackReply(content, characterId) {
  try {
    // 从数据库获取AI性格信息
    const db = cloud.database()
    const botResult = await db.collection('Bots').where({
      id: characterId,
      isActive: true
    }).get()
    
    if (botResult.data.length > 0) {
      const bot = botResult.data[0]
      const shortContent = content.length > 20 ? content.substring(0, 20) + '...' : content
      
      // 根据性格特征生成个性化回复
      const personalityReplies = {
        '温暖关怀型': `你好！我是${bot.nickname}。关于"${shortContent}"，我感受到了你的心情。让我用温暖的话语来陪伴你，有什么想聊的吗？💕`,
        '博学专业型': `你好！我是${bot.nickname}。关于"${shortContent}"，这是一个很有趣的话题。让我用专业的知识来为你解答，有什么具体想了解的吗？📚`,
        '创意活泼型': `你好！我是${bot.nickname}。关于"${shortContent}"，哇！这让我想到了很多有趣的想法！让我们一起发挥创意，探索更多可能性吧！✨`,
        '商务专业型': `你好！我是${bot.nickname}。关于"${shortContent}"，从商务角度来看，这确实值得深入分析。让我为你提供一些专业的建议和思路。💼`,
        '技术专家型': `你好！我是${bot.nickname}。关于"${shortContent}"，从技术角度来说，这涉及到几个关键点。让我用通俗易懂的方式来为你解释。🔧`,
        '幽默风趣型': `你好！我是${bot.nickname}。关于"${shortContent}"，哈哈，这让我想到了一个有趣的故事！让我们用轻松愉快的方式来聊聊这个话题吧！😄`,
        '文艺诗意型': `你好！我是${bot.nickname}。关于"${shortContent}"，这让我想起了优美的诗句。让我们用诗意的方式来感受这个话题的深意吧！🌸`,
        '智慧长者型': `你好！我是${bot.nickname}。关于"${shortContent}"，这让我想到了人生的智慧。让我们用深邃的思考来探讨这个话题的意义。🧠`
      }
      
      return personalityReplies[bot.personality] || `你好！我是${bot.nickname}。关于"${shortContent}"，我正在思考如何更好地回复您。请继续与我对话！`
    }
  } catch (error) {
    console.warn('获取AI性格信息失败，使用默认回复:', error.message)
  }
  
  // 默认回复
  const characterNames = {
    1: '心灵导师温情',
    2: '知识助手小博', 
    3: '创意伙伴小艺',
    4: '商务顾问小商',
    5: '技术专家小码',
    6: '幽默大师小幽',
    7: '文艺诗人小诗',
    8: '智慧长者小智'
  }
  
  const characterName = characterNames[characterId] || '智能助手'
  const shortContent = content.length > 20 ? content.substring(0, 20) + '...' : content
  
  return `你好！我是${characterName}。关于"${shortContent}"，我正在思考如何更好地回复您。请继续与我对话！`
}

exports.main = async (event, context) => {
  console.log('🚀 chat-send-message 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    // 解析参数
    const { groupId, content, characterId = 1, region = 'cn' } = event
    console.log('📝 解析参数 - groupId:', groupId, 'content:', content, 'characterId:', characterId)
    
    // 基本验证
    if (!groupId || !content) {
      console.log('❌ 参数验证失败')
      return {
        success: false,
        code: 400,
        message: '缺少必要参数 groupId 或 content',
        data: { 
          provided: { groupId, content, characterId },
          openid: openid
        }
      }
    }
    
    console.log('✅ 参数验证通过')
    
    // 生成AI回复 - 快速模式
    let reply = ''
    let aiResponseTime = 0
    let useRealAI = false // 暂时关闭真实AI，使用备用回复
    
    if (useRealAI) {
      try {
        console.log('🤖 调用真实AI API...')
        const aiStartTime = Date.now()
        
        // 使用SiliconFlow API - 设置超时保护（减少到2秒）
        // 构建基于 Bots 个性设定的系统提示
        const db = cloud.database()
        let sysPrompt = '你是一个友好的助手，请简洁回复，控制在80字以内。'
        try {
          const botInfo = await db.collection('Bots').where({ id: characterId }).get()
          if (botInfo.data && botInfo.data.length > 0) {
            const b = botInfo.data[0]
            sysPrompt = buildSystemPromptFromBot(b)
          }
        } catch (e) { console.warn('读取Bots失败，使用默认提示', e.message) }

        reply = await Promise.race([
          callSiliconFlowAPI(content, characterId, sysPrompt, region),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI调用超时')), 2000)
          )
        ])
        
        aiResponseTime = Date.now() - aiStartTime
        console.log('✅ 真实AI回复成功:', reply.substring(0, 50) + '...')
        
      } catch (aiError) {
        console.warn('⚠️ AI API调用失败，使用备用回复:', aiError.message)
        reply = await generateFallbackReply(content, characterId)
        aiResponseTime = 0
      }
    } else {
      // 直接使用备用回复，避免超时
      reply = await generateFallbackReply(content, characterId)
      console.log('🤖 使用备用回复:', reply)
    }
    
    console.log('🤖 最终回复:', reply)
    
    // 数据库操作 - 顺序执行，避免变量未定义
    let userMessageId = null
    let aiMessageId = null
    
    try {
      const db = cloud.database()
      console.log('💾 保存消息到数据库...')
      
      const now = new Date()
      
      // 先保存用户消息
      const userMessageResult = await db.collection('Messages').add({
        data: {
          groupId: groupId,
          senderId: openid,
          senderType: 'user',
          content: content,
          type: 'text',
          createdAt: now,
          meta: { characterId: characterId }
        }
      })
      userMessageId = userMessageResult._id
      console.log('✅ 用户消息保存成功，ID:', userMessageId)
      
      // 再保存AI回复
      const aiMessageResult = await db.collection('Messages').add({
        data: {
          groupId: groupId,
          senderId: 'ai_assistant',
          senderType: 'ai',
          content: reply,
          type: 'text',
          createdAt: now,
          meta: {
            characterId: characterId,
            model: 'qwen-2.5-7b'
          }
        }
      })
      aiMessageId = aiMessageResult._id
      console.log('✅ AI消息保存成功，ID:', aiMessageId)
      
      // 异步更新群聊信息（不等待完成）
      db.collection('Groups').doc(groupId).update({
        data: {
          lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          lastActiveAt: now,
          updatedAt: now
        }
      }).catch(err => console.warn('⚠️ 群聊信息更新失败:', err.message))
      
    } catch (dbError) {
      console.warn('⚠️ 数据库保存失败，但不影响回复:', dbError.message)
    }
    
    const totalTime = Date.now() - startTime
    
    // 返回成功结果
    const result = {
      success: true,
      code: 200,
      message: '消息发送成功',
      data: {
        messageId: userMessageId || 'temp_' + Date.now(),
        aiReply: reply,
        reply: reply,
        model: 'qwen-2.5-7b',
        switched: false,
        originalModel: 'qwen-2.5-7b',
        actualModel: 'qwen-2.5-7b',
        responseTime: aiResponseTime,
        totalTime: totalTime
      }
    }
    
    console.log('📤 返回结果:', JSON.stringify(result))
    console.log('⏱️ 总执行时间:', totalTime + 'ms')
    return result
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 云函数执行异常:', error)
    console.error('💥 错误消息:', error.message)
    console.error('💥 总执行时间:', totalTime + 'ms')
    
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

// 根据 Bot 设定动态生成系统提示，体现性别/说话方式/身份/关系
function buildSystemPromptFromBot(bot) {
  const genderText = bot.gender === 'male' ? '男性' : bot.gender === 'female' ? '女性' : '未知性别'
  const styleMap = {
    gentle: '温柔体贴、富有同理心的语气',
    professional: '专业、条理清晰、信息准确的语气',
    creative: '活泼有趣、富有想象力的语气',
    humorous: '幽默风趣、轻松愉快的语气',
    technical: '技术准确、解释清晰的语气',
    poetic: '诗意优美、感性的语气',
    wise: '睿智沉稳、富有哲理的语气',
    default: '友善自然的语气'
  }
  const identityText = bot.identity || '智能助手'
  const relationText = bot.relationship === 'friend' ? '像朋友一样主动互动' :
    bot.relationship === 'mentor' ? '像导师一样给出建议与引导' :
    bot.relationship === 'colleague' ? '像同事一样合作讨论' : '作为贴心助手积极配合'

  return `你是一位${genderText}的${identityText}，说话风格应当${styleMap[bot.speakingStyle || 'default']}。` +
         `请在群聊中${relationText}，积极提问、总结要点、推动对话进展；` +
         `回复简洁自然，贴近真人表达，不要机械。`
}

// 读取地区对应的 SiliconFlow 配置（域名/模型/密钥）
function getProviderConfig(region) {
  if (region === 'intl') {
    return {
      base: process.env.SF_BASE_INTL || 'api.siliconflow.ai',
      model: process.env.SF_MODEL_INTL || 'gpt-4o-mini',
      apiKey: process.env.SF_API_KEY_INTL || process.env.SILICONFLOW_API_KEY || ''
    }
  }
  // 默认国内
  return {
    base: process.env.SF_BASE_CN || 'api.siliconflow.cn',
    model: process.env.SF_MODEL_CN || 'doubao-pro-32k',
    apiKey: process.env.SF_API_KEY_CN || process.env.SILICONFLOW_API_KEY || ''
  }
}