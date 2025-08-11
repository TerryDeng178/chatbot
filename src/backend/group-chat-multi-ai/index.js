
// 多AI群聊管理云函数
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// SiliconFlow API调用函数
async function callSiliconFlowAPI(content, characterId, context = '') {
  return new Promise((resolve, reject) => {
    // 角色系统提示 - 多AI版本
    const characterPrompts = {
      1: '你是温暖的心理咨询师温情，请用温柔关怀的语调回复，控制在80字以内。在群聊中要与其他AI友好互动。',
      2: '你是博学的知识助手小博，请用专业友好的语调回复，控制在100字以内。在群聊中要与其他AI友好互动。',
      3: '你是富有创意的伙伴小艺，请用活泼有趣的语调回复，控制在80字以内。在群聊中要与其他AI友好互动。',
      4: '你是专业的商务顾问小商，请用严谨专业的语调回复，控制在100字以内。在群聊中要与其他AI友好互动。',
      5: '你是技术专家小码，请用专业易懂的语调回复，控制在100字以内。在群聊中要与其他AI友好互动。'
    }
    
    const systemPrompt = characterPrompts[characterId] || '你是一个友好的助手，请简洁回复，控制在80字以内。在群聊中要与其他AI友好互动。'
    
    // 添加上下文信息
    const fullPrompt = context ? `${systemPrompt}\n\n当前群聊上下文：${context}` : systemPrompt
    
    const requestData = JSON.stringify({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [
        { role: 'system', content: fullPrompt },
        { role: 'user', content: content }
      ],
      max_tokens: 120,
      temperature: 0.7
    })
    
    const apiKey = process.env.SF_API_KEY_CN || process.env.SILICONFLOW_API_KEY || ''
    const options = {
      hostname: 'api.siliconflow.cn',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: 8000
    }
    
    console.log(`📡 AI ${characterId} 发送请求到SiliconFlow API...`)
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log(`📥 AI ${characterId} API响应状态:`, res.statusCode)
          
          if (res.statusCode === 200 && response.choices && response.choices[0]) {
            const aiReply = response.choices[0].message.content.trim()
            console.log(`✅ AI ${characterId} 回复解析成功`)
            resolve(aiReply)
          } else {
            console.error(`❌ AI ${characterId} API响应错误:`, response)
            reject(new Error(`API响应错误: ${response.error?.message || '未知错误'}`))
          }
        } catch (parseError) {
          console.error(`❌ AI ${characterId} 响应解析失败:`, parseError)
          reject(new Error('响应解析失败: ' + parseError.message))
        }
      })
    })
    
    req.on('error', (error) => {
      console.error(`❌ AI ${characterId} 请求失败:`, error)
      reject(new Error('网络请求失败: ' + error.message))
    })
    
    req.on('timeout', () => {
      console.error(`❌ AI ${characterId} 请求超时`)
      req.destroy()
      reject(new Error('请求超时'))
    })
    
    req.write(requestData)
    req.end()
  })
}

// 快速备用回复生成
async function generateFallbackReply(content, characterId, context = '') {
  const fallbackReplies = {
    1: ['我理解你的感受，让我们一起面对这个问题吧。', '你的想法很有价值，我完全支持你。', '记住，你并不孤单，我们都在这里。'],
    2: ['这是一个很有趣的问题，让我来为你解答。', '根据我的了解，这个问题的答案是...', '让我用专业知识来帮助你。'],
    3: ['哇！这个想法太有创意了！', '让我们一起来探索这个有趣的话题吧！', '你的想象力真的很丰富呢！'],
    4: ['从商业角度来看，这个问题需要...', '让我为你分析一下这个情况。', '这是一个很好的商业思考点。'],
    5: ['从技术角度来说，这个问题的解决方案是...', '让我用技术知识来帮你分析。', '这是一个很有趣的技术问题。']
  }
  
  const replies = fallbackReplies[characterId] || ['我理解你的想法，让我们一起讨论吧。']
  return replies[Math.floor(Math.random() * replies.length)]
}

// AI调度器 - 决定哪个AI应该回复
function selectAIReply(userMessage, activeAIs, lastAIReplyTime) {
  const now = Date.now()
  
  console.log('AI调度器开始选择AI回复')
  console.log('用户消息:', userMessage)
  console.log('激活的AI:', activeAIs)
  console.log('上次AI回复时间:', lastAIReplyTime)
  
  // 放宽时间限制：从5秒改为3秒
  if (lastAIReplyTime && (now - lastAIReplyTime) < 3000) {
    console.log('距离上次AI回复时间太短，跳过')
    return null
  }
  
  // 根据消息内容选择最合适的AI
  const messageLower = userMessage.toLowerCase()
  
  // 关键词匹配规则 - 扩展关键词
  const keywordRules = {
    1: ['心情', '情绪', '压力', '焦虑', '抑郁', '开心', '难过', '安慰', '支持', '感觉', '心里', '心理'],
    2: ['知识', '学习', '教育', '历史', '科学', '文化', '解释', '说明', '概念', '问题', '答案', '知道'],
    3: ['创意', '想象', '艺术', '设计', '灵感', '有趣', '好玩', '新奇', '想法', '创意', '有趣', '好玩'],
    4: ['商业', '工作', '职场', '投资', '市场', '策略', '分析', '建议', '规划', '生意', '赚钱', '职业'],
    5: ['技术', '编程', '代码', '软件', '硬件', '系统', '问题', '解决', '开发', '电脑', '手机', '网络']
  }
  
  // 计算每个AI的匹配分数
  const aiScores = activeAIs.map(ai => {
    let score = 0
    const keywords = keywordRules[ai.id] || []
    
    keywords.forEach(keyword => {
      if (messageLower.includes(keyword)) {
        score += 3 // 增加关键词匹配分数
      }
    })
    
    // 随机因子，避免总是选择同一个AI
    score += Math.random() * 1.0 // 增加随机因子
    
    // 基础分数，确保每个AI都有机会
    score += 1
    
    return { ai, score }
  })
  
  console.log('AI评分结果:', aiScores)
  
  // 选择分数最高的AI
  aiScores.sort((a, b) => b.score - a.score)
  
  // 降低分数门槛，让AI更容易被选中
  if (aiScores[0].score < 0.5) {
    console.log('所有AI分数都太低，随机选择一个')
    const randomAI = activeAIs[Math.floor(Math.random() * activeAIs.length)]
    return { id: randomAI }
  }
  
  const selectedAI = aiScores[0].ai
  console.log('选择的AI:', selectedAI)
  return selectedAI
}

// 新增：管理群聊AI配置的函数
async function manageGroupAIs(groupId, action, aiId, openid) {
  const db = cloud.database()
  
  try {
    // 获取当前群聊信息
    const groupInfo = await db.collection('Groups').doc(groupId).get()
    if (!groupInfo.data) {
      throw new Error('群聊不存在')
    }
    
    let currentActiveAIs = groupInfo.data.activeAIs || [1, 2, 3]
    let updated = false
    
    if (action === 'add') {
      // 添加AI到群聊
      if (!currentActiveAIs.includes(aiId)) {
        if (currentActiveAIs.length >= 5) {
          throw new Error('群聊最多只能有5个AI')
        }
        currentActiveAIs.push(aiId)
        updated = true
      }
    } else if (action === 'remove') {
      // 从群聊移除AI
      const index = currentActiveAIs.indexOf(aiId)
      if (index > -1) {
        currentActiveAIs.splice(index, 1)
        updated = true
      }
    }
    
    if (updated) {
      // 更新群聊的AI配置
      await db.collection('Groups').doc(groupId).update({
        data: {
          activeAIs: currentActiveAIs,
          updatedAt: new Date()
        }
      })
      
      // 发送系统消息
      const aiInfo = await getAIInfo(aiId)
      const systemMessage = action === 'add' ? 
        `${aiInfo.nickname} 已加入群聊！` : 
        `${aiInfo.nickname} 已离开群聊。`
      
      await db.collection('Messages').add({
        data: {
          groupId: groupId,
          senderId: 'system',
          senderType: 'system',
          content: systemMessage,
          type: 'text',
          createdAt: new Date(),
          meta: {
            action: action,
            aiId: aiId,
            aiName: aiInfo.nickname,
            timestamp: Date.now()
          }
        }
      })
      
      return {
        success: true,
        activeAIs: currentActiveAIs,
        message: systemMessage
      }
    }
    
    return {
      success: true,
      activeAIs: currentActiveAIs,
      message: '无需更新'
    }
    
  } catch (error) {
    console.error('管理群聊AI配置失败:', error)
    throw error
  }
}

// 新增：获取AI信息的函数
async function getAIInfo(aiId) {
  const aiPersonalities = {
    1: { id: 1, name: '温情', nickname: '心灵导师温情', personality: '温暖关怀型', avatar: '💖' },
    2: { id: 2, name: '小博', nickname: '知识助手小博', personality: '博学专业型', avatar: '📚' },
    3: { id: 3, name: '小艺', nickname: '创意伙伴小艺', personality: '创意活泼型', avatar: '🎨' },
    4: { id: 4, name: '小商', nickname: '商务顾问小商', personality: '商务专业型', avatar: '💼' },
    5: { id: 5, name: '小码', nickname: '技术专家小码', personality: '技术专家型', avatar: '💻' },
    6: { id: 6, name: '小幽', nickname: '幽默大师小幽', personality: '幽默风趣型', avatar: '😄' },
    7: { id: 7, name: '小诗', nickname: '文艺诗人小诗', personality: '文艺诗意型', avatar: '🌸' },
    8: { id: 8, name: '小智', nickname: '智慧长者小智', personality: '智慧长者型', avatar: '🧠' }
  }
  
  return aiPersonalities[aiId] || { id: aiId, name: '未知AI', nickname: '未知AI', personality: '未知类型', avatar: '🤖' }
}

// 主函数
exports.main = async (event, context) => {
  console.log('🚀 group-chat-multi-ai 云函数开始执行')
  const startTime = Date.now()
  
  try {
    console.log('📥 接收参数:', JSON.stringify(event))
    
    // 获取用户身份
    const { openid } = cloud.getWXContext()
    console.log('👤 用户openid:', openid)
    
    // 解析参数
    const { 
      groupId, 
      content, 
      type = 'text', 
      triggerAI = true,
      activeAIs = [1, 2, 3], // 默认激活3个AI
      action, // 新增：管理AI的action
      aiId // 新增：管理AI的id
    } = event
    
    console.log('📝 解析参数:', { groupId, content, type, triggerAI, activeAIs, action, aiId })
    
    // 基本验证
    if (!groupId || !content) {
      return {
        success: false,
        code: 400,
        message: '缺少必要参数',
        data: { provided: { groupId, content, type } }
      }
    }
    
    const db = cloud.database()
    const now = new Date()
    
    // 保存用户消息（透传客户端临时ID，便于前端覆盖本地临时消息）
    const userMessageResult = await db.collection('Messages').add({
      data: {
        groupId: groupId,
        senderId: openid,
        senderType: 'user',
        content: content,
        type: type,
        createdAt: now,
        meta: {
          timestamp: now.getTime(),
          clientMsgId: event.clientMsgId || ''
        }
      }
    })
    
    console.log('✅ 用户消息保存成功')
    
    let aiReplies = []
    
    // 如果需要触发AI回复
    if (triggerAI && activeAIs.length > 0) {
      // 获取群聊最近的AI回复时间
      const lastAIReply = await db.collection('Messages')
        .where({
          groupId: groupId,
          senderType: 'ai'
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
      
      const lastAIReplyTime = lastAIReply.data.length > 0 ? 
        new Date(lastAIReply.data[0].createdAt).getTime() : null
      
      // 获取群聊最近的消息作为上下文
      const recentMessages = await db.collection('Messages')
        .where({
          groupId: groupId
        })
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
      
      const context = recentMessages.data
        .reverse()
        .map(msg => `${msg.senderType === 'user' ? '用户' : 'AI'}: ${msg.content}`)
        .join('\n')
      
      // 选择AI回复
      const selectedAI = selectAIReply(content, activeAIs.map(id => ({ id })), lastAIReplyTime)
      
      if (selectedAI) {
        console.log(`🤖 选择AI ${selectedAI.id} 进行回复`)
        
        try {
          // 调用AI API
          const aiReply = await callSiliconFlowAPI(content, selectedAI.id, context)
          
          // 保存AI回复
          const aiMessageResult = await db.collection('Messages').add({
            data: {
              groupId: groupId,
              senderId: `ai_${selectedAI.id}`,
              senderType: 'ai',
              content: aiReply,
              type: 'text',
              createdAt: now,
              meta: {
                characterId: selectedAI.id,
                model: 'qwen-2.5-7b',
                isAIGenerated: true
              }
            }
          })
          
          aiReplies.push({
            aiId: selectedAI.id,
            content: aiReply,
            messageId: aiMessageResult._id
          })
          
          console.log(`✅ AI ${selectedAI.id} 回复保存成功`)
          
        } catch (aiError) {
          console.warn(`⚠️ AI ${selectedAI.id} 回复失败，使用备用回复:`, aiError.message)
          
          // 使用备用回复
          const fallbackReply = await generateFallbackReply(content, selectedAI.id, context)
          
          const fallbackMessageResult = await db.collection('Messages').add({
            data: {
              groupId: groupId,
              senderId: `ai_${selectedAI.id}`,
              senderType: 'ai',
              content: fallbackReply,
              type: 'text',
              createdAt: now,
              meta: {
                characterId: selectedAI.id,
                model: 'fallback',
                isAIGenerated: true
              }
            }
          })
          
          aiReplies.push({
            aiId: selectedAI.id,
            content: fallbackReply,
            messageId: fallbackMessageResult._id
          })
        }
      }
    }

    // 处理管理AI的请求
    if (action && aiId) {
      try {
        const result = await manageGroupAIs(groupId, action, aiId, openid)
        console.log('✅ 管理群聊AI配置成功:', result)
        return {
          success: true,
          code: 200,
          message: '群聊AI配置更新成功',
          data: result
        }
      } catch (error) {
        console.error('💥 管理群聊AI配置失败:', error)
        return {
          success: false,
          code: 500,
          message: '管理群聊AI配置失败: ' + error.message,
          data: {
            error: error.message
          }
        }
      }
    }

    // 如果没有内容，只处理AI管理请求
    if (!content && action && aiId) {
      return {
        success: true,
        code: 200,
        message: '群聊AI配置更新成功',
        data: await manageGroupAIs(groupId, action, aiId, openid)
      }
    }
    
    // 更新群聊信息
    await db.collection('Groups').doc(groupId).update({
      data: {
        lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        lastActiveAt: now,
        updatedAt: now,
        messageCount: db.command.inc(1),
        activeAIs: activeAIs // 保存当前激活的AI列表
      }
    })
    
    const totalTime = Date.now() - startTime
    
    // 返回结果
    const result = {
      success: true,
      code: 200,
      message: '多AI群聊消息处理成功',
      data: {
        userMessageId: userMessageResult._id,
        aiReplies: aiReplies,
        activeAIs: activeAIs,
        totalTime: totalTime
      }
    }
    
    console.log('📤 返回结果:', JSON.stringify(result))
    console.log('⏱️ 总执行时间:', totalTime + 'ms')
    return result
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('💥 多AI群聊云函数执行异常:', error)
    
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
