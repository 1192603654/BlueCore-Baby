import api from '../../utils/api.js';

Page({
  data: {
    babyName: '',
    selectedDate: '',
    selectedTime: '',
    today: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '添加宝宝' });

    // 初始化默认时间为当前时间
    const now = new Date();
    const d = this.formatDate(now);
    const t = this.formatTime(now);

    this.setData({
      selectedDate: d,
      selectedTime: t,
      today: d
    });
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  onNameInput(e) {
    this.setData({ babyName: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ selectedTime: e.detail.value });
  },

  submitBaby() {
    const name = this.data.babyName.trim();
    if (!name) {
      return wx.showToast({ title: '请输入宝宝名字', icon: 'none' });
    }

    // 拼接成 ISO 时间格式
    const dateTimeStr = `${this.data.selectedDate}T${this.data.selectedTime}:00`;
    const birth_time = new Date(dateTimeStr).toISOString();

    wx.showLoading({ title: '添加中...' });
    api.post('/babies', {
      name: name,
      birth_time: birth_time
    }).then(baby => {
      wx.hideLoading();
      wx.showToast({ title: '宝宝已添加' });

      const app = getApp();

      // 设置回调以更新首页的宝宝列表
      app.babiesReadyCallback = babies => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          const indexPage = pages[pages.length - 2];
          indexPage.setData({
            babies: babies,
            currentBabyId: baby.id // 默认切换到刚添加的新宝宝
          });
          app.globalData.currentBabyId = baby.id;
          if (indexPage.loadRecentRecords) indexPage.loadRecentRecords();
        }
      };

      // 重新从服务器拉取全量宝宝列表
      app.loadBabies();

      setTimeout(() => wx.navigateBack(), 1500);
    }).catch(err => {
      console.error("添加宝宝失败", err);
      wx.hideLoading();
      wx.showToast({ title: '添加失败', icon: 'none' });
    });
  }
});
