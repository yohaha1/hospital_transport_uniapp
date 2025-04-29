<template>
  <view class="user-container">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info">
        <image class="avatar" :src="userInfo.avatar || '/static/images/doctor.svg'" mode="aspectFill"></image>
        <view class="info">
          <text class="name">{{ userInfo.name || '未登录' }}</text>
          <text class="role">{{ roleText }}</text>
        </view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-item" @click="navigateTo('/pages/common/profile')">
        <text class="iconfont icon-user"></text>
        <text class="title">个人信息</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="navigateTo('/pages/common/change-password')">
        <text class="iconfont icon-lock"></text>
        <text class="title">修改密码</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="navigateTo('/pages/common/about')">
        <text class="iconfont icon-info"></text>
        <text class="title">关于我们</text>
        <text class="arrow">></text>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-btn" @click="handleLogout">
      <text>退出登录</text>
    </view>
  </view>
  
  <tabBar :selectedIndex="selectedTabIndex" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

// 响应式用户信息
const userInfo = ref({})

// 角色文本
const roleText = computed(() => {
  const role = userInfo.value.role
  if (role === 'transporter') return '转运员'
  if (role === 'doctor') return '医生'
  return '未登录'
})

// 选中的Tab索引（和tabBar的顺序保持一致）
const selectedTabIndex = computed(() => {
  const role = userInfo.value.role
  if (role === 'doctor') return 2 // 我的在第3个
  if (role === 'transporter') return 3 // 我的在第4个
  return 1 // 其它情况
})

function loadUserInfo() {
  const info = uni.getStorageSync('userInfo')
  if (info) userInfo.value = info
}

function navigateTo(url) {
  uni.navigateTo({ url })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync('userInfo')
        uni.reLaunch({ url: '/pages/login/login' })
      }
    }
  })
}

// 页面展示时加载用户信息并隐藏原生TabBar
onShow(() => {
  loadUserInfo()
  uni.hideTabBar({ animation: false })
})

// 页面初次加载时同步一次
onMounted(() => {
  loadUserInfo()
})
</script>

<style lang="scss">
.user-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;

  .user-card {
    background-color: #fff;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    .user-info {
      display: flex;
      align-items: center;

      .avatar {
        width: 120rpx;
        height: 120rpx;
        border-radius: 50%;
        margin-right: 20rpx;
      }

      .info {
        display: flex;
        flex-direction: column;

        .name {
          font-size: 36rpx;
          font-weight: bold;
          color: #333;
          margin-bottom: 10rpx;
        }

        .role {
          font-size: 28rpx;
          color: #666;
        }
      }
    }
  }

  .menu-list {
    background-color: #fff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;

    .menu-item {
      display: flex;
      align-items: center;
      padding: 30rpx;
      border-bottom: 1rpx solid #f5f5f5;

      &:last-child {
        border-bottom: none;
      }

      .iconfont {
        font-size: 40rpx;
        color: #007AFF;
        margin-right: 20rpx;
      }

      .title {
        flex: 1;
        font-size: 32rpx;
        color: #333;
      }

      .arrow {
        font-size: 32rpx;
        color: #999;
      }
    }
  }

  .logout-btn {
    background-color: #fff;
    border-radius: 16rpx;
    padding: 30rpx;
    text-align: center;
    color: #ff3b30;
    font-size: 32rpx;
  }
}
</style> 