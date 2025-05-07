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
  
  changePassword(userid, oldPwd, newPwd){
	  return request.post('/user/changePassword',
	   {
		   userId:userid,
		   oldPassword:oldPwd,
		   newPassword:newPwd
	   })
  },
  
  //获取运送员数量以及运送中的运送员数量
  getFreeTransCount() {
	  return request.get('/user/getFreeTransCount');
  },
  
  //获取通知
  getNotifications(userId){
  	  return request.get(`/user/getNotifications/${userId}`);
  },
};