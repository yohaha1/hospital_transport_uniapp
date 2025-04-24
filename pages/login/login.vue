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

<script setup>
import { ref } from 'vue'
import userApi from '@/api/user.js'

const username = ref('')
const password = ref('')
const loading = ref(false)

// 微信小程序兼容 Base64URL 解码 JWT payload
function decodeJwtPayload(payload) {
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  try {
    const bytes = wx.base64ToArrayBuffer(base64)
    let str = ''
    const uint8Arr = new Uint8Array(bytes)
    for (let i = 0; i < uint8Arr.length; i++) {
      str += String.fromCharCode(uint8Arr[i])
    }
    return JSON.parse(decodeURIComponent(escape(str)))
  } catch (e) {
    return null
  }
}

const handleLogin = async () => {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const token = await userApi.login(username.value, password.value)
    if (!token) throw new Error('登录失败：未获取到token')
    uni.setStorageSync('token', token)
    
	const tokenParts = token.split('.')
    if (tokenParts.length === 3) {
      const payload = decodeJwtPayload(tokenParts[1])
	  console.log(payload)
      if (!payload) throw new Error('登录失败：无法解析用户信息')
      const basicUserInfo = {
        id: payload.id,
        username: payload.sub,
        role: (payload.role || '').replace('ROLE_', '')
      }
	  
      const userInfo = await userApi.getByUsername(basicUserInfo.username)
      uni.setStorageSync('userInfo', userInfo)
	  console.log("获得用户信息：", userInfo)
	  
      if (userInfo.role === 'doctor' || userInfo.role === 'transporter') {
        uni.switchTab({ url: '/pages/common/task-pool' })
      } else {
        throw new Error('未知的用户角色')
      }
    } else {
      throw new Error('登录失败：无效的token格式')
    }
  } catch (error) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
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