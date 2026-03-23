import api from '../../utils/api.js';
import adManager from '../../utils/adManager.js';

const app = getApp();

Page({
  data: {
    babies: [],
    currentBabyId: null,
    lastFeed: {},
    lastDiaper: {},
    lastSleep: {},
    showAd: false
  },

  onLoad: function () {
    if (app.globalData.babies && app.globalData.babies.length > 0) {
      this.setData({
        babies: app.globalData.babies,
        currentBabyId: app.globalData.currentBabyId
      });
      this.loadRecentRecords();
    } else {
      // 等待 app.js 完成宝宝加载
      app.babiesReadyCallback = babies => {
        this.setData({
          babies: babies,
          currentBabyId: app.globalData.currentBabyId
        });
        this.loadRecentRecords();
      };
    }

    // 检查是否应该展示广告
    adManager.getAdConfig().then(config => {
      this.setData({ showAd: config.show_ads });
    });
  },

  switchBaby: function (e) {
    const id = e.currentTarget.dataset.id;
    app.globalData.currentBabyId = id;
    this.setData({ currentBabyId: id });
    this.loadRecentRecords();
  },

  addBaby: function () {
    // 跳转到添加宝宝页面，这里使用模态框模拟创建流程
    wx.showModal({
      title: '模拟创建宝宝',
      content: '正在创建一个测试宝宝',
      success: (res) => {
        if (res.confirm) {
          api.post('/babies', { name: "测试宝宝" }).then(baby => {
            // 设置回调以更新当前页面的宝宝列表
            app.babiesReadyCallback = babies => {
              this.setData({
                babies: babies,
                currentBabyId: app.globalData.currentBabyId
              });
              this.loadRecentRecords();
            };
            app.loadBabies(); // 重新加载宝宝
            wx.showToast({ title: '宝宝已添加' });
          });
        }
      }
    });
  },

  loadRecentRecords: function () {
    // 真实应用中应根据 currentBabyId 从后端获取记录
    // 这里使用模拟数据展示最近状态
    this.setData({
      lastFeed: { time: '10:30', value: 120, unit: 'ml', sub_type: '母乳' },
      lastDiaper: { time: '09:15', sub_type: '嘘嘘' },
      lastSleep: { time: '08:00', duration: '2小时30分' }
    });
  },

  recordFeed: function () {
    const babyId = this.data.currentBabyId;
    if (!babyId) {
      wx.showToast({ title: '请先选择或添加一个宝宝', icon: 'none' });
      return;
    }

    // 调用广告策略
    adManager.checkAndShowInterstitial();

    api.post('/records', {
      baby_id: babyId,
      type: 'feed',
      sub_type: 'bottle',
      value: 100,
      unit: 'ml'
    }).then(record => {
      wx.showToast({ title: '记录成功' });
      this.loadRecentRecords();
    });
  },

  recordDiaper: function () {
      // 记录尿布操作的预留方法
      wx.showToast({ title: '点击了记录尿布', icon: 'none' });
  },

  recordSleep: function () {
      // 记录睡眠操作的预留方法
      wx.showToast({ title: '点击了记录睡眠', icon: 'none' });
  }
});
