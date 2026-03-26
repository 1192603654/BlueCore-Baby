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

const request = (method, endpoint, data = {}, timeout = 10000, enableChunked = false, onChunkReceived = null) => {
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
        const requestTask = wx.cloud.callContainer({
            config: {
                env: CLOUD_ENV_ID,
            },
            path: endpoint,
            header: headers,
            method: method,
            data: data,
            timeout: timeout,
            enableChunked: enableChunked,
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

        if (enableChunked && onChunkReceived && requestTask) {
            requestTask.onChunkReceived(onChunkReceived);
        }
    } else {
        // Fallback: 传统 HTTPS/HTTP 网络请求（走外网或本地测试）
        const requestTask = wx.request({
            url: `${BASE_URL}${endpoint}`,
            method: method,
            data: data,
            header: headers,
            timeout: timeout,
            enableChunked: enableChunked,
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

        if (enableChunked && onChunkReceived && requestTask) {
            requestTask.onChunkReceived(onChunkReceived);
        }
    }
  });
};

const createUtf8Decoder = () => {
    let pendingBytes = []; // 保存上一个 chunk 未解码完的字节

    return (arrayBuffer) => {
        const data = new Uint8Array(arrayBuffer);
        const combined = new Uint8Array(pendingBytes.length + data.length);
        combined.set(pendingBytes);
        combined.set(data, pendingBytes.length);

        let result = '';
        let i = 0;

        while (i < combined.length) {
            let c = combined[i];

            if (c < 128) {
                result += String.fromCharCode(c);
                i++;
            } else if ((c > 191) && (c < 224)) {
                if (i + 1 >= combined.length) break; // 缺少字节，等待下一个 chunk
                let c2 = combined[i + 1];
                result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else if ((c > 223) && (c < 240)) {
                if (i + 2 >= combined.length) break; // 缺少字节
                let c2 = combined[i + 1];
                let c3 = combined[i + 2];
                result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            } else {
                // 简单的 4 字节 Emoji 处理占位（未做代理对处理，仅避免崩溃）
                if (i + 3 >= combined.length) break; // 缺少字节
                result += '?';
                i += 4;
            }
        }

        // 把未处理的字节存下来
        pendingBytes = Array.from(combined.slice(i));
        return result;
    };
};

const api = {
  get: (endpoint, data, timeout) => request('GET', endpoint, data, timeout),
  post: (endpoint, data, timeout) => request('POST', endpoint, data, timeout),
  put: (endpoint, data, timeout) => request('PUT', endpoint, data, timeout),
  delete: (endpoint, data, timeout) => request('DELETE', endpoint, data, timeout),
  stream: (endpoint, data, timeout, onMessage) => {
      const decoder = createUtf8Decoder();
      let buffer = '';

      return request('GET', endpoint, data, timeout, true, (response) => {
          if (onMessage && response.data) {
              const chunkText = decoder(response.data);
              buffer += chunkText;

              // 解析标准的 SSE 数据格式 (data: xxx\n\n)
              let boundary = buffer.indexOf('\n\n');
              while (boundary !== -1) {
                  const message = buffer.slice(0, boundary).trim();
                  buffer = buffer.slice(boundary + 2);

                  if (message.startsWith('data:')) {
                      let dataStr = message.slice(5).trim();
                      if (dataStr === '[DONE]') {
                          // SSE 结束信号
                          return;
                      }
                      try {
                          // 我们现在要求后端返回 JSON 包含 'text' 字段
                          const parsed = JSON.parse(dataStr);
                          if (parsed.text) {
                              onMessage(parsed.text);
                          }
                      } catch (e) {
                          // 解析失败可能是消息被截断或者是纯文本，尝试直接返回纯文本 fallback
                          // 这里的 fallback 会使得不符合严格 JSON 的流也能部分运作
                          if(dataStr.length > 0 && !dataStr.startsWith('{')){
                             onMessage(dataStr);
                          }
                      }
                  }
                  boundary = buffer.indexOf('\n\n');
              }
          }
      });
  }
};

export default api;
