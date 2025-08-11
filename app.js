// app.js
App({
  onLaunch() {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud3-8gtjhkakd53d4fdc',
        traceUser: true,
      })
    }

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        if (res.code) {
          this.cloudCall('user-login', { code: res.code })
            .then(res => {
              console.log('🔍 用户登录云函数返回:', res)
              
              // 兼容新旧两种返回格式
              let isSuccess = false
              let loginData = null
              let errorMessage = '登录失败'
              
              if (res.result) {
                // 新格式检查
                if (res.result.success === true) {
                  isSuccess = true
                  loginData = res.result.data
                  errorMessage = res.result.message
                }
                // 旧格式检查  
                else if (res.result.errCode === 0) {
                  isSuccess = true
                  loginData = res.result.data
                  errorMessage = res.result.errMsg
                }
                // 错误处理
                else {
                  errorMessage = res.result.message || res.result.errMsg || '登录失败'
                  console.error('🔥 登录API返回错误:', res.result)
                }
              } else {
                console.error('🔥 登录云函数返回格式错误:', res)
                errorMessage = '服务响应格式错误'
              }
              
              if (isSuccess && loginData) {
                const { openid, user } = loginData
                this.globalData.openid = openid
                this.globalData.user = user
                console.log('✅ 登录成功, 用户信息:', this.globalData.user)
                
                // 由于 login 是异步的，所以在这里设置一个回调函数
                if (this.userInfoReadyCallback) {
                  this.userInfoReadyCallback(loginData)
                }
              } else {
                console.error('❌ 登录失败:', errorMessage)
                wx.showToast({
                  title: errorMessage,
                  icon: 'none',
                  duration: 3000
                })
              }
            })
            .catch(err => {
              console.error('调用云函数 login 失败: ', err)
            })
        } else {
          console.error('登录失败！' + res.errMsg)
        }
      }
    })
  },

  // 封装的云函数调用方法
  cloudCall(name, data = {}) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name,
        data,
        success: res => {
          resolve(res)
        },
        fail: err => {
          reject(err)
        }
      })
    })
  },

  globalData: {
    openid: null,
    user: null
  }
})