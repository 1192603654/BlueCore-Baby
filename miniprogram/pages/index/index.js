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

  recordFeed: function () {
    const babyId = this.data.currentBabyId;
    if (!babyId) {
      wx.showToast({ title: '请先选择或添加一个宝宝', icon: 'none' });
      return;
    }

    // 提供快捷选择菜单，提高交互体验
    wx.showActionSheet({
      itemList: ['亲喂', '瓶喂 90ml', '瓶喂 120ml', '瓶喂 150ml'],
      success: (res) => {
        let subType = 'bottle';
        let value = 0;
        let unit = 'ml';

        if (res.tapIndex === 0) {
            subType = 'breast';
            value = 0;
            unit = '分钟'; // 这里简化，实际情况可能需要秒表
        } else if (res.tapIndex === 1) {
            value = 90;
        } else if (res.tapIndex === 2) {
            value = 120;
        } else if (res.tapIndex === 3) {
            value = 150;
        }

        // 调用广告策略
        adManager.checkAndShowInterstitial();

        api.post('/records', {
          baby_id: babyId,
          type: 'feed',
          sub_type: subType === 'breast' ? '亲喂' : '瓶喂',
          value: value,
          unit: unit
        }).then(record => {
          wx.showToast({ title: '记录成功' });
          this.loadRecentRecords();
        });
      }
    });
  },

  recordDiaper: function () {
      // 记录尿布操作的预留方法
      wx.showToast({ title: '点击了记录尿布', icon: 'none' });
  },

  recordSleep: function () {
      // 记录睡眠操作的预留方法
      wx.showToast({ title: '点击了记录睡眠', icon: 'none' });
  },

  recordVaccine: function () {
    const babyId = this.data.currentBabyId;
    if (!babyId) {
      wx.showToast({ title: '请先选择或添加一个宝宝', icon: 'none' });
      return;
    }

    wx.showActionSheet({
      itemList: ['乙肝疫苗', '卡介苗', '脊灰疫苗', '百白破', '其他 (手动输入)'],
      success: (res) => {
        const items = ['乙肝疫苗', '卡介苗', '脊灰疫苗', '百白破', '其他'];
        let selectedItem = items[res.tapIndex];

        if (selectedItem === '其他') {
            wx.showModal({
                title: '手动输入疫苗',
                editable: true,
                placeholderText: '请输入疫苗名称',
                success: (modalRes) => {
                    if (modalRes.confirm && modalRes.content) {
                        this.submitVaccineRecord(babyId, modalRes.content);
                    }
                }
            });
        } else {
            this.submitVaccineRecord(babyId, selectedItem);
        }
      }
    });
  },

  submitVaccineRecord: function (babyId, subType) {
      api.post('/records', {
          baby_id: babyId,
          type: 'vaccine',
          sub_type: subType,
      }).then(record => {
          wx.showToast({ title: '记录成功' });
          this.loadRecentRecords();
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
