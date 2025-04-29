// const BASE_URL = 'http://localhost:8080'; // 后端接口基础URL
const BASE_URL = 'https://test-159055-8-1312603417.sh.run.tcloudbase.com:8080';

// 请求拦截器
const requestInterceptor = (config) => {
  console.log('请求配置:', config);
  const token = uni.getStorageSync('token');
  if (token) {
    config.header = {
      ...config.header,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
};

// 响应拦截器
const responseInterceptor = (response) => {
  console.log('响应数据:', response);
  
  // 处理401未授权
  if (response.statusCode === 401) {
    uni.removeStorageSync('token');
    uni.removeStorageSync('userInfo');
    uni.reLaunch({
      url: '/pages/login/login'
    });
    return Promise.reject(new Error('未授权，请重新登录'));
  }
  
  // 处理其他错误状态码
  if (response.statusCode !== 200) {
    return Promise.reject(new Error(`请求失败: ${response.data.error}`));
  }
  
  // 处理ApiResponse格式的响应
  const apiResponse = response.data;
  if (apiResponse && typeof apiResponse === 'object') {
    if (apiResponse.success) {
      return apiResponse.data;
    } else {
      return Promise.reject(new Error(apiResponse.error || '请求失败'));
    }
  }
  
  return response.data;
};

// 统一请求方法
const request = (options) => {
  const config = requestInterceptor(options);
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${config.url}`,
      method: config.method || 'GET',
      data: config.data,
      header: {
        ...config.header,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        try {
          resolve(responseInterceptor(res));
        } catch (error) {
          reject(error);
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        reject(new Error('网络请求失败，请检查网络连接'));
      }
    });
  });
};

export default {
  // GET请求
  get(url, config = {}) {
    return request({
      url,
      method: 'GET',
      ...config
    });
  },

  // POST请求
  post(url, data, config = {}) {
    return request({
      url,
      method: 'POST',
      data,
      ...config
    });
  },

  // 上传文件
  upload(url, filePath, formData = {}) {
    return new Promise((resolve, reject) => {
		uni.uploadFile({
		  url: `${BASE_URL}${url}`,
		  filePath,
		  name: 'file',
		  formData,
		  header: {
			'Authorization': `Bearer ${uni.getStorageSync('token')}`
		  },
		  success: (res) => {
			try {
			  let data = res.data;
			  if (typeof data === 'string') {
				try { data = JSON.parse(data); } catch (_) {}
			  }
			  if (res.statusCode >= 200 && res.statusCode < 300) {
				resolve(data);
			  } else {
				reject(new Error((data && data.error) || `文件上传失败: ${res.statusCode}`));
			  }
			} catch (error) {
			  reject(error);
			}
		  },
		  fail: (err) => {
			reject(new Error('文件上传失败，请重试'));
		  }
		});
    });
  }
};