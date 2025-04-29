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
          :password="true" 
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
        // setTimeout(() => {
        //   uni.switchTab({ url: '/pages/common/task-pool' });
        // }, 100);
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
html, body, #app {
  height: 100%;
  overflow: hidden; // 阻止页面滚动
}

.login-container {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  width: 100vw;
  height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: transform .5s;
  &:active { transform: scale(0.97); }

  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 48rpx;

    .logo {
      width: 120rpx;
      height: 120rpx;
      margin-bottom: 12rpx;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
    }
    .title {
      font-size: 36rpx;
      font-weight: bold;
      color: #222;
      letter-spacing: 1px;
      margin-top: 2rpx;
      text-shadow: 0 2rpx 6rpx rgba(0,0,0,0.06);
    }
  }

  .login-form {
    background-color: #fff;
    border-radius: 20rpx;
    padding: 38rpx 24rpx 28rpx 24rpx;
    box-shadow: 0 8rpx 36rpx rgba(0,0,0,0.10);
    width: 90vw;
    max-width: 500rpx;
    display: flex;
    flex-direction: column;
    align-items: stretch;

    .input-group {
      margin-bottom: 28rpx;
      .label {
        display: block;
        font-size: 30rpx;
        color: #555;
        margin-bottom: 8rpx;
        font-weight: 500;
        letter-spacing: .5px;
      }
      .input {
        width: 100%;
        height: 86rpx;
        border: 2rpx solid #e6e6e6;
        border-radius: 10rpx;
        padding: 0 18rpx;
        font-size: 29rpx;
        background: #f7f8fa;
        transition: border 0.2s;
        box-sizing: border-box;
      }
      .input:focus {
        border: 2rpx solid #007aff;
        background: #fff;
      }
    }
    .login-btn {
      width: 100%;
      height: 80rpx;
      line-height: 80rpx;
      background: linear-gradient(90deg, #0989fa 0%, #007AFF 100%);
      color: #fff;
      font-size: 30rpx;
      border-radius: 40rpx;
      font-weight: bold;
      letter-spacing: 1.5rpx;
      margin-top: 8rpx;
      box-shadow: 0 2rpx 12rpx rgba(0,122,255,0.07);
      border: none;
      &:active {
        opacity: 0.85;
      }
    }
  }
}
</style>