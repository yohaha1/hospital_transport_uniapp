import request from '@/utils/request';

export default {
  // 用户登录
  login(username, password) {
    return request.post('/user/login', {
      username,
      password
    }, {
      header: {
        'Content-Type': 'application/json'
      }
    });
  },

  // 根据用户名获取用户信息
  getByUsername(username) {
    return request.get(`/user/getByUsername/${username}`);
  },
  

  // 添加用户（管理员）
  addUser(user) {
    return request.post('/user/add', user);
  }
};