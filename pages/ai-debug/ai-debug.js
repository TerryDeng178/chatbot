// pages/ai-debug/ai-debug.js
const app = getApp()

Page({
  data: {
    debugResult: null,
    isRunning: false,
    debugHistory: [],
    showHistory: false
  },

  /**
   * 页面加载
   */
  onLoad(options) {
    console.log('AI问题诊断页面加载')
  },

  /**
   * 开始AI问题诊断
   */
  async startAIDebug() {
    console.log('🚀 开始AI问题诊断...')
    
    this.setData({ 
      isRunning: true,
      debugResult: null 
    })
    
    try {
      // 调用诊断云函数
      const res = await app.cloudCall('debug-ai-issue')
      console.log('🔍 诊断云函数返回:', res)
      
      if (res.result && res.result.success) {
        const debugData = res.result.data
        console.log('📊 诊断数据:', debugData)
        
        // 保存到历史记录
        const historyItem = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          result: debugData
        }
        
        const newHistory = [historyItem, ...this.data.debugHistory]
        this.setData({
          debugResult: debugData,
          debugHistory: newHistory.slice(0, 10) // 只保留最近10条
        })
        
        // 显示诊断结果
        this.showDebugResult(debugData)
        
      } else {
        console.error('❌ 诊断失败:', res.result?.message || '未知错误')
        wx.showToast({
          title: '诊断失败',
          icon: 'none',
          duration: 3000
        })
      }
      
    } catch (error) {
      console.error('🔥 调用诊断云函数失败:', error)
      wx.showToast({
        title: '诊断失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    } finally {
      this.setData({ isRunning: false })
    }
  },

  /**
   * 显示诊断结果
   */
  showDebugResult(debugData) {
    const { overallStatus, mainIssue, recommendations } = debugData
    
    let title = '诊断完成'
    let icon = 'success'
    
    if (overallStatus === 'healthy') {
      title = 'AI系统正常'
      icon = 'success'
    } else if (overallStatus === 'needs_data') {
      title = '需要修复数据'
      icon = 'warn'
    } else if (overallStatus === 'missing_collection') {
      title = '集合缺失'
      icon = 'error'
    } else if (overallStatus === 'environment_error') {
      title = '环境配置问题'
      icon = 'error'
    }
    
    wx.showModal({
      title: title,
      content: mainIssue + '\n\n' + recommendations.join('\n'),
      showCancel: false,
      confirmText: '查看详情'
    })
  },

  /**
   * 查看历史记录
   */
  toggleHistory() {
    this.setData({
      showHistory: !this.data.showHistory
    })
  },

  /**
   * 查看历史记录详情
   */
  viewHistoryDetail(e) {
    const { index } = e.currentTarget.dataset
    const historyItem = this.data.debugHistory[index]
    
    wx.showModal({
      title: `诊断记录 - ${historyItem.timestamp}`,
      content: this.formatHistoryContent(historyItem.result),
      showCancel: false,
      confirmText: '确定'
    })
  },

  /**
   * 格式化历史记录内容
   */
  formatHistoryContent(result) {
    const { overallStatus, mainIssue, recommendations } = result
    
    let statusText = '未知状态'
    switch (overallStatus) {
      case 'healthy':
        statusText = '✅ 正常'
        break
      case 'needs_data':
        statusText = '⚠️ 需要数据'
        break
      case 'missing_collection':
        statusText = '❌ 集合缺失'
        break
      case 'environment_error':
        statusText = '🚨 环境错误'
        break
    }
    
    return `状态: ${statusText}\n问题: ${mainIssue}\n\n建议:\n${recommendations.join('\n')}`
  },

  /**
   * 清除历史记录
   */
  clearHistory() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有诊断历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ debugHistory: [] })
          wx.showToast({
            title: '历史记录已清除',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 复制诊断结果
   */
  copyDebugResult() {
    if (!this.data.debugResult) {
      wx.showToast({
        title: '没有可复制的诊断结果',
        icon: 'none'
      })
      return
    }
    
    const resultText = JSON.stringify(this.data.debugResult, null, 2)
    
    wx.setClipboardData({
      data: resultText,
      success: () => {
        wx.showToast({
          title: '诊断结果已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  },

  /**
   * 重新测试AI功能
   */
  async retestAIFunction() {
    console.log('🔄 重新测试AI功能...')
    
    try {
      // 调用get-ai-personalities云函数
      const res = await app.cloudCall('get-ai-personalities')
      console.log('🔍 AI功能测试返回:', res)
      
      if (res.result && res.result.success) {
        const personalities = res.result.data?.personalities || []
        wx.showModal({
          title: 'AI功能测试成功',
          content: `成功获取到 ${personalities.length} 个AI性格\n\n第一个AI: ${personalities[0]?.name || '未知'}`,
          showCancel: false,
          confirmText: '确定'
        })
      } else {
        wx.showModal({
          title: 'AI功能测试失败',
          content: res.result?.message || '未知错误',
          showCancel: false,
          confirmText: '确定'
        })
      }
      
    } catch (error) {
      console.error('🔥 AI功能测试失败:', error)
      wx.showToast({
        title: '测试失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  }
})
