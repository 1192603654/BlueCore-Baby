import api from '../../utils/api.js';

Page({
  data: {
    type: '',
    title: '',
    selectedDate: '',
    selectedTime: '',
    today: '',
    // 喂养表单
    feedType: 'bottle', // bottle | breast
    feedAmount: '',
    feedDuration: '',
    // 尿布表单
    diaperTypes: ['干爽', '嘘嘘', '便便', '混合'],
    diaperIndex: 0,
    // 睡眠表单
    sleepDuration: '',
    // 疫苗表单
    vaccineName: ''
  },

  onLoad(options) {
    const typeMap = {
      'feed': '喂养',
      'diaper': '尿布',
      'sleep': '睡眠',
      'vaccine': '疫苗'
    };

    // 初始化默认时间为当前时间
    const now = new Date();
    const d = this.formatDate(now);
    const t = this.formatTime(now);

    this.setData({
      type: options.type,
      title: typeMap[options.type] || '',
      selectedDate: d,
      selectedTime: t,
      today: d
    });

    wx.setNavigationBarTitle({ title: `记录${this.data.title}` });
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

  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ selectedTime: e.detail.value });
  },

  onFeedTypeChange(e) {
    this.setData({ feedType: e.detail.value, feedAmount: '', feedDuration: '' });
  },

  onAmountInput(e) {
    this.setData({ feedAmount: e.detail.value });
  },

  onDurationInput(e) {
    this.setData({ feedDuration: e.detail.value });
  },

  onDiaperChange(e) {
    this.setData({ diaperIndex: e.detail.value });
  },

  onSleepInput(e) {
    this.setData({ sleepDuration: e.detail.value });
  },

  onVaccineInput(e) {
    this.setData({ vaccineName: e.detail.value });
  },

  submitRecord() {
    const app = getApp();
    const babyId = app.globalData.currentBabyId;
    if (!babyId) {
      wx.showToast({ title: '未选中宝宝', icon: 'none' });
      return;
    }

    const { type, selectedDate, selectedTime } = this.data;
    // 拼接并转换为本地时间对应的 ISO 字符串发送给后端
    const dateTimeStr = `${selectedDate}T${selectedTime}:00`;
    const start_time = new Date(dateTimeStr).toISOString();

    let payload = {
      baby_id: babyId,
      type: type,
      start_time: start_time
    };

    if (type === 'feed') {
      if (this.data.feedType === 'bottle') {
        if (!this.data.feedAmount) return wx.showToast({ title: '请输入奶量', icon: 'none' });
        payload.sub_type = '瓶喂';
        payload.value = parseFloat(this.data.feedAmount);
        payload.unit = 'ml';
      } else {
        if (!this.data.feedDuration) return wx.showToast({ title: '请输入时长', icon: 'none' });
        payload.sub_type = '亲喂';
        payload.value = this.data.feedAmount ? parseFloat(this.data.feedAmount) : 0; // 预估奶量或0
        payload.unit = 'ml';
        payload.note = `时长: ${this.data.feedDuration} 分钟`; // 借助 note 字段存时长
      }
    } else if (type === 'diaper') {
      payload.sub_type = this.data.diaperTypes[this.data.diaperIndex];
    } else if (type === 'sleep') {
      if (!this.data.sleepDuration) return wx.showToast({ title: '请输入时长', icon: 'none' });
      payload.sub_type = '日常睡眠';
      payload.note = `时长: ${this.data.sleepDuration} 分钟`;
    } else if (type === 'vaccine') {
      if (!this.data.vaccineName) return wx.showToast({ title: '请输入疫苗名称', icon: 'none' });
      payload.sub_type = this.data.vaccineName;
    }

    wx.showLoading({ title: '保存中...' });
    api.post('/records', payload).then(res => {
      wx.hideLoading();
      wx.showToast({ title: '保存成功' });
      // 触发上一页的刷新
      const pages = getCurrentPages();
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2];
        if (prevPage.loadRecentRecords) prevPage.loadRecentRecords();
      }
      setTimeout(() => wx.navigateBack(), 1500);
    }).catch(err => {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
