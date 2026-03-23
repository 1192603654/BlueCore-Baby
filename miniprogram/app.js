import adManager from './utils/adManager.js';
import api from './utils/api.js';

App({
  onLaunch: function () {
    // Check local storage for token
    const token = wx.getStorageSync('token');

    // Initialize Ad Manager
    adManager.init();

    if (token) {
      this.globalData.token = token;
      // Load user's babies
      this.loadBabies();
    } else {
      this.login();
    }
  },

  login: function () {
    wx.login({
      success: res => {
        // Send res.code to backend to get token
        api.post('/auth/login', { code: res.code })
          .then(data => {
            wx.setStorageSync('token', data.token);
            this.globalData.token = data.token;
            this.loadBabies();
          })
          .catch(err => {
            console.error("Login failed", err);
          });
      }
    });
  },

  loadBabies: function () {
    api.get('/babies')
      .then(babies => {
        this.globalData.babies = babies;

        // Ensure a current baby is selected if babies exist
        if (babies.length > 0 && !this.globalData.currentBabyId) {
            this.globalData.currentBabyId = babies[0].id;
        } else if (babies.length === 0) {
            // Need to create a baby first for the flow. Mocking it here for test flow if empty.
            console.log("No babies found, should redirect to create baby page in real app.");
        }

        // Notify pages that babies are loaded
        if (this.babiesReadyCallback) {
          this.babiesReadyCallback(babies);
        }
      })
      .catch(err => {
        console.error("Failed to load babies", err);
      });
  },

  globalData: {
    token: null,
    babies: [],
    currentBabyId: null,
  }
})
