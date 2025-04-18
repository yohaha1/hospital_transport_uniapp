<template>
  <view class="user-container">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info">
        <image class="avatar" :src="userInfo.avatar || '/static/images/default-avatar.png'" mode="aspectFill"></image>
        <view class="info">
          <text class="name">{{ userInfo.name || '未登录' }}</text>
          <text class="role">{{ roleText }}</text>
        </view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-item" @click="navigateTo('/pages/user/profile')">
        <text class="iconfont icon-user"></text>
        <text class="title">个人信息</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="navigateTo('/pages/user/change-password')">
        <text class="iconfont icon-lock"></text>
        <text class="title">修改密码</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @click="navigateTo('/pages/user/about')">
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
</template>

<script>
import { getUserInfo, clearUserInfo } from '@/utils/auth'

export default {
  data() {
    return {
      userInfo: {}
    }
  },
  computed: {
    roleText() {
      const role = this.userInfo.role
      if (role === 'nurse') return '护士'
      if (role === 'transporter') return '转运员'
      return '未登录'
    }
  },
  onShow() {
    this.loadUserInfo()
  },
  methods: {
    loadUserInfo() {
      const userInfo = getUserInfo()
      if (userInfo) {
        this.userInfo = userInfo
      }
    },
    navigateTo(url) {
      uni.navigateTo({
        url
      })
    },
    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            clearUserInfo()
            uni.reLaunch({
              url: '/pages/login/login'
            })
          }
        }
      })
    }
  }
}
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