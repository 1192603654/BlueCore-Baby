import adManager from './utils/adManager.js';
import api from './utils/api.js';

App({
  onLaunch: function () {
    // 检查本地缓存中的 token
    const token = wx.getStorageSync('token');

    // 初始化广告管理器
    adManager.init();

    if (token) {
      this.globalData.token = token;
      // 加载用户的宝宝列表
      this.loadBabies();
    } else {
      this.login();
    }
  },

  login: function () {
    wx.login({
      success: res => {
        // 发送 res.code 到后端换取 token
        api.post('/auth/login', { code: res.code })
          .then(data => {
            wx.setStorageSync('token', data.token);
            this.globalData.token = data.token;
            this.loadBabies();
          })
          .catch(err => {
            console.error("登录失败", err);
          });
      }
    });
  },

  loadBabies: function () {
    api.get('/babies')
      .then(babies => {
        this.globalData.babies = babies;

        // 如果有宝宝，确保选中当前宝宝
        if (babies.length > 0 && !this.globalData.currentBabyId) {
            this.globalData.currentBabyId = babies[0].id;
        } else if (babies.length === 0) {
            // 需要先创建一个宝宝以跑通流程。由于是测试，这里仅做日志记录。
            console.log("未找到宝宝，在真实应用中应跳转至创建宝宝页面。");
        }

        // 通知页面宝宝列表已加载完毕
        if (this.babiesReadyCallback) {
          this.babiesReadyCallback(babies);
        }
      })
      .catch(err => {
        console.error("获取宝宝列表失败", err);
      });
  },

  globalData: {
    token: null,
    babies: [],
    currentBabyId: null,
  }
})
