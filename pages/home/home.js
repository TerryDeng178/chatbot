// pages/home/home.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    groupList: [],
    loading: false,
    hasError: false, // 新增：是否有错误
    showCreateModal: false,
    newGroupName: '',
    newGroupTopic: '',
    newGroupDescription: '',
    heartbeatTimer: null,
    isOnline: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('📱 群聊首页加载')
    this.startHeartbeat()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log('📱 群聊首页显示')
    this.reportPresence('home')
    this.loadGroupList()
    this.startHeartbeat()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    this.stopHeartbeat()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.stopHeartbeat()
  },

  /**
   * 开始心跳机制
   */
  startHeartbeat() {
    // 清除之前的定时器
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer)
    }
    
    // 立即上报一次
    this.reportPresence('home')
    
    // 设置25秒间隔的心跳
    const timer = setInterval(() => {
      this.reportPresence('home')
    }, 25000)
    
    this.setData({
      heartbeatTimer: timer
    })
  },

  /**
   * 停止心跳机制
   */
  stopHeartbeat() {
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer)
      this.setData({
        heartbeatTimer: null
      })
    }
  },

  /**
   * 上报用户在线状态
   */
  reportPresence(page) {
    const app = getApp()
    app.cloudCall('user-report-presence', { page })
      .then(res => {
        if (res.result && res.result.success) {
          this.setData({ isOnline: true })
        }
      })
      .catch(err => {
        console.error('在线状态上报失败:', err)
        this.setData({ isOnline: false })
      })
  },

  /**
   * 加载群聊列表
   */
  loadGroupList() {
    this.setData({ 
      loading: true,
      hasError: false // 重置错误状态
    })
    
    const app = getApp()
    app.cloudCall('chat-list-groups')
      .then(res => {
        if (res.result && res.result.success) {
          const groups = res.result.data.groups || []
          const sortedGroups = this.sortGroups(groups)
          
          this.setData({
            groupList: sortedGroups,
            loading: false,
            hasError: false
          })
          
          console.log(`✅ 成功加载 ${sortedGroups.length} 个群聊`)
        } else {
          console.error('获取群聊列表失败:', res.result ? res.result.message : '未知错误')
          this.setData({ 
            loading: false,
            hasError: true
          })
          this.showErrorToast('加载失败，请重试')
        }
      })
      .catch(error => {
        console.error('获取群聊列表异常:', error)
        this.setData({ 
          loading: false,
          hasError: true
        })
        this.showErrorToast('网络错误，请检查网络连接')
      })
  },

  /**
   * 显示错误提示
   */
  showErrorToast(message) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    })
  },

  /**
   * 重试加载群聊列表
   */
  retryLoadGroups() {
    console.log('🔄 重试加载群聊列表')
    this.loadGroupList()
  },

  /**
   * 智能刷新群聊列表
   */
  smartRefreshGroups() {
    // 只有在用户在线时才刷新
    if (this.data.isOnline) {
      console.log('🔄 智能刷新群聊列表')
      this.loadGroupList()
    }
  },

  /**
   * 群聊列表排序
   */
  sortGroups(groups) {
    return groups.sort((a, b) => {
      // 1. 置顶官方群优先
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      
      // 2. 有未读消息的优先
      const aHasUnread = a.unreadCount > 0
      const bHasUnread = b.unreadCount > 0
      if (aHasUnread && !bHasUnread) return -1
      if (!aHasUnread && bHasUnread) return 1
      
      // 3. 按最后活跃时间倒序
      return new Date(b.lastActiveAt) - new Date(a.lastActiveAt)
    })
  },

  /**
   * 进入群聊
   */
  navigateToGroup(event) {
    const groupId = event.currentTarget.dataset.groupId
    const groupName = event.currentTarget.dataset.groupName
    
    console.log(`进入群聊: ${groupName} (${groupId})`)
    
    // 自动加入群聊（如果还不是成员）
    this.autoJoinGroup(groupId, groupName)
    
    // 跳转到群聊页面
    wx.navigateTo({
      url: `/pages/group-chat/group-chat?groupId=${groupId}&groupName=${encodeURIComponent(groupName)}`
    })
  },

  /**
   * 自动加入群聊
   */
  autoJoinGroup(groupId, groupName) {
    // 这里可以调用后端接口自动将用户加入群聊
    // 暂时只记录日志
    console.log(`用户自动加入群聊: ${groupName}`)
  },

  /**
   * 显示创建群聊弹窗
   */
  showCreateGroupModal() {
    this.setData({
      showCreateModal: true,
      newGroupName: '',
      newGroupTopic: '',
      newGroupDescription: ''
    })
  },

  /**
   * 隐藏创建群聊弹窗
   */
  hideCreateGroupModal() {
    this.setData({
      showCreateModal: false
    })
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
  },

  /**
   * 输入群聊名称
   */
  onGroupNameInput(e) {
    this.setData({
      newGroupName: e.detail.value
    })
  },

  /**
   * 输入群聊主题
   */
  onGroupTopicInput(e) {
    this.setData({
      newGroupTopic: e.detail.value
    })
  },

  /**
   * 输入群聊描述
   */
  onGroupDescriptionInput(e) {
    this.setData({
      newGroupDescription: e.detail.value
    })
  },

  /**
   * 创建群聊
   */
  createGroup() {
    const { newGroupName, newGroupTopic, newGroupDescription } = this.data
    
    if (!newGroupName.trim()) {
      wx.showToast({
        title: '请输入群聊名称',
        icon: 'none'
      })
      return
    }
    
    if (!newGroupTopic.trim()) {
      wx.showToast({
        title: '请输入群聊主题',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '创建中...'
    })
    
    const app = getApp()
    app.cloudCall('chat-create-group', {
      name: newGroupName.trim(),
      topic: newGroupTopic.trim(),
      description: newGroupDescription.trim()
    })
      .then(res => {
        wx.hideLoading()
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          })
          
          this.hideCreateGroupModal()
          this.loadGroupList() // 刷新列表
          
          // 跳转到新创建的群聊
          const groupId = res.result.data.groupId
          wx.navigateTo({
            url: `/pages/group-chat/group-chat?groupId=${groupId}&groupName=${encodeURIComponent(newGroupName)}`
          })
        } else {
          wx.showToast({
            title: res.result ? res.result.message : '创建失败',
            icon: 'error'
          })
        }
      })
      .catch(err => {
        wx.hideLoading()
        console.error('创建群聊失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        })
      })
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadGroupList()
    wx.stopPullDownRefresh()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 导航到角色选择页面
   */
  navigateToRoles() {
    wx.navigateTo({
      url: '/pages/select-character/select-character'
    })
  },

  /**
   * 导航到设置页面
   */
  navigateToSettings() {
    // 这里可以跳转到设置页面，暂时显示提示
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: 'AI社交群聊 - 发现更多有趣的话题',
      path: '/pages/home/home'
    }
  }
})