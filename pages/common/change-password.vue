<template>
  <view class="change-pwd-container">
    <view class="header">
      <text class="header-title">修改密码</text>
      <text class="header-subtitle">为保障账户安全，请定期更换密码</text>
    </view>
    <view class="section">
      <view class="input-row">
        <text class="label">原密码</text>
        <input class="input" v-model="oldPwd" type="password" placeholder="请输入原密码" />
      </view>
      <view class="input-row">
        <text class="label">新密码</text>
        <input class="input" v-model="newPwd" type="password" placeholder="请输入新密码" />
      </view>
      <view class="input-row">
        <text class="label">确认新密码</text>
        <input class="input" v-model="confirmPwd" type="password" placeholder="请再次输入新密码" />
      </view>
      <button class="submit-btn" @click="handleChangePwd">确认修改</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import userApi from '@/api/user.js'

const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')

const handleChangePwd = async () => {
  if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    uni.showToast({ title: '两次新密码不一致', icon: 'none' })
    return
  }
  try {
    const userInfo = uni.getStorageSync('userInfo')
    await userApi.changePassword(userInfo.userid, oldPwd.value, newPwd.value)
    uni.showToast({ title: '修改成功，请重新登录', icon: 'success' })
    setTimeout(() => {
      uni.clearStorageSync('userInfo')
      uni.reLaunch({ url: '/pages/login/login' })
    }, 1500)
  } catch (e) {
    uni.showToast({ title: e.message || '修改失败', icon: 'none' })
  }
}
</script>

<style lang="scss">
.change-pwd-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fbff 0%, #f5f5f5 100%);
  padding: 0 0 60rpx 0;

  .header {
    padding-top: 60rpx;
    padding-bottom: 10rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    .header-title {
      font-size: 44rpx;
      font-weight: bold;
      color: #222;
      margin-bottom: 10rpx;
      letter-spacing: 2rpx;
    }
    .header-subtitle {
      font-size: 28rpx;
      color: #8a8a8a;
      margin-bottom: 16rpx;
    }
  }

  .section {
    background: #fff;
    border-radius: 24rpx;
    margin: 24rpx 24rpx 0 24rpx;
    padding: 40rpx 30rpx 36rpx 30rpx;
    box-shadow: 0 6rpx 24rpx 0 rgba(0, 122, 255, 0.06);

    .input-row {
      display: flex;
      align-items: center;
      margin-bottom: 36rpx;
      background: #f7fafd;
      border-radius: 12rpx;
      padding: 10rpx 18rpx;
      .label {
        width: 170rpx;
        color: #666;
        font-size: 30rpx;
        font-weight: 500;
      }
      .input {
        flex: 1;
        font-size: 30rpx;
        padding: 18rpx 16rpx;
        border: none;
        background: transparent;
        outline: none;
      }
    }
    .input-row:last-child {
      margin-bottom: 0;
    }
    .submit-btn {
      margin-top: 24rpx;
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      border-radius: 44rpx;
      background: linear-gradient(90deg, #007aff 0%, #4fc3f7 100%);
      color: #fff;
      font-size: 32rpx;
      font-weight: bold;
      box-shadow: 0 2rpx 16rpx 0 rgba(0, 122, 255, 0.14);
      letter-spacing: 2rpx;
      border: none;
    }
  }
}
</style>