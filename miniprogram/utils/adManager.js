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
        console.error("加载广告配置失败", err);
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
      this.interstitialAd.onLoad(() => console.log('插屏广告已加载'));
      this.interstitialAd.onError(err => console.error('插屏广告错误', err));
    }

    if (this.config.rewarded_video_ad_id) {
      this.rewardedVideoAd = wx.createRewardedVideoAd({
        adUnitId: this.config.rewarded_video_ad_id
      });
      this.rewardedVideoAd.onLoad(() => console.log('激励视频广告已加载'));
      this.rewardedVideoAd.onError(err => console.error('激励视频广告错误', err));
    }
  }

  checkAndShowInterstitial() {
    if (!this.config || !this.config.show_ads || !this.interstitialAd) return;

    this.recordCount++;
    if (this.recordCount >= this.config.interstitial_frequency) {
      this.interstitialAd.show().catch((err) => {
        console.error("插屏广告展示失败", err);
      });
      this.recordCount = 0; // 重置计数器
    }
  }

  showRewardedVideo(onSuccess, onFail) {
      if (!this.config || !this.config.show_ads || !this.rewardedVideoAd) {
          if (onFail) onFail('广告不可用');
          return;
      }

      this.rewardedVideoAd.show().catch(() => {
          // 失败后尝试重新加载
          this.rewardedVideoAd.load()
              .then(() => this.rewardedVideoAd.show())
              .catch(err => {
                  console.log('激励视频加载失败', err);
                  if (onFail) onFail(err);
              });
      });

      this.rewardedVideoAd.onClose(res => {
          if (res && res.isEnded) {
              // 视频完整播放结束，发放奖励
              if (onSuccess) onSuccess();
          } else {
              // 视频中途关闭
              if (onFail) onFail('用户提前关闭了视频');
          }
          // 移除监听以避免多次触发
          this.rewardedVideoAd.offClose();
      });
  }
}

const adManager = new AdManager();
export default adManager;
