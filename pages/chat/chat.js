// pages/chat/chat.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    messages: [],
    inputText: '',
    isLoading: false,
    scrollTop: 0,
    toView: '',
    groupId: '',
    characterId: null,
    currentCharacter: {
      name: '心灵导师温情',
      id: 1
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const characterId = parseInt(options.characterId) || 1;
    const characterName = options.characterName || '心灵导师温情';
    
    this.setData({
      groupId: options.groupId || 'default',
      characterId: characterId,
      currentCharacter: {
        id: characterId,
        name: characterName
      }
    });

    this.getMessages();
  },

  /**
   * 获取聊天消息列表
   */
  getMessages() {
    const app = getApp();
    console.log('🔍 获取聊天消息，群组ID:', this.data.groupId)
    
    // 重新启用获取历史消息
    console.log('🔄 重新启用历史消息获取')
    
    app.cloudCall('chat-get-messages', { groupId: this.data.groupId })
      .then(res => {
        console.log('🔍 获取消息云函数返回:', res)
        
        // 兼容新旧两种返回格式
        let isSuccess = false
        let messageList = []
        let errorMessage = '获取消息失败'
        
        if (res.result) {
          // 新格式检查
          if (res.result.success === true) {
            isSuccess = true
            messageList = res.result.data.list || []
            errorMessage = res.result.message
          }
          // 旧格式检查
          else if (res.result.errCode === 0) {
            isSuccess = true
            messageList = res.result.data.list || []
            errorMessage = res.result.errMsg
          }
          // 错误处理
          else {
            errorMessage = res.result.message || res.result.errMsg || '获取消息失败'
            console.error('🔥 获取消息API返回错误:', res.result)
          }
        } else {
          console.error('🔥 获取消息云函数返回格式错误:', res)
          errorMessage = '服务响应格式错误'
        }
        
        if (isSuccess) {
          console.log('✅ 获取消息成功，数量:', messageList.length)
          const messages = messageList.map((msg, index) => ({
            ...msg,
            id: msg.id || msg._id || index,
            time: this.formatTime(msg.createdAt || msg.createTime || new Date())
          }));
          this.setData({
            messages: messages
          });
          this.scrollToBottom();
        } else {
          console.error('❌ 获取消息失败:', errorMessage)
          // 如果获取失败，显示空消息列表
          this.setData({
            messages: []
          });
        }
      })
      .catch(err => {
        console.error('💥 调用获取消息云函数失败:', err);
        this.setData({
          messages: []
        });
      });
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  sendMessage() {
    const content = this.data.inputText.trim();
    if (!content) {
      return;
    }

    // 添加用户消息到界面
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content,
      time: this.formatTime(new Date())
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputText: '',
      isLoading: true
    });

    this.scrollToBottom();

    // 发送消息到云函数
    const app = getApp();
    
    console.log('发送消息到AI:', {
      groupId: this.data.groupId,
      content: content,
      characterId: this.data.characterId
    });

    const requestData = {
      groupId: this.data.groupId,
      content: content,
      characterId: this.data.characterId
    };

    console.log('📤 发送请求数据:', requestData);

    app.cloudCall('chat-send-message', requestData)
      .then(res => {
        console.log('AI回复结果:', res);
        
        this.setData({
          isLoading: false
        });
        
        // 统一处理不同的返回格式
        let aiMessage = null;
        let isSuccess = false;
        let errorMessage = '发送失败，请重试';

        if (res.result) {
          // 新格式检查
          if (res.result.success === true) {
            isSuccess = true;
            aiMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: res.result.data.reply || '抱歉，我现在无法回复，请稍后再试。',
              time: this.formatTime(new Date()),
              model: res.result.data.model || 'unknown'
            };
            
            // 记录模型切换信息
            if (res.result.data.switched) {
              console.log(`模型切换: ${res.result.data.originalModel} -> ${res.result.data.actualModel}`);
            }
          }
          // 旧格式检查
          else if (res.result.errCode === 0) {
            isSuccess = true;
            aiMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: res.result.data.reply || '抱歉，我现在无法回复，请稍后再试。',
              time: this.formatTime(new Date())
            };
          }
          // 错误处理
          else {
            errorMessage = res.result.message || res.result.errMsg || '发送失败，请重试';
            console.error('API返回错误:', res.result);
          }
        } else {
          console.error('云函数返回格式错误:', res);
          errorMessage = '服务响应格式错误';
        }

        if (isSuccess && aiMessage) {
          this.setData({
            messages: [...this.data.messages, aiMessage]
          });
          this.scrollToBottom();
        } else {
          console.error('消息发送失败:', errorMessage);
          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 3000
          });
        }
      })
      .catch(err => {
        console.error('Error calling chat-send-message:', err);
        this.setData({
          isLoading: false
        });
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  },

  /**
   * 格式化时间显示
   */
  formatTime(date) {
    const now = new Date();
    const msgDate = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    
    const hours = msgDate.getHours().toString().padStart(2, '0');
    const minutes = msgDate.getMinutes().toString().padStart(2, '0');
    
    if (msgDay.getTime() === today.getTime()) {
      return `${hours}:${minutes}`;
    } else if (msgDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return `昨天 ${hours}:${minutes}`;
    } else {
      const month = (msgDate.getMonth() + 1).toString().padStart(2, '0');
      const day = msgDate.getDate().toString().padStart(2, '0');
      return `${month}月${day}日`;
    }
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    setTimeout(() => {
      this.setData({
        scrollTop: 999999
      });
    }, 100);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新消息
    if (this.data.groupId) {
      this.getMessages();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.getMessages();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: 'AI 心灵伙伴',
      path: '/pages/home/home'
    };
  }
})