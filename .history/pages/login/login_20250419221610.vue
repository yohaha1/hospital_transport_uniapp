<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/images/logo.png" mode="aspectFit"></image>
      <text class="title">医院运输管理系统</text>
    </view>
    
    <view class="login-form">
      <view class="input-group">
        <text class="label">用户名</text>
        <input 
          class="input" 
          type="text" 
          v-model="username" 
          placeholder="请输入用户名"
        />
      </view>
      
      <view class="input-group">
        <text class="label">密码</text>
        <input 
          class="input" 
          type="password" 
          v-model="password" 
          placeholder="请输入密码"
        />
      </view>
      
      <button class="login-btn" @click="handleLogin" :loading="loading">登录</button>
    </view>
  </view>
</template>

<script>
import userApi from '@/api/user.js';

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false
    };
  },
  
  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        uni.showToast({
          title: '请输入用户名和密码',
          icon: 'none'
        });
        return;
      }
      
      this.loading = true;
      
      try {
        console.log('开始登录请求...');
        const token = await userApi.login(this.username, this.password);
        console.log('登录成功，获取到token:', token);
        
        if (token) {
          // 保存token
          uni.setStorageSync('token', token);
          
          // 解析token获取用户信息
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            try {
              const payload = JSON.parse(atob(tokenParts[1]));
              // console.log('解析token payload:', payload);
              
              
              const userInfo = {
                id: payload.id, 
                username: payload.sub,
                role: payload.role.replace('ROLE_', '') // 移除ROLE_前缀
              };
              console.log('用户信息:', userInfo);
              
              uni.setStorageSync('userInfo', userInfo);
              
              // 根据用户角色跳转到不同页面
              if (userInfo.role === 'doctor') {
                uni.switchTab({
                  url: '/pages/doctor/task-list/task-list'
                });
              } else if (userInfo.role === 'transporter') {
                uni.switchTab({
                  url: '/pages/transporter/task-pool/task-pool'
                });
              } else {
                throw new Error('未知的用户角色');
              }
            } catch (e) {
              console.error('解析token失败:', e);
              throw new Error('登录失败：无法解析用户信息');
            }
          } else {
            throw new Error('登录失败：无效的token格式');
          }
        } else {
          throw new Error('登录失败：未获取到token');
        }
      } catch (error) {
        console.error('登录错误：', error);
        uni.showToast({
          title: error.message || '登录失败',
          icon: 'none',
          duration: 2000
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>


<style lang="scss">
.login-container {
  min-height: 100vh;
  padding: 60rpx;
  background-color: #f8f8f8;
  
  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 80rpx;
    
    .logo {
      width: 180rpx;
      height: 180rpx;
      margin-bottom: 20rpx;
    }
    
    .title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .login-form {
    background-color: #fff;
    border-radius: 20rpx;
    padding: 40rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
    
    .input-group {
      margin-bottom: 30rpx;
      
      .label {
        display: block;
        font-size: 28rpx;
        color: #666;
        margin-bottom: 10rpx;
      }
      
      .input {
        width: 100%;
        height: 80rpx;
        border: 2rpx solid #ddd;
        border-radius: 8rpx;
        padding: 0 20rpx;
        font-size: 28rpx;
      }
    }
    
    .login-btn {
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      background-color: #007AFF;
      color: #fff;
      font-size: 32rpx;
      border-radius: 44rpx;
      margin-top: 60rpx;
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}
</style> 