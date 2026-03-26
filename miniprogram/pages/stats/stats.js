import api from '../../utils/api.js';

Page({
  data: {
    selectedDate: '',
    todayDate: '',
    stats: {
      total_feed_ml: 0,
      total_feed_times: 0,
      total_diaper_times: 0
    },
    aiSuggestion: '',
    aiLoading: false
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

    // 移除全局的 wx.showLoading，实现“点击秒进”的无遮挡体验
    // 用户随时可以点击左上角返回或滚动页面

    // 1. 同步获取基础统计数据（毫秒级）
    api.get(`/stats/daily/${babyId}?query_date=${date}`).then(res => {
      this.setData({ stats: res });

      // 2. 异步请求大模型分析建议，只在建议卡片局部显示 Loading，完全不阻塞页面渲染
      this.fetchAISuggestion(babyId, date);

    }).catch(err => {
      console.error(err);
      wx.showToast({ title: '加载统计失败', icon: 'none' });
    });
  },

  fetchAISuggestion(babyId, date) {
    this.setData({ aiLoading: true, aiSuggestion: '' });

    // 使用标准请求，超时放宽到 30000ms 等待大模型生成完成
    api.get(`/stats/ai_suggestion/${babyId}?query_date=${date}`, {}, 30000).then(res => {
        this.setData({
            aiSuggestion: res.ai_suggestion || '暂无建议',
            aiLoading: false
        });
    }).catch(err => {
        console.error('获取 AI 建议失败', err);
        this.setData({
            aiSuggestion: '【智能管家建议】当前网络有点慢，请稍后再试。宝宝每天的饮食排便只要保持规律，就是健康成长的表现哦！',
            aiLoading: false
        });
    });
  }
});
