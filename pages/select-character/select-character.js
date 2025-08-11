// pages/select-character/select-character.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    characterList: [],
    filteredCharacters: [],
    filterTags: [
      { key: 'all', name: '全部' },
      { key: 'emotional', name: '情感陪伴' },
      { key: 'professional', name: '专业助手' },
      { key: 'casual', name: '休闲娱乐' },
      { key: 'creative', name: '创意灵感' }
    ],
    currentFilter: 'all',
    showModal: false,
    selectedCharacter: {},
    // 个性编辑
    showEditor: false,
    editingCharacter: {},
    genderOptions: ['未知', '男', '女'],
    styleOptions: ['默认', '温柔', '专业', '创意', '幽默', '技术', '诗意', '睿智'],
    identityOptions: ['助手', '心理咨询师', '老师', '工程师', '艺术家', '商务顾问', '哲学家', '作家'],
    relationshipOptions: ['助手', '朋友', '导师', '同事'],
    genderIndex: 0,
    styleIndex: 0,
    identityIndex: 0,
    relationshipIndex: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getWelcomePackage();
  },

  /**
   * 获取角色列表
   */
  getWelcomePackage() {
    console.log('🔍 获取欢迎包信息...')
    
    app.cloudCall('user-get-welcome-package', {})
      .then(res => {
        console.log('🔍 欢迎包云函数返回:', res)
        
        // 兼容新旧两种返回格式
        let isSuccess = false
        let characterListData = []
        let errorMessage = '获取角色列表失败'
        
        if (res.result) {
          // 新格式检查
          if (res.result.success === true) {
            isSuccess = true
            characterListData = res.result.data.characterList || []
            errorMessage = res.result.message
          }
          // 旧格式检查
          else if (res.result.errCode === 0) {
            isSuccess = true
            characterListData = res.result.data.characterList || []
            errorMessage = res.result.errMsg
          }
          // 错误处理
          else {
            errorMessage = res.result.message || res.result.errMsg || '获取角色列表失败'
            console.error('🔥 欢迎包API返回错误:', res.result)
          }
        } else {
          console.error('🔥 欢迎包云函数返回格式错误:', res)
          errorMessage = '服务响应格式错误'
        }
        
        if (isSuccess) {
          console.log('✅ 获取角色列表成功，数量:', characterListData.length)
          const characterList = this.processCharacterList(characterListData);
          this.setData({
            characterList: characterList
          });
          this.filterCharacters();
        } else {
          console.error('❌ 获取角色列表失败:', errorMessage)
          console.log('🔄 使用默认角色列表')
          this.loadDefaultCharacters();
        }
      })
      .catch(err => {
        console.error('💥 调用欢迎包云函数失败:', err);
        console.log('🔄 使用默认角色列表')
        this.loadDefaultCharacters();
      });
  },

  /**
   * 处理角色列表数据
   */
  processCharacterList(list) {
    return list.map((character, index) => ({
      id: character.id || index,
      name: character.name || '未知角色',
      description: character.description || '暂无描述',
      detail: character.detail || character.description || '暂无详细信息',
      icon: character.icon || this.getDefaultIcon(index),
      category: character.category || 'emotional',
      unlocked: character.unlocked !== false // 默认解锁
    }));
  },

  /**
   * 加载默认角色列表
   */
  loadDefaultCharacters() {
    const defaultCharacters = [
      {
        id: 1,
        name: '心灵导师温情',
        description: '温柔体贴的情绪陪伴，专业心理疏导',
        detail: '我是一位温暖的心理咨询师，基于Qwen大模型，擅长倾听和理解。无论你遇到什么困扰，我都会用最温柔的方式陪伴你度过难关。',
        icon: '💝',
        category: 'emotional',
        unlocked: true,
        model: 'qwen',
        modelDesc: 'Qwen2.5-7B 智谱模型'
      },
      {
        id: 2,
        name: '成长规划师',
        description: '逻辑清晰的个人成长教练',
        detail: '我是基于GLM大模型的专业成长教练，逻辑清晰，善于分析。我会帮助你制定可行的目标和成长计划，提供结构化的建议。',
        icon: '🎯',
        category: 'professional',
        unlocked: true,
        model: 'glm',
        modelDesc: 'GLM-4-9B 智谱模型'
      },
      {
        id: 3,
        name: '轻松熊猫',
        description: '活泼可爱的减压陪伴',
        detail: '我是基于Yi大模型的可爱熊猫，性格开朗活泼！我最擅长的就是用有趣的方式让你开心，缓解你的压力，带来欢乐时光。',
        icon: '🐼',
        category: 'casual',
        unlocked: true,
        model: 'yi',
        modelDesc: 'Yi-1.5-9B 零一万物'
      },
      {
        id: 4,
        name: '睡眠精灵',
        description: '温柔的冥想指导师',
        detail: '我是基于Baichuan大模型的睡眠精灵，声音轻柔语调缓慢。我专门帮助你放松身心，获得好的睡眠，为你讲述温馨的睡前故事。',
        icon: '🌙',
        category: 'casual',
        unlocked: false,
        model: 'baichuan',
        modelDesc: 'Baichuan2-13B 百川智能'
      },
      {
        id: 5,
        name: '学习助手小智',
        description: '专业的学习指导专家',
        detail: '我是基于Llama大模型的学习助手，擅长知识讲解和学习方法指导。我可以帮你理解复杂概念，制定学习计划，提高学习效率。',
        icon: '📖',
        category: 'professional',
        unlocked: false,
        model: 'llama',
        modelDesc: 'Llama-3.1-8B Meta AI'
      },
      {
        id: 6,
        name: '创意伙伴小艺',
        description: '富有想象力的创意助手',
        detail: '我是基于Qwen大模型的创意助手，思维活跃，想象力丰富。我可以帮你进行头脑风暴，激发创意灵感，解决创作难题。',
        icon: '🎨',
        category: 'creative',
        unlocked: false,
        model: 'qwen',
        modelDesc: 'Qwen2.5-7B 阿里通义'
      }
    ];
    
    this.setData({
      characterList: defaultCharacters
    });
    this.filterCharacters();
  },

  /**
   * 获取默认图标
   */
  getDefaultIcon(index) {
    const icons = ['🤖', '📚', '🐼', '🌙', '⭐', '🎭', '🎨', '🎵'];
    return icons[index % icons.length];
  },

  /**
   * 筛选变化
   */
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      currentFilter: filter
    });
    this.filterCharacters();
  },

  /**
   * 筛选角色
   */
  filterCharacters() {
    const { characterList, currentFilter } = this.data;
    let filteredCharacters = characterList;
    
    if (currentFilter !== 'all') {
      filteredCharacters = characterList.filter(character => 
        character.category === currentFilter
      );
    }
    
    this.setData({
      filteredCharacters: filteredCharacters
    });
  },

  /**
   * 选择角色
   */
  selectCharacter(e) {
    const character = e.currentTarget.dataset.character;
    this.setData({
      selectedCharacter: character,
      showModal: true
    });
  },

  // 打开个性编辑器
  openCharacterEditor(e) {
    const character = e.currentTarget.dataset.character
    const genderMap = { unknown: 0, male: 1, female: 2 }
    const reverseGender = ['unknown', 'male', 'female']
    const styleMap = {
      default: 0, gentle: 1, professional: 2, creative: 3, humorous: 4, technical: 5, poetic: 6, wise: 7
    }
    const identityMap = {
      assistant: 0, psychologist: 1, teacher: 2, engineer: 3, artist: 4, 'business-consultant': 5, philosopher: 6, writer: 7
    }
    const relationshipMap = { assistant: 0, friend: 1, mentor: 2, colleague: 3 }

    this.setData({
      showEditor: true,
      editingCharacter: character,
      genderIndex: genderMap[character.gender || 'unknown'] || 0,
      styleIndex: styleMap[character.speakingStyle || 'default'] || 0,
      identityIndex: identityMap[character.identity || 'assistant'] || 0,
      relationshipIndex: relationshipMap[character.relationship || 'assistant'] || 0
    })
  },

  closeEditor() {
    this.setData({ showEditor: false })
  },

  onGenderChange(e) {
    this.setData({ genderIndex: Number(e.detail.value) })
  },
  onStyleChange(e) {
    this.setData({ styleIndex: Number(e.detail.value) })
  },
  onIdentityChange(e) {
    this.setData({ identityIndex: Number(e.detail.value) })
  },
  onRelationshipChange(e) {
    this.setData({ relationshipIndex: Number(e.detail.value) })
  },

  // 保存AI个性配置
  async saveCharacterProfile() {
    const reverseGender = ['unknown', 'male', 'female']
    const reverseStyle = ['default', 'gentle', 'professional', 'creative', 'humorous', 'technical', 'poetic', 'wise']
    const reverseIdentity = ['assistant', 'psychologist', 'teacher', 'engineer', 'artist', 'business-consultant', 'philosopher', 'writer']
    const reverseRelationship = ['assistant', 'friend', 'mentor', 'colleague']

    const payload = {
      id: this.data.editingCharacter.id,
      gender: reverseGender[this.data.genderIndex],
      speakingStyle: reverseStyle[this.data.styleIndex],
      identity: reverseIdentity[this.data.identityIndex],
      relationship: reverseRelationship[this.data.relationshipIndex]
    }

    wx.showLoading({ title: '保存中' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'bot-update-profile',
        data: payload
      })
      wx.hideLoading()
      if (res.result && res.result.success) {
        wx.showToast({ title: '已保存', icon: 'success' })
        this.setData({ showEditor: false })
        // 重新加载个性列表
        this.getWelcomePackage()
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  /**
   * 隐藏弹窗
   */
  hideModal() {
    this.setData({
      showModal: false
    });
  },

  // 底部导航栏功能
  navigateToHome() {
    wx.navigateTo({
      url: '/pages/home/home'
    });
  },

  navigateToSettings() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击模态框内容时关闭弹窗
  },

  /**
   * 确认选择角色
   */
  confirmSelect() {
    const { selectedCharacter } = this.data;
    
    if (!selectedCharacter.unlocked) {
      this.unlockCharacter(selectedCharacter.id);
      return;
    }
    
    // 跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?groupId=${selectedCharacter.id}&characterId=${selectedCharacter.id}&characterName=${selectedCharacter.name}`
    });
    
    this.hideModal();
  },

  /**
   * 解锁角色
   */
  unlockCharacter(characterId) {
    // 显示激励视频广告
    this.showRewardedVideoAd(characterId);
  },

  /**
   * 显示激励视频广告
   */
  showRewardedVideoAd(characterId) {
    // 创建激励视频广告实例
    const rewardedVideoAd = wx.createRewardedVideoAd({
      adUnitId: 'adunit-xxxxxxxxxxxxx' // 需要替换为真实的广告位ID
    });

    // 监听广告关闭事件
    rewardedVideoAd.onClose(res => {
      if (res && res.isEnded) {
        // 用户观看完整广告，给予奖励
        this.reportUnlockSuccess(characterId);
      } else {
        // 用户提前关闭广告，不给奖励
        wx.showToast({
          title: '需要观看完整视频才能解锁角色',
          icon: 'none',
          duration: 2000
        });
      }
    });

    // 监听广告错误事件
    rewardedVideoAd.onError(err => {
      console.error('激励视频广告错误:', err);
      wx.showToast({
        title: '广告加载失败，请稍后重试',
        icon: 'none'
      });
    });

    // 显示广告
    rewardedVideoAd.show().catch(err => {
      console.error('显示激励视频广告失败:', err);
      // 如果广告显示失败，可以考虑直接解锁或提示用户
      wx.showModal({
        title: '提示',
        content: '广告暂时无法显示，是否直接解锁该角色？',
        success: (res) => {
          if (res.confirm) {
            this.reportUnlockSuccess(characterId);
          }
        }
      });
    });
  },

  /**
   * 上报解锁成功
   */
  reportUnlockSuccess(characterId) {
    const app = getApp();
    app.cloudCall('user-report-unlock', {
      characterId: characterId
    })
      .then(res => {
        if (res.result.errCode === 0) {
          wx.showToast({
            title: '解锁成功',
            icon: 'success'
          });
          
          // 更新本地数据
          const characterList = this.data.characterList.map(character => {
            if (character.id === characterId) {
              return { ...character, unlocked: true };
            }
            return character;
          });
          
          this.setData({
            characterList: characterList,
            selectedCharacter: { ...this.data.selectedCharacter, unlocked: true }
          });
          
          this.filterCharacters();
        } else {
          wx.showToast({
            title: '解锁失败，请重试',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Error calling user-report-unlock:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
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
    // 页面显示时刷新角色列表
    this.getWelcomePackage();
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
    this.getWelcomePackage();
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
      title: 'AI 心灵伙伴 - 选择你的专属陪伴',
      path: '/pages/select-character/select-character'
    };
  }
})