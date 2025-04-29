<template>
  <view class="profile-container">
    <!-- 顶部返回栏可根据需要添加 -->
    <view class="profile-card">
      <view class="avatar-box">
        <image class="avatar" :src="userInfo.avatar || '/static/images/doctor.svg'" mode="aspectFill" />
      </view>
      <view class="user-name">{{ userInfo.name || userInfo.username || '未登录' }}</view>
      <view class="role-badge">{{ roleText }}</view>
      <view class="info-section">
        <view class="info-row"><text class="label">用户ID</text><text class="value">{{ userInfo.userid }}</text></view>
        <view class="info-row"><text class="label">用户名</text><text class="value">{{ userInfo.username }}</text></view>
        <view class="info-row"><text class="label">姓名</text><text class="value">{{ userInfo.name }}</text></view>
        <view class="info-row"><text class="label">联系方式</text><text class="value">{{ userInfo.contact }}</text></view>
        <view class="info-row"><text class="label">科室ID</text><text class="value">{{ userInfo.departmentid }}</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const userInfo = ref({})
const roleText = computed(() => {
  if (userInfo.value.role === 'doctor') return '医生'
  if (userInfo.value.role === 'transporter') return '转运员'
  return userInfo.value.role || ''
})
onMounted(() => {
  userInfo.value = uni.getStorageSync('userInfo') || {}
})
</script>

<style lang="scss">
.profile-container {
  min-height: 100vh;
  background: #f8f8f8;
  .profile-card {
    background: #fff;
    border-radius: 20rpx;
    margin: 40rpx 24rpx 0;
    padding: 0 0 40rpx 0;
    box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.06);

    display: flex;
    flex-direction: column;
    align-items: center;

    .avatar-box {
      margin-top: -50rpx;
      width: 120rpx;
      height: 120rpx;
      border-radius: 50%;
      background: #f5f8ff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6rpx 20rpx rgba(0,122,255,0.12);
      margin-bottom: 16rpx;
    }
    .avatar {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      border: 4rpx solid #fff;
      background: #e6f7ff;
    }
    .user-name {
      font-size: 38rpx;
      font-weight: 600;
      color: #222;
      margin-top: 10rpx;
      margin-bottom: 10rpx;
      text-align: center;
    }
    .role-badge {
      display: inline-block;
      background: linear-gradient(90deg, #007aff 0%, #4fc3f7 100%);
      color: #fff;
      font-size: 26rpx;
      border-radius: 24rpx;
      padding: 4rpx 24rpx;
      margin-bottom: 24rpx;
      box-shadow: 0 2rpx 8rpx rgba(0,122,255,0.08);
    }
    .info-section {
      width: 90%;
      background: #f9fafb;
      border-radius: 12rpx;
      margin-top: 8rpx;
      padding: 24rpx 18rpx;
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 30rpx;
        padding: 14rpx 0;
        border-bottom: 1rpx solid #f2f2f2;
        &:last-child { border-bottom: none; }
        .label {
          color: #888;
          font-weight: 500;
          width: 160rpx;
        }
        .value {
          color: #333;
          font-weight: 400;
          flex: 1;
          text-align: right;
          word-break: break-all;
        }
      }
    }
  }
}
</style>