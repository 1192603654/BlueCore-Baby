import api from '../../utils/api.js';

Page({
  data: {
    type: '',
    title: '',
    records: []
  },

  onLoad(options) {
    const typeMap = {
      'feed': '喂养',
      'diaper': '尿布',
      'sleep': '睡眠',
      'vaccine': '疫苗'
    };
    const title = typeMap[options.type] || '全部';
    this.setData({
      type: options.type,
      title: title
    });

    wx.setNavigationBarTitle({ title: `${title}历史` });
    this.fetchHistory(options.type);
  },

  formatDateTime(isoString) {
    if (!isoString) return { date: '', time: '' };
    const utcString = isoString.endsWith('Z') ? isoString : isoString + 'Z';
    const dateObj = new Date(utcString);
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const h = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    return {
      date: `${m}-${d}`,
      time: `${h}:${min}`
    };
  },

  fetchHistory(type) {
    const app = getApp();
    const babyId = app.globalData.currentBabyId;
    if (!babyId) return;

    wx.showLoading({ title: '加载中...' });
    api.get(`/records/list/${babyId}?type=${type}`).then(res => {
      const formattedRecords = res.map(item => {
        const timeInfo = this.formatDateTime(item.start_time);
        return {
          ...item,
          date: timeInfo.date,
          time: timeInfo.time
        };
      });
      this.setData({ records: formattedRecords });
    }).catch(err => {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  }
});
