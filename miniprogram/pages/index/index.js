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
      // Wait for app to finish loading babies
      app.babiesReadyCallback = babies => {
        this.setData({
          babies: babies,
          currentBabyId: app.globalData.currentBabyId
        });
        this.loadRecentRecords();
      };
    }

    // Check if ads should be shown
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
    // Navigate to add baby page, mocking creation for now
    wx.showModal({
      title: 'Mock Create Baby',
      content: 'Creating a test baby',
      success: (res) => {
        if (res.confirm) {
          api.post('/babies', { name: "Test Baby" }).then(baby => {
            app.loadBabies(); // Reload babies
            wx.showToast({ title: 'Baby Added' });
          });
        }
      }
    });
  },

  loadRecentRecords: function () {
    // In a real app, fetch records for currentBabyId
    // Mocking recent records
    this.setData({
      lastFeed: { time: '10:30', value: 120, unit: 'ml', sub_type: '母乳' },
      lastDiaper: { time: '09:15', sub_type: '嘘嘘' },
      lastSleep: { time: '08:00', duration: '2小时30分' }
    });
  },

  recordFeed: function () {
    const babyId = this.data.currentBabyId;
    if (!babyId) {
      wx.showToast({ title: 'Please select a baby first', icon: 'none' });
      return;
    }

    adManager.checkAndShowInterstitial();

    api.post('/records', {
      baby_id: babyId,
      type: 'feed',
      sub_type: 'bottle',
      value: 100,
      unit: 'ml'
    }).then(record => {
      wx.showToast({ title: 'Recorded' });
      this.loadRecentRecords();
    });
  },

  recordDiaper: function () {
      // Placeholder for diaper recording
      wx.showToast({ title: 'Record Diaper clicked', icon: 'none' });
  },

  recordSleep: function () {
      // Placeholder for sleep recording
      wx.showToast({ title: 'Record Sleep clicked', icon: 'none' });
  }
});
