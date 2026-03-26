// 如果您想使用云托管，请在此处填写您的微信云托管服务环境 ID
const CLOUD_ENV_ID = 'your-cloud-env-id'; // 替换为真实的云环境ID (env-xxxxx)
// 云托管的服务名
const CLOUD_SERVICE_NAME = 'flask-backend';

// 保留本地测试地址（用于尚未部署云托管时在浏览器或开发者工具中 fallback 测试）
const BASE_URL = 'http://127.0.0.1:8000';

// 标记云开发是否已初始化
let isCloudInit = false;

const initCloud = () => {
    if (typeof wx !== 'undefined' && wx.cloud && !isCloudInit) {
        wx.cloud.init({
            env: CLOUD_ENV_ID,
            traceUser: true,
        });
        isCloudInit = true;
    }
};

const request = (method, endpoint, data = {}, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    let token = '';
    try {
        token = wx.getStorageSync('token');
    } catch (e) {
        console.log('获取 token 失败', e);
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-WX-SERVICE': CLOUD_SERVICE_NAME
    };

    // Polyfill 适配无 wx 对象环境
    if (typeof wx === 'undefined') {
      console.log(`Mock请求发起至 ${BASE_URL}${endpoint}`);
      resolve({ status: "mocked" });
      return;
    }

    // 优先尝试使用微信云托管发起内网调用（安全、无需备案域名）
    if (wx.cloud && CLOUD_ENV_ID !== 'your-cloud-env-id') {
        initCloud();
        wx.cloud.callContainer({
            config: {
                env: CLOUD_ENV_ID,
            },
            path: endpoint,
            header: headers,
            method: method,
            data: data,
            timeout: timeout,
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else if (res.statusCode === 401) {
                    console.error('云托管访问未授权');
                    reject(res);
                } else {
                    reject(res);
                }
            },
            fail: (err) => {
                console.error("云托管调用失败，检查配置", err);
                reject(err);
            }
        });
    } else {
        // Fallback: 传统 HTTPS/HTTP 网络请求（走外网或本地测试）
        wx.request({
            url: `${BASE_URL}${endpoint}`,
            method: method,
            data: data,
            header: headers,
            timeout: timeout,
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(res.data);
                } else if (res.statusCode === 401) {
                    console.error('网络访问未授权');
                    reject(res);
                } else {
                reject(res);
                }
            },
            fail: (err) => {
                console.error("网络请求失败", err);
                reject(err);
            }
        });
    }
  });
};

const api = {
  get: (endpoint, data, timeout) => request('GET', endpoint, data, timeout),
  post: (endpoint, data, timeout) => request('POST', endpoint, data, timeout),
  put: (endpoint, data, timeout) => request('PUT', endpoint, data, timeout),
  delete: (endpoint, data, timeout) => request('DELETE', endpoint, data, timeout)
};

export default api;
