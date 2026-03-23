const BASE_URL = 'http://127.0.0.1:8000'; // Default to local for testing

const request = (method, endpoint, data = {}) => {
  return new Promise((resolve, reject) => {
    let token = '';
    try {
      token = wx.getStorageSync('token');
    } catch (e) {
      console.log('Error getting token', e);
    }

    // Polyfill for environment without wx object (e.g. testing)
    if (typeof wx === 'undefined') {
      console.log(`Mock request to ${BASE_URL}${endpoint}`);
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
            // Handle unauthorized, maybe re-login
            console.error('Unauthorized access');
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
