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
    lastVaccine: {},
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
    // 使用带输入框的模态框让用户输入宝宝名称
    wx.showModal({
      title: '添加宝宝',
      content: '',
      editable: true,
      placeholderText: '请输入宝宝名字',
      success: (res) => {
        if (res.confirm && res.content) {
          api.post('/babies', { name: res.content }).then(baby => {
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
        } else if (res.confirm && !res.content) {
            wx.showToast({ title: '名字不能为空', icon: 'none' });
        }
      }
    });
  },

  formatTime(dateString) {
      if (!dateString) return null;
      // 附加 'Z' 表示该时间是 UTC，确保设备浏览器正确转换至本地时区
      const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
      const date = new Date(utcString);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  formatDate(dateString) {
      if (!dateString) return null;
      const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
      const date = new Date(utcString);
      return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  timeAgo(dateString) {
      if (!dateString) return '暂无记录';
      const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
      const date = new Date(utcString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 60) {
          return `${diffMins || 1}分钟前`;
      } else if (diffHours < 24) {
          return `${diffHours}小时前`;
      } else {
          return `${Math.floor(diffHours / 24)}天前`;
      }
  },

  loadRecentRecords: function () {
    const babyId = this.data.currentBabyId;
    if (!babyId) return;

    api.get(`/records/recent/${babyId}`).then(records => {
      this.setData({
        lastFeed: {
            timeAgo: records.feed ? this.timeAgo(records.feed.start_time) : '暂无记录',
            value: records.feed ? records.feed.value : null,
            unit: records.feed ? records.feed.unit : null,
            sub_type: records.feed ? records.feed.sub_type : null
        },
        lastDiaper: {
            timeAgo: records.diaper ? this.timeAgo(records.diaper.start_time) : '暂无记录',
            sub_type: records.diaper ? records.diaper.sub_type : null
        },
        lastSleep: {
            timeAgo: records.sleep ? this.timeAgo(records.sleep.start_time) : '暂无记录',
            duration: records.sleep ? '已睡着' : null
        },
        lastVaccine: {
            timeAgo: records.vaccine ? this.timeAgo(records.vaccine.start_time) : '暂无记录',
            date: records.vaccine ? this.formatDate(records.vaccine.start_time) : null,
            sub_type: records.vaccine ? records.vaccine.sub_type : null
        }
      });
    }).catch(err => {
        console.error("加载记录失败", err);
    });
  },

  navigateToAddRecord: function (e) {
    const babyId = this.data.currentBabyId;
    if (!babyId) {
      wx.showToast({ title: '请先选择或添加一个宝宝', icon: 'none' });
      return;
    }
    const type = e.currentTarget.dataset.type;

    // 调用广告策略
    adManager.checkAndShowInterstitial();

    wx.navigateTo({
      url: `/pages/add_record/add_record?type=${type}`
    });
  },

  goToHistory: function (e) {
      const type = e.currentTarget.dataset.type;
      wx.navigateTo({
          url: `/pages/history/history?type=${type}`
      });
  },

  goToStats: function () {
      wx.navigateTo({
          url: '/pages/stats/stats'
      });
  }
});
