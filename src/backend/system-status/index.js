// 系统状态监控云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 模拟负载均衡状态（在实际环境中这会是共享状态）
const MODEL_STATUS = {
  qwen: { maxConcurrent: 3, currentLoad: 0, avgResponseTime: 1135, available: true, totalRequests: 0, successRequests: 0 },
  glm: { maxConcurrent: 2, currentLoad: 0, avgResponseTime: 1298, available: true, totalRequests: 0, successRequests: 0 },
  yi: { maxConcurrent: 2, currentLoad: 0, avgResponseTime: 1437, available: true, totalRequests: 0, successRequests: 0 },
  baichuan: { maxConcurrent: 4, currentLoad: 0, avgResponseTime: 570, available: true, totalRequests: 0, successRequests: 0 },
  llama: { maxConcurrent: 3, currentLoad: 0, avgResponseTime: 805, available: true, totalRequests: 0, successRequests: 0 },
  hunyuan: { maxConcurrent: 2, currentLoad: 0, avgResponseTime: 2000, available: true, totalRequests: 0, successRequests: 0 },
  doubao: { maxConcurrent: 2, currentLoad: 0, avgResponseTime: 1800, available: true, totalRequests: 0, successRequests: 0 },
  openai: { maxConcurrent: 1, currentLoad: 0, avgResponseTime: 3000, available: true, totalRequests: 0, successRequests: 0 },
  deepseek: { maxConcurrent: 2, currentLoad: 0, avgResponseTime: 2500, available: true, totalRequests: 0, successRequests: 0 },
  wenxin: { maxConcurrent: 1, currentLoad: 0, avgResponseTime: 3500, available: true, totalRequests: 0, successRequests: 0 }
};

/**
 * 系统状态监控云函数
 * 提供负载均衡、模型状态、性能指标等信息
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event
  
  try {
    switch (action) {
      case 'getSystemStatus':
        return await getSystemStatus()
      case 'getModelMetrics':
        return await getModelMetrics()
      case 'getHealthCheck':
        return await getHealthCheck()
      case 'resetMetrics':
        return await resetMetrics()
      default:
        return {
          success: false,
          code: 400,
          message: '不支持的操作',
          data: null
        }
    }
  } catch (error) {
    console.error('系统状态查询失败:', error)
    return {
      success: false,
      code: 500,
      message: '系统状态查询失败',
      data: { error: error.message }
    }
  }
}

// 获取完整系统状态
async function getSystemStatus() {
  const now = new Date()
  
  // 计算系统整体指标
  const totalModels = Object.keys(MODEL_STATUS).length
  const availableModels = Object.values(MODEL_STATUS).filter(m => m.available).length
  const totalCapacity = Object.values(MODEL_STATUS).reduce((sum, m) => sum + m.maxConcurrent, 0)
  const currentLoad = Object.values(MODEL_STATUS).reduce((sum, m) => sum + m.currentLoad, 0)
  const avgResponseTime = Object.values(MODEL_STATUS).reduce((sum, m) => sum + m.avgResponseTime, 0) / totalModels
  
  // 模型性能排行
  const modelPerformance = Object.entries(MODEL_STATUS)
    .map(([name, stats]) => ({
      name,
      available: stats.available,
      loadRatio: stats.currentLoad / stats.maxConcurrent,
      avgResponseTime: stats.avgResponseTime,
      successRate: stats.totalRequests > 0 ? (stats.successRequests / stats.totalRequests * 100).toFixed(2) : '100.00'
    }))
    .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
  
  return {
    success: true,
    code: 200,
    message: '系统状态获取成功',
    data: {
      timestamp: now.toISOString(),
      systemHealth: {
        totalModels,
        availableModels,
        healthRate: ((availableModels / totalModels) * 100).toFixed(2),
        totalCapacity,
        currentLoad,
        loadRate: ((currentLoad / totalCapacity) * 100).toFixed(2),
        avgResponseTime: Math.round(avgResponseTime)
      },
      modelStatus: MODEL_STATUS,
      modelPerformance,
      recommendations: generateRecommendations()
    }
  }
}

// 获取模型性能指标
async function getModelMetrics() {
  const metrics = {}
  
  for (const [modelName, stats] of Object.entries(MODEL_STATUS)) {
    metrics[modelName] = {
      availability: stats.available ? '可用' : '不可用',
      capacity: `${stats.currentLoad}/${stats.maxConcurrent}`,
      loadPercentage: ((stats.currentLoad / stats.maxConcurrent) * 100).toFixed(1),
      avgResponseTime: `${stats.avgResponseTime}ms`,
      successRate: stats.totalRequests > 0 ? 
        `${((stats.successRequests / stats.totalRequests) * 100).toFixed(2)}%` : '100%',
      performance: getPerformanceLevel(stats.avgResponseTime),
      status: getModelStatusText(stats)
    }
  }
  
  return {
    success: true,
    code: 200,
    message: '模型指标获取成功',
    data: {
      timestamp: new Date().toISOString(),
      metrics
    }
  }
}

// 健康检查
async function getHealthCheck() {
  const healthIssues = []
  const warnings = []
  
  for (const [modelName, stats] of Object.entries(MODEL_STATUS)) {
    // 检查可用性
    if (!stats.available) {
      healthIssues.push(`模型 ${modelName} 不可用`)
    }
    
    // 检查负载
    const loadRatio = stats.currentLoad / stats.maxConcurrent
    if (loadRatio > 0.8) {
      warnings.push(`模型 ${modelName} 负载过高 (${(loadRatio * 100).toFixed(1)}%)`)
    }
    
    // 检查响应时间
    if (stats.avgResponseTime > 3000) {
      warnings.push(`模型 ${modelName} 响应时间过长 (${stats.avgResponseTime}ms)`)
    }
    
    // 检查成功率
    if (stats.totalRequests > 10 && stats.successRequests / stats.totalRequests < 0.9) {
      healthIssues.push(`模型 ${modelName} 成功率过低 (${((stats.successRequests / stats.totalRequests) * 100).toFixed(2)}%)`)
    }
  }
  
  const overallHealth = healthIssues.length === 0 ? 'healthy' : 
                       healthIssues.length <= 2 ? 'warning' : 'critical'
  
  return {
    success: true,
    code: 200,
    message: '健康检查完成',
    data: {
      timestamp: new Date().toISOString(),
      overallHealth,
      healthScore: Math.max(0, 100 - healthIssues.length * 20 - warnings.length * 5),
      issues: healthIssues,
      warnings,
      summary: `发现 ${healthIssues.length} 个严重问题，${warnings.length} 个警告`
    }
  }
}

// 重置指标
async function resetMetrics() {
  for (const stats of Object.values(MODEL_STATUS)) {
    stats.totalRequests = 0
    stats.successRequests = 0
    stats.currentLoad = 0
  }
  
  return {
    success: true,
    code: 200,
    message: '指标重置成功',
    data: {
      timestamp: new Date().toISOString(),
      message: '所有模型指标已重置'
    }
  }
}

// 生成优化建议
function generateRecommendations() {
  const recommendations = []
  
  // 分析整体负载
  const totalLoad = Object.values(MODEL_STATUS).reduce((sum, m) => sum + m.currentLoad, 0)
  const totalCapacity = Object.values(MODEL_STATUS).reduce((sum, m) => sum + m.maxConcurrent, 0)
  
  if (totalLoad / totalCapacity > 0.7) {
    recommendations.push('系统总体负载较高，建议增加模型实例或优化请求分配')
  }
  
  // 分析单个模型
  for (const [modelName, stats] of Object.entries(MODEL_STATUS)) {
    if (!stats.available) {
      recommendations.push(`模型 ${modelName} 不可用，请检查配置和网络连接`)
    } else if (stats.currentLoad / stats.maxConcurrent > 0.8) {
      recommendations.push(`模型 ${modelName} 负载过高，建议增加并发限制或分流到其他模型`)
    } else if (stats.avgResponseTime > 3000) {
      recommendations.push(`模型 ${modelName} 响应时间过长，建议检查网络或切换到更快的模型`)
    }
  }
  
  // 性能优化建议
  const fastestModel = Object.entries(MODEL_STATUS)
    .filter(([_, stats]) => stats.available)
    .sort(([_, a], [__, b]) => a.avgResponseTime - b.avgResponseTime)[0]
  
  if (fastestModel && fastestModel[1].avgResponseTime < 1000) {
    recommendations.push(`模型 ${fastestModel[0]} 性能最佳(${fastestModel[1].avgResponseTime}ms)，建议优先使用`)
  }
  
  return recommendations.length > 0 ? recommendations : ['系统运行正常，无需特殊优化']
}

// 获取性能等级
function getPerformanceLevel(responseTime) {
  if (responseTime < 1000) return '优秀'
  if (responseTime < 2000) return '良好'
  if (responseTime < 3000) return '一般'
  return '较慢'
}

// 获取模型状态文本
function getModelStatusText(stats) {
  if (!stats.available) return '离线'
  
  const loadRatio = stats.currentLoad / stats.maxConcurrent
  if (loadRatio === 0) return '空闲'
  if (loadRatio < 0.5) return '轻载'
  if (loadRatio < 0.8) return '中载'
  return '重载'
}
