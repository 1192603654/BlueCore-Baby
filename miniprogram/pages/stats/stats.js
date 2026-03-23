import api from '../../utils/api.js';

Page({
  data: {
    selectedDate: '',
    todayDate: '',
    stats: {
      total_feed_ml: 0,
      total_feed_times: 0,
      total_diaper_times: 0,
      ai_suggestion: ''
    }
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '每日统计' });
    const today = this.getTodayString();
    this.setData({
      selectedDate: today,
      todayDate: today
    });
    this.fetchStats(today);
  },

  getTodayString() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },

  onDateChange(e) {
    const selected = e.detail.value;
    this.setData({ selectedDate: selected });
    this.fetchStats(selected);
  },

  fetchStats(date) {
    const app = getApp();
    const babyId = app.globalData.currentBabyId;
    if (!babyId) {
      wx.showToast({ title: '未选中宝宝', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '统计中...' });
    api.get(`/stats/daily/${babyId}?query_date=${date}`).then(res => {
      this.setData({ stats: res });
    }).catch(err => {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  }
});
