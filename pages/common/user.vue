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
		
		<!-- 通知图标 -->
	    <view class="notification-bell" @click="showNotifications">
			<view class="badge-wrapper">
			  <uni-icons 
				type="notification" 
				size="32" 
				color="#666"
			  ></uni-icons>
			  <view v-if="hasNewNotification" class="badge-dot"></view>
			</view>
	    </view>
      </view>
	  
	  <!-- 通知弹窗 -->
	  <uni-popup ref="notificationPopup" type="bottom">
	    <view class="notification-popup">
	      <view class="popup-header">
	        <text class="title">系统通知</text>
	        <text class="close" @click="closeNotifications">×</text>
	      </view>
	      <scroll-view class="notification-list" scroll-y>
	        <view 
	          v-for="(item, index) in notifications" 
	          :key="index"
	          class="notification-item"
	        >
	          <view class="notification-header">
	            <text class="type-tag">{{ getNotificationType(item.notification.notificationtype) }}</text>
	            <text class="task-name">{{ item.task.itemname }}</text>
	            <text class="status-tag" :class="getStatusClass(item.task.status)">任务状态：{{ getStatusText(item.task.status) }}</text>
	          </view>
	          <text class="message">{{ item.notification.message }}</text>
	          <view class="notification-footer">
	            <text class="time">{{ formatNotificationTime(item.notification.sendtime) }}</text>
	          </view>
	        </view>
	      </scroll-view>
	    </view>
	  </uni-popup>
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
  
  <tabBar 
    :selectedIndex="selectedTabIndex"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import userApi from '@/api/user.js'

const userInfo = ref({})

const notifications = ref([])
const notificationPopup = ref()
const lastCheckTime = ref(null)

const hasNewNotification = ref(uni.getStorageSync('hasNewNotification') || false)

let notifTimer = null
onMounted(() => {
  loadUserInfo()
  fetchNotifications()
  notifTimer = setInterval(fetchNotifications, 10000)

})

onShow(() => {
  uni.hideTabBar({ animation: false })
})

onUnmounted(() => {
  clearInterval(notifTimer)
})

const roleText = computed(() => {
  const role = userInfo.value.role
  if (role === 'transporter') return '转运员'
  if (role === 'doctor') return '医生'
  return '未登录'
})

// 选中的Tab索引
const selectedTabIndex = computed(() => {
  const role = userInfo.value.role
  if (role === 'doctor') return 2 
  if (role === 'transporter') return 3 
  return 1 
})

// 获取通知方法
const fetchNotifications = async () => {
  if (!userInfo.value.userid) return
  
  try {
    const res = await userApi.getNotifications(userInfo.value.userid)
    notifications.value = res
    // 更新存储状态
    const hasNew = checkNewNotifications(res)
    uni.setStorageSync('hasNewNotification', hasNew)
    hasNewNotification.value = hasNew

  } catch (e) {
    console.error('获取通知失败:', e)
  }
}

// 检查新通知方法
const checkNewNotifications = (notifications) => {
  const storedTime = uni.getStorageSync('notificationLastCheck')
  const checkTime = storedTime ? new Date(storedTime) : null
  
  if (!checkTime) return notifications.length > 0
  return notifications.some(n => 
    new Date(n.notification.sendtime) > checkTime // 使用存储时间
  )
}

// 显示通知弹窗
const showNotifications = () => {
	console.log("通知:",notifications.value)
	
  if (notifications.value.length === 0) {
    uni.showToast({ title: '暂无新通知', icon: 'none' })
    return
  }
  
  // 更新状态并存储
  const now = new Date()
  lastCheckTime.value = now
  uni.setStorageSync('notificationLastCheck', now) 
  uni.setStorageSync('hasNewNotification', false)
  
  // console.log("通知时间：",new Date(notifications.value[0].notification.sendtime),"上一次查看时间: ",new Date(lastCheckTime.value))
  uni.$emit('notification-status-update', false)

  notificationPopup.value.open()
}

const closeNotifications = () => {
  notificationPopup.value.close()
}

// 新增时间格式化方法
const formatNotificationTime = (time) => {
  const date = new Date(time)
  return `${date.getMonth()+1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

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


// 状态类型映射
const getNotificationType = (type) => {
  const typeMap = {
    'TASK_CANCELLED': '任务取消',
    'TASK_ASSIGNED': '任务分配',
    'TASK_COMPLETED': '任务完成'
  }
  return typeMap[type] || '系统通知'
}

// 状态样式和文本
const getStatusClass = (status) => {
  return {
    'NEW': 'status-new',
    'TRANSPORTING': 'status-transporting',
    'CANCELED': 'status-canceled',
    'COMPLETED': 'status-completed'
  }[status]
}

const getStatusText = (status) => {
  const statusMap = {
    'NEW': '待处理',
    'TRANSPORTING': '运送中',
    'CANCELED': '已取消',
    'COMPLETED': '已完成'
  }
  return statusMap[status] || status
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
.notification-bell {
  position: relative;
  margin-left: auto;
  padding: 0 16rpx;
  
  .icon-bell {
    font-size: 48rpx;
    color: #666;
  }
  
  .badge {
    position: absolute;
    top: -6rpx;
    right: 6rpx;
    width: 20rpx;
    height: 20rpx;
    background: #ff3b30;
    border-radius: 50%;
    border: 2rpx solid #fff;
  }
}
.badge-wrapper {
  position: relative;
  display: inline-block;
  animation: pulse 1.5s infinite;
  @keyframes pulse {
    0% { transform: scale(0.95); }
    50% { transform: scale(1.1); }
    100% { transform: scale(0.95); }
  }
  .badge-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
    background: #ff3b30;
    border-radius: 50%;
    border: 2px solid #fff;
    z-index: 1;
  }
}
// 通知弹窗样式
.notification-popup {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  padding-bottom: 500rpx;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #eee;
    
    .title {
      font-size: 36rpx;
      font-weight: bold;
    }
    
    .close {
      font-size: 48rpx;
      color: #999;
      padding: 0 20rpx;
    }
  }
  
  .notification-list {
    padding: 0 30rpx;
    max-height: 60vh;
    overflow-y: auto;
    .notification-item {
      padding: 30rpx 0;
      border-bottom: 1rpx solid #f5f5f5;
      
      .message {
        display: block;
        font-size: 30rpx;
        color: #333;
        margin-bottom: 10rpx;
      }
      
      .time {
        font-size: 24rpx;
        color: #999;
      }
    }
    
    .empty {
      text-align: center;
      color: #999;
      padding: 40rpx;
      font-size: 28rpx;
    }
  }
}

.notification-item {
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  
  .notification-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    
    .type-tag {
      background: #f0f0f0;
      color: #666;
      padding: 4rpx 12rpx;
      border-radius: 6rpx;
      font-size: 24rpx;
      margin-right: 15rpx;
    }
    
    .task-name {
      font-weight: bold;
      color: #333;
      margin-right: 15rpx;
    }
    
    .status-tag {
      font-size: 24rpx;
      padding: 4rpx 12rpx;
      border-radius: 6rpx;
      
      &.status-new {
        background: #e6f7ff;
        color: #1890ff;
      }
      &.status-transporting {
        background: #fff7e6;
        color: #fa8c16;
      }
      &.status-canceled {
        background: #fff1f0;
        color: #f5222d;
      }
      &.status-completed {
        background: #f6ffed;
        color: #52c41a;
      }
    }
  }
  
  .message {
    display: block;
    font-size: 28rpx;
    color: #666;
    margin-bottom: 15rpx;
  }
  
  .notification-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .time {
      font-size: 24rpx;
      color: #999;
    }
  }
}
</style> 