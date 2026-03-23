import api from './api.js';

class AdManager {
  constructor() {
    this.config = null;
    this.recordCount = 0;
    this.interstitialAd = null;
    this.rewardedVideoAd = null;
  }

  init() {
    this.fetchConfig();
  }

  fetchConfig() {
    return api.get('/config/ads')
      .then(config => {
        this.config = config;
        if (config.show_ads) {
          this.initAds();
        }
        return config;
      })
      .catch(err => {
        console.error("Failed to load ad config", err);
        return { show_ads: false };
      });
  }

  getAdConfig() {
    if (this.config) {
      return Promise.resolve(this.config);
    }
    return this.fetchConfig();
  }

  initAds() {
    if (!wx.createInterstitialAd || !wx.createRewardedVideoAd) return;

    if (this.config.interstitial_ad_id) {
      this.interstitialAd = wx.createInterstitialAd({
        adUnitId: this.config.interstitial_ad_id
      });
      this.interstitialAd.onLoad(() => console.log('Interstitial Ad loaded.'));
      this.interstitialAd.onError(err => console.error('Interstitial Ad error', err));
    }

    if (this.config.rewarded_video_ad_id) {
      this.rewardedVideoAd = wx.createRewardedVideoAd({
        adUnitId: this.config.rewarded_video_ad_id
      });
      this.rewardedVideoAd.onLoad(() => console.log('Rewarded Video Ad loaded.'));
      this.rewardedVideoAd.onError(err => console.error('Rewarded Video Ad error', err));
    }
  }

  checkAndShowInterstitial() {
    if (!this.config || !this.config.show_ads || !this.interstitialAd) return;

    this.recordCount++;
    if (this.recordCount >= this.config.interstitial_frequency) {
      this.interstitialAd.show().catch((err) => {
        console.error("Failed to show interstitial", err);
      });
      this.recordCount = 0; // Reset counter
    }
  }

  showRewardedVideo(onSuccess, onFail) {
      if (!this.config || !this.config.show_ads || !this.rewardedVideoAd) {
          if (onFail) onFail('Ads not available');
          return;
      }

      this.rewardedVideoAd.show().catch(() => {
          // Retry loading if failed
          this.rewardedVideoAd.load()
              .then(() => this.rewardedVideoAd.show())
              .catch(err => {
                  console.log('Reward video load failed', err);
                  if (onFail) onFail(err);
              });
      });

      this.rewardedVideoAd.onClose(res => {
          if (res && res.isEnded) {
              if (onSuccess) onSuccess();
          } else {
              if (onFail) onFail('User closed video before completion');
          }
          // Remove listener to avoid multiple triggers
          this.rewardedVideoAd.offClose();
      });
  }
}

const adManager = new AdManager();
export default adManager;
