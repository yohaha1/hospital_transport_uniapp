<template>
  <view class="active-task">
    <template v-if="currentTask">
      <!-- 任务状态 -->
      <view class="status-section">
        <view class="status-card">
          <view class="status-header">
            <view class="left">
              <text class="type-tag">{{ currentTask.itemType }}</text>
              <text class="item-name">{{ currentTask.itemName }}</text>
            </view>
            <text class="priority-tag" :class="getPriorityClass(currentTask.priority)">
              {{ getPriorityText(currentTask.priority) }}
            </text>
          </view>
          <view class="status-info">
            <text class="status-text">{{ getStatusText(currentTask.status) }}</text>
            <text class="time-text">{{ formatTime(currentTask.startTime) }}</text>
          </view>
        </view>
      </view>
      <!-- 节点进度 -->
      <view class="progress-section">
        <view class="section-title">运送进度</view>
        <view class="node-list">
          <view 
            class="node-item"
            v-for="(node, index) in currentTask.nodes"
            :key="index"
            :class="{
              'completed': node.status === 'COMPLETED',
              'current': node.status === 'PROCESSING'
            }"
          >
            <view class="node-line" v-if="index > 0"></view>
            <view class="node-dot"></view>
            <view class="node-info">
              <text class="department">{{ node.department }}</text>
              <text class="time">预计{{ node.expectedTime }}</text>
              <text class="status">{{ getNodeStatusText(node.status) }}</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 操作区域 -->
      <view class="action-section">
        <template v-if="currentTask.status === 'ACCEPTED'">
          <button class="action-btn primary" @click="handleStartTask">
            开始运送
          </button>
        </template>
        <template v-if="currentTask.status === 'PROCESSING'">
          <button class="action-btn primary" @click="handleHandover">
            交接确认
          </button>
        </template>
      </view>
    </template>
    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <image src="/static/images/empty.png" mode="aspectFit"></image>
      <text>暂无进行中的任务</text>
      <button class="nav-btn" @click="navigateToTaskPool">
        去接单
      </button>
    </view>
    <!-- 扫码确认弹窗 -->
    <uni-popup ref="qrCodePopup" type="center">
      <view class="qr-popup">
        <view class="popup-header">
          <text class="title">扫码确认</text>
          <text class="close-btn" @click="closeQrCodePopup">×</text>
        </view>
        <view class="popup-content">
          <view class="camera-box">
            <camera 
              device-position="back" 
              flash="auto" 
              @scancode="handleScanCode"
            ></camera>
          </view>
          <text class="tip-text">请扫描交接点的确认二维码</text>
        </view>
      </view>
    </uni-popup>
    <!-- 拍照确认弹窗 -->
    <uni-popup ref="photoPopup" type="center">
      <view class="photo-popup">
        <view class="popup-header">
          <text class="title">拍照确认</text>
          <text class="close-btn" @click="closePhotoPopup">×</text>
        </view>
        <view class="popup-content">
          <view class="camera-box">
            <camera 
              v-if="!tempPhotoPath"
              device-position="back" 
              flash="auto"
              @takePhoto="handleTakePhoto"
            ></camera>
            <image 
              v-else 
              :src="tempPhotoPath" 
              mode="aspectFit"
            ></image>
          </view>
          <view class="btn-group">
            <button 
              class="photo-btn" 
              v-if="!tempPhotoPath"
              @click="takePhoto"
            >拍照</button>
            <button 
              class="photo-btn" 
              v-else
              @click="retakePhoto"
            >重拍</button>
            <button 
              class="photo-btn confirm" 
              v-if="tempPhotoPath"
              @click="confirmPhoto"
            >确认</button>
          </view>
        </view>
      </view>
    </uni-popup>
  <tabBar :selectedIndex = "1"/>
  </view>
  
</template>

<script setup>
import { ref, onMounted } from 'vue'
import taskApi from '@/api/task.js'

const currentTask = ref(null)
const tempPhotoPath = ref('')
const qrCodeData = ref('')
const actionType = ref('') // 'start' or 'handover'

const qrCodePopup = ref(null)
const photoPopup = ref(null)

// 加载当前任务
const loadCurrentTask = async () => {
  try {
    const userInfo = uni.getStorageSync('userInfo')
    // 演示数据，实际请用 await taskApi.getActiveTask(userInfo.id)
    currentTask.value = {
      id: 1,
      itemName: '药品样本',
      itemType: '药品',
      priority: 'urgent',
      status: 'ACCEPTED',
      startTime: new Date().getTime(),
      nodes: [
        {
          department: '内科',
          expectedTime: '10:00',
          status: 'COMPLETED'
        },
        {
          department: '检验科',
          expectedTime: '10:30',
          status: 'PROCESSING'
        },
        {
          department: '药房',
          expectedTime: '11:00',
          status: 'PENDING'
        }
      ]
    }
  } catch (error) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  }
}

// 开始任务
const handleStartTask = async () => {
  actionType.value = 'start'
  openQrCodePopup()
}

// 任务交接
const handleHandover = async () => {
  actionType.value = 'handover'
  openQrCodePopup()
}

// 处理扫码结果
const handleScanCode = async (e) => {
  qrCodeData.value = e.detail.result
  closeQrCodePopup()
  openPhotoPopup()
}

// 拍照处理
const takePhoto = () => {
  // 兼容uni-app camera组件，需在真机环境下使用
  // #ifdef MP-WEIXIN
  const ctx = uni.createCameraContext()
  ctx.takePhoto({
    quality: 'normal',
    success: (res) => {
      tempPhotoPath.value = res.tempImagePath
    }
  })
  // #endif
}

const retakePhoto = () => {
  tempPhotoPath.value = ''
}

// 确认照片并提交
const confirmPhoto = async () => {
  try {
    const userInfo = uni.getStorageSync('userInfo')
    if (actionType.value === 'start') {
      await taskApi.startTask(
        currentTask.value.id,
        userInfo.id,
        tempPhotoPath.value,
        qrCodeData.value
      )
    } else {
      await taskApi.handOverTask(
        currentTask.value.id,
        userInfo.id,
        (currentTask.value.currentNode && currentTask.value.currentNode.departmentId) || '',
        tempPhotoPath.value,
        qrCodeData.value
      )
    }
    uni.showToast({
      title: actionType.value === 'start' ? '任务开始' : '交接成功',
      icon: 'success'
    })
    // 重新加载任务状态
    loadCurrentTask()
    // 清理临时数据
    tempPhotoPath.value = ''
    qrCodeData.value = ''
    closePhotoPopup()
  } catch (error) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    })
  }
}

// 弹窗控制
const openQrCodePopup = () => {
  qrCodePopup.value.open()
}
const closeQrCodePopup = () => {
  qrCodePopup.value.close()
}
const openPhotoPopup = () => {
  photoPopup.value.open()
}
const closePhotoPopup = () => {
  photoPopup.value.close()
  setTimeout(() => {
    tempPhotoPath.value = ''
  }, 200)
}

// 页面导航
const navigateToTaskPool = () => {
  uni.switchTab({
    url: '/pages/transporter/task-pool/task-pool'
  })
}

// 工具方法
const getPriorityClass = (priority) => {
  const classes = {
    normal: 'priority-normal',
    urgent: 'priority-urgent',
    critical: 'priority-critical'
  }
  return classes[priority] || ''
}
const getPriorityText = (priority) => {
  const texts = {
    normal: '普通',
    urgent: '紧急',
    critical: '特急'
  }
  return texts[priority] || ''
}
const getStatusText = (status) => {
  const texts = {
    ACCEPTED: '待开始',
    PROCESSING: '运送中',
    COMPLETED: '已完成'
  }
  return texts[status] || ''
}
const getNodeStatusText = (status) => {
  const texts = {
    PENDING: '待到达',
    PROCESSING: '进行中',
    COMPLETED: '已完成'
  }
  return texts[status] || ''
}
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const pad = n => n < 10 ? '0' + n : n
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

onMounted(() => {
  loadCurrentTask()
})
</script>

<style lang="scss">
.active-task {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 200rpx;
  padding: 30rpx;
  
  .status-section {
    margin-bottom: 30rpx;
	
    
    .status-card {
      background-color: #fff;
      border-radius: 20rpx;
      padding: 30rpx;
      
      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20rpx;
        
        .left {
          display: flex;
          align-items: center;
          
          .type-tag {
            padding: 4rpx 12rpx;
            background-color: #e6f7ff;
            color: #1890ff;
            border-radius: 4rpx;
            font-size: 24rpx;
            margin-right: 16rpx;
          }
          
          .item-name {
            font-size: 32rpx;
            font-weight: bold;
            color: #333;
          }
        }
        
        .priority-tag {
          padding: 4rpx 12rpx;
          border-radius: 4rpx;
          font-size: 24rpx;
          
          &.priority-normal {
            background-color: #f6ffed;
            color: #52c41a;
          }
          
          &.priority-urgent {
            background-color: #fff7e6;
            color: #fa8c16;
          }
          
          &.priority-critical {
            background-color: #fff1f0;
            color: #f5222d;
          }
        }
      }
      
      .status-info {
        display: flex;
        align-items: center;
        
        .status-text {
          font-size: 36rpx;
          font-weight: bold;
          color: #007AFF;
          margin-right: 20rpx;
        }
        
        .time-text {
          font-size: 24rpx;
          color: #999;
        }
      }
    }
  }
  
  .progress-section {
    background-color: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 30rpx;
    }
    
    .node-list {
      position: relative;
      
      .node-item {
        position: relative;
        display: flex;
        align-items: flex-start;
        padding-bottom: 40rpx;
        
        .node-line {
          position: absolute;
          left: 19rpx;
          top: -40rpx;
          width: 2rpx;
          height: 80rpx;
          background-color: #ddd;
          
          &::after {
            content: '';
            position: absolute;
            left: -4rpx;
            bottom: 0;
            width: 10rpx;
            height: 10rpx;
            background-color: #fff;
            border: 2rpx solid #ddd;
            border-radius: 50%;
          }
        }
        
        .node-dot {
          width: 40rpx;
          height: 40rpx;
          border-radius: 50%;
          background-color: #ddd;
          margin-right: 20rpx;
          position: relative;
          z-index: 1;
        }
        
        .node-info {
          flex: 1;
          
          .department {
            font-size: 28rpx;
            color: #333;
            margin-bottom: 8rpx;
          }
          
          .time {
            font-size: 24rpx;
            color: #666;
            margin-bottom: 8rpx;
          }
          
          .status {
            font-size: 24rpx;
            color: #999;
          }
        }
        
        &.completed {
          .node-line {
            background-color: #52c41a;
            
            &::after {
              background-color: #52c41a;
              border-color: #52c41a;
            }
          }
          
          .node-dot {
            background-color: #52c41a;
          }
          
          .node-info {
            .status {
              color: #52c41a;
            }
          }
        }
        
        &.current {
          .node-line {
            background-color: #007AFF;
            
            &::after {
              background-color: #007AFF;
              border-color: #007AFF;
            }
          }
          
          .node-dot {
            background-color: #007AFF;
          }
          
          .node-info {
            .status {
              color: #007AFF;
            }
          }
        }
        
        &:last-child {
          padding-bottom: 0;
          
          .node-line {
            display: none;
          }
        }
      }
    }
  }
  
  .action-section {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 100rpx;
    padding: 30rpx;
    background-color: #fff;
    box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
    z-index: 10;
    .action-btn {
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      border-radius: 44rpx;
      font-size: 32rpx;
      &.primary {
        background-color: #007AFF;
        color: #fff;
        &:active {
          opacity: 0.8;
        }
      }
    }
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 200rpx;
    
    image {
      width: 200rpx;
      height: 200rpx;
      margin-bottom: 20rpx;
    }
    
    text {
      color: #999;
      font-size: 28rpx;
      margin-bottom: 40rpx;
    }
    
    .nav-btn {
      width: 240rpx;
      height: 80rpx;
      line-height: 80rpx;
      background-color: #007AFF;
      color: #fff;
      font-size: 28rpx;
      border-radius: 40rpx;
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.qr-popup,
.photo-popup {
  width: 600rpx;
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 2rpx solid #f0f0f0;
    
    .title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .close-btn {
      font-size: 48rpx;
      color: #999;
      padding: 0 20rpx;
    }
  }
  
  .popup-content {
    padding: 30rpx;
    
    .camera-box {
      width: 100%;
      height: 400rpx;
      background-color: #000;
      margin-bottom: 20rpx;
      overflow: hidden;
      
      camera,
      image {
        width: 100%;
        height: 100%;
      }
    }
    
    .tip-text {
      text-align: center;
      font-size: 28rpx;
      color: #666;
    }
    
    .btn-group {
      display: flex;
      justify-content: center;
      gap: 20rpx;
      margin-top: 30rpx;
      
      .photo-btn {
        width: 200rpx;
        height: 80rpx;
        line-height: 80rpx;
        background-color: #f5f5f5;
        color: #666;
        font-size: 28rpx;
        border-radius: 40rpx;
        
        &.confirm {
          background-color: #007AFF;
          color: #fff;
        }
        
        &:active {
          opacity: 0.8;
        }
      }
    }
  }
}
</style> 