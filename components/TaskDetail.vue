<template>
  <view class="task-detail" v-if="task">
    <!-- 顶部标题栏 -->
    <view class="detail-header">
      <text class="title">任务详情</text>
      <text class="close-btn" @click="$emit('close')">×</text>
    </view>

    <scroll-view class="detail-content" scroll-y>
      <!-- 基本信息卡片 -->
      <view class="detail-section basic-card">
        <view class="header-row">
          <text class="type-tag">{{ task.itemtype }}</text>
          <text class="item-name">{{ task.itemname }}</text>
          <text class="priority-tag" :class="getPriorityClass(priorityMap[task.priority])">{{ getPriorityText(priorityMap[task.priority]) }}</text>
        </view>
        <!-- 差异字段判断显示 -->
        <view class="info-row" v-if="task.departmentname">
          <text class="label">发起科室：</text>
          <text class="value">{{ task.departmentname }}</text>
        </view>
        <view class="info-row" v-if="task.doctorName">
          <text class="label">创建者：</text>
          <text class="value">{{ task.doctorName }}</text>
        </view>
        <view class="info-row" v-if="task.transporterName">
          <text class="label">运送员：</text>
          <text class="value">{{ task.transporterName }}</text>
        </view>
        <!-- 公共字段 -->
        <view class="info-row">
          <text class="label">优先级：</text>
          <text class="value">{{ getPriorityText(priorityMap[task.priority]) }}</text>
        </view>
        <view class="info-row">
          <text class="label">任务状态：</text>
          <text class="value">{{ getStatusText(task.status) }}</text>
        </view>
        <view class="info-row">
          <text class="label">发起时间：</text>
          <text class="value">{{ formatTime(task.createtime) }}</text>
        </view>
        <view class="info-row" v-if="task.completion">
          <text class="label">完成时间：</text>
          <text class="value">{{ formatTime(task.completion) }}</text>
        </view>
        <!-- 任务备注 -->
        <view class="note-row" v-if="task.note">
          <text class="note-icon">📝</text>
          <text class="note-label">备注：</text>
          <text class="note-content">{{ task.note }}</text>
        </view>
      </view>

      <!-- 交接节点卡片 -->
      <view class="detail-section node-card">
        <view class="section-title">交接节点</view>
        <view class="node-list">
          <view 
            class="node-item"
            v-for="(node, index) in task.nodes"
            :key="index"
            :class="{ 'completed': !!node.handovertime }"
          >
            <view class="node-dot" :class="{ 'completed': !!node.handovertime }">{{ index + 1 }}</view>
            <view class="node-info">
              <view class="node-row">
                <text class="department">{{ node.departmentname }}</text>
                <text class="sequence">序号: {{ node.sequence }}</text>
              </view>
              <view class="node-row time-row">
                <text class="handovertime" v-if="node.handovertime">交接时间：{{ formatTime(node.handovertime) }}</text>
                <text class="waiting" v-else>等待交接</text>
              </view>
            </view>
          </view>
        </view>
      </view>
	  
		<!-- 地图区域 -->
		<view class="detail-section map-card">
		  <view class="section-title">运送实时定位</view>
		  <!-- 腾讯地图组件，uni-app 支持 <map> 组件，支持微信小程序、H5、App等平台 -->
		  <map
			:longitude="currentLocation.longitude"
			:latitude="currentLocation.latitude"
			:markers="markers"
			:scale="16"
			style="width: 100%; height: 360rpx;"
			show-location
		  />
		  <view v-if="!mapLoaded" style="text-align:center; color:#aaa; font-size:24rpx;">地图加载中...</view>
		</view>
	  
    </scroll-view>
    <view class="detail-footer">
      <slot name="footer">
        <button 
          v-if="userRole === 'transporter' && task.status === 'NEW'"
          class="accept-btn" 
          @click="$emit('accept', task)"
        >接单</button>
      </slot>
    </view>
  </view>
</template>
<script setup>
import { ref, watch, toRaw, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'


const props = defineProps({
  task: Object,
  userRole: String
})

watch(
  () => props.task,
  (newTask) => {
    console.log('taskDetail的task:', toRaw(newTask))
  },
  { immediate: true }
)

const priorityMap = {
  0: 'normal',
  1: 'urgent',
  2: 'critical'
}

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
  const map = { TRANSPORTING: '运送中', NEW: '待接单', DELIVERED: '已完成', COMPLETED: '已完成' }
  return map[status] || status
}
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const pad = n => n < 10 ? '0' + n : n
  return `${date.getMonth()+1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 地图相关
const currentLocation = ref({
  longitude: 113.324520, // 默认经纬度，可为医院大致位置
  latitude: 23.099994
})
const mapLoaded = ref(false)
const markers = ref([])

/**
 * 获取当前位置（高德/腾讯地图都支持 uni.getLocation）
 */
const fetchCurrentLocation = () => {
  uni.getLocation({
    type: 'gcj02', // 腾讯/高德都推荐gcj02
    success: (res) => {
      currentLocation.value.longitude = res.longitude
      currentLocation.value.latitude = res.latitude
      mapLoaded.value = true
      markers.value = [
        {
          id: 1,
          latitude: res.latitude,
          longitude: res.longitude,
          title: '我的位置',
          iconPath: '/static/marker-person.png',
          width: 32,
          height: 32,
          callout: { content: '我的位置', display: 'ALWAYS' }
        }
      ]
    },
    fail: () => {
      mapLoaded.value = true
    }
  })
}

onMounted(() => {
  fetchCurrentLocation()
})

// 监听扫码定位（后续拓展：根据二维码内容解析经纬度，动态设置currentLocation/markers）
watch(
  () => props.task,
  (newTask) => {
    // 可在此根据 task 及二维码经纬度信息，追加/更新markers
    // 示例：如果task中有transporterLocation字段
    if (newTask && newTask.transporterLocation) {
      const { latitude, longitude } = newTask.transporterLocation
      markers.value = [
        {
          id: 1,
          latitude,
          longitude,
          title: '运送员扫码位置',
          iconPath: '/static/marker-person.png',
          width: 32,
          height: 32,
          callout: { content: '扫码位置', display: 'ALWAYS' }
        }
      ]
      currentLocation.value.latitude = latitude
      currentLocation.value.longitude = longitude
    }
  },
  { immediate: true }
)

</script>

<style scoped lang="scss">
.task-detail {
  position: relative;
  background-color: #fff;
  border-radius: 40rpx 40rpx 0 0;
  overflow: hidden;
  margin-bottom: 80px;

  .detail-header {
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
  .detail-content {
    max-height: 65vh;
    padding: 30rpx 0 110rpx 0;
    overflow-y: auto;
    .detail-section {
      margin-bottom: 32rpx;
      &.basic-card {
        background: #fafbfc;
        border-radius: 20rpx;
        padding: 32rpx 32rpx 24rpx 32rpx;
        margin: 0 24rpx 32rpx 24rpx;
        box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
        .header-row {
          display: flex;
          align-items: center;
          margin-bottom: 18rpx;
          .type-tag {
            background: #e6f7ff;
            color: #1890ff;
            padding: 4rpx 12rpx;
            font-size: 24rpx;
            border-radius: 4rpx;
            margin-right: 20rpx;
          }
          .item-name {
            font-size: 32rpx;
            font-weight: bold;
            color: #222;
            margin-right: 12rpx;
          }
          .priority-tag {
            margin-left: auto;
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
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 10rpx;
          .label {
            color: #666;
            font-size: 28rpx;
            min-width: 130rpx;
          }
          .value {
            color: #333;
            font-size: 28rpx;
          }
        }
        .note-row {
          display: flex;
          align-items: flex-start;
          margin-top: 16rpx;
          margin-bottom: 2rpx;
          background: #fffbe6;
          border-radius: 10rpx;
          padding: 14rpx 18rpx;
          font-size: 26rpx;
          .note-icon {
            margin-right: 8rpx;
            color: #faad14;
          }
          .note-label {
            font-weight: bold;
            color: #faad14;
            margin-right: 6rpx;
          }
          .note-content {
            color: #8c6f1a;
            word-break: break-all;
            flex: 1;
          }
        }
      }
      &.node-card {
        background: #fafbfc;
        border-radius: 20rpx;
        padding: 32rpx 32rpx 16rpx 32rpx;
        margin: 0 24rpx;
        box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
        .section-title {
          font-size: 30rpx;
          font-weight: bold;
          color: #333;
          margin-bottom: 20rpx;
        }
        .node-list {
          .node-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 24rpx;
            .node-dot {
              width: 44rpx;
              height: 44rpx;
              border-radius: 50%;
              background: #e0e0e0;
              color: #fff;
              font-size: 28rpx;
              font-weight: bold;
              line-height: 44rpx;
              text-align: center;
              margin-right: 20rpx;
              &.completed {
                background: #52c41a;
              }
            }
            .node-info {
              flex: 1;
              .node-row {
                display: flex;
                align-items: center;
                font-size: 26rpx;
                margin-bottom: 6rpx;
                .department {
                  color: #333;
                  margin-right: 14rpx;
                  font-size: 28rpx;
                  font-weight: 500;
                }
                .sequence {
                  color: #aaa;
                  font-size: 24rpx;
                }
                .handovertime {
                  color: #52c41a;
                  font-size: 24rpx;
                }
                .waiting {
                  color: #999;
                  font-size: 24rpx;
                }
              }
              .time-row {
                margin-bottom: 0;
              }
            }
          }
        }
      }
    }
  }
  .detail-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 24rpx 30rpx;
    background: #fff;
    border-top: 2rpx solid #f0f0f0;
    z-index: 2;
    .accept-btn {
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      background-color: #007AFF;
      color: #fff;
      font-size: 32rpx;
      border-radius: 44rpx;
      &:active { opacity: 0.8; 
      }
    }
  }
}

.detail-section.map-card {
  background: #fff;
  border-radius: 20rpx;
  margin: 0 24rpx 32rpx 24rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
  padding: 32rpx 32rpx 18rpx 32rpx;
  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }
}
</style>