const BASE_URL = 'http://127.0.0.1:8000'; // 默认本地开发测试地址

const request = (method, endpoint, data = {}) => {
  return new Promise((resolve, reject) => {
    let token = '';
    try {
      token = wx.getStorageSync('token');
    } catch (e) {
      console.log('获取 token 失败', e);
    }

    // Polyfill 适配无 wx 对象环境（例如测试脚本）
    if (typeof wx === 'undefined') {
      console.log(`Mock请求发起至 ${BASE_URL}${endpoint}`);
      resolve({ status: "mocked" });
      return;
    }

    wx.request({
      url: `${BASE_URL}${endpoint}`,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
            // 处理未授权，可能需要重新登录
            console.error('访问未授权 (Unauthorized)');
            reject(res);
        } else {
          reject(res);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

const api = {
  get: (endpoint, data) => request('GET', endpoint, data),
  post: (endpoint, data) => request('POST', endpoint, data),
  put: (endpoint, data) => request('PUT', endpoint, data),
  delete: (endpoint, data) => request('DELETE', endpoint, data)
};

export default api;
