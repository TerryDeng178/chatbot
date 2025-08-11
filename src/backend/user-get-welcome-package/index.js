const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 默认角色列表配置
const DEFAULT_CHARACTER_LIST = [
  {
    id: 1,
    name: '心灵导师温情',
    description: '温暖的心理咨询师，提供情感支持和人生指导',
    emoji: '💝',
    detail: '专业心理咨询师，擅长情感疏导、人际关系处理、自我认知提升。温柔耐心，善于倾听，用专业知识为您解答人生困惑。',
    model: 'qwen',
    modelDesc: 'Qwen-2.5-72B',
    category: 'emotional',
    isLocked: false,
    unlockType: 'free'
  },
  {
    id: 2,
    name: '知识助手小博',
    description: '博学多才的知识伙伴，擅长学习和知识问答',
    emoji: '📚',
    detail: '拥有丰富知识储备的智能助手，精通各领域知识，能够为您提供准确、详细的学习指导和知识解答。',
    model: 'glm',
    modelDesc: 'GLM-4-9B',
    category: 'knowledge',
    isLocked: false,
    unlockType: 'free'
  },
  {
    id: 3,
    name: '创意伙伴小艺',
    description: '富有想象力的创作助手，激发无限创意灵感',
    emoji: '🎨',
    detail: '专业创意助手，擅长写作、设计思维、艺术创作。能够帮您构思创意方案，提供灵感启发。',
    model: 'yi',
    modelDesc: 'Yi-1.5-34B',
    category: 'creative',
    isLocked: true,
    unlockType: 'ad'
  },
  {
    id: 4,
    name: '商务顾问小商',
    description: '专业的商业分析师，提供商务决策支持',
    emoji: '💼',
    detail: '资深商业顾问，精通市场分析、商业策略、财务规划。为您的商业决策提供专业建议。',
    model: 'baichuan',
    modelDesc: 'Baichuan2-13B',
    category: 'business',
    isLocked: true,
    unlockType: 'ad'
  },
  {
    id: 5,
    name: '技术专家小码',
    description: '编程和技术问题的专业解答者',
    emoji: '💻',
    detail: '资深技术专家，精通多种编程语言和技术栈，能够解答技术难题，提供编程指导。',
    model: 'llama',
    modelDesc: 'Llama-3.1-70B',
    category: 'tech',
    isLocked: true,
    unlockType: 'ad'
  }
]

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('🚀 user-get-welcome-package 云函数开始执行')
  console.log('📥 接收参数:', event)
  
  try {
    console.log('🔄 开始构建欢迎包数据...')
    
    // 返回默认的欢迎包和角色列表
    const welcomeData = {
      title: "欢迎使用AI对话助手！",
      messages: [
        "🌟 欢迎来到AI智能对话世界！",
        "💝 选择您喜欢的AI角色开始对话",
        "🎁 每日免费消息，精彩对话等您体验"
      ],
      characterList: DEFAULT_CHARACTER_LIST
    }
    
    console.log('✅ 欢迎包数据构建成功')
    console.log('📊 角色列表数量:', DEFAULT_CHARACTER_LIST.length)
    console.log('📊 第一个角色:', DEFAULT_CHARACTER_LIST[0].name)
    
    const result = {
      success: true,
      code: 200,
      message: '欢迎包获取成功',
      data: welcomeData
    }
    
    console.log('📤 返回结果:', result)
    return result
    
  } catch (e) {
    console.error('💥 云函数执行异常:', e)
    console.error('💥 错误堆栈:', e.stack)
    
    const errorResult = {
      success: false,
      code: 500,
      message: '服务器内部错误: ' + e.message,
      data: {
        error: e.message,
        stack: e.stack
      }
    }
    
    console.log('📤 返回错误结果:', errorResult)
    return errorResult
  }
}