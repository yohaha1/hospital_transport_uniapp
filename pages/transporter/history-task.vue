<template>
  <view class="task-list">
    <!-- 状态筛选 -->
    <view class="filter-section">
      <scroll-view class="filter-scroll" scroll-x>
        <view class="filter-list">
          <view 
            class="filter-item" 
            v-for="(item, index) in statusFilters" 
            :key="index"
            :class="{ active: currentStatus === item.value }"
            @click="handleFilterChange(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>
      <!-- 时间筛选区域新增 -->
      <view class="date-filter">
        <picker mode="date" :value="startDate" @change="handleStartDateChange">
          <view class="picker">
            起始时间：{{ startDate || '选择日期' }}
          </view>
        </picker>
        <picker mode="date" :value="endDate" @change="handleEndDateChange">
          <view class="picker">
            结束时间：{{ endDate || '选择日期' }}
          </view>
        </picker>
      </view>
    </view>
    
    <!-- 任务列表 -->
    <scroll-view 
      class="task-scroll" 
      scroll-y 
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view 
        class="task-item" 
        v-for="task in tasks" 
        :key="task.id"
        @click="showTaskDetail(task)"
      >
        <view class="task-header">
          <view class="left">
            <text class="type-tag">{{ task.itemType }}</text>
            <text class="item-name">{{ task.itemName }}</text>
          </view>
          <text class="status-tag" :class="getStatusClass(task.status)">
            {{ getStatusText(task.status) }}
          </text>
        </view>
        <view class="task-info">
          <view class="info-row">
            <text class="label">发起科室：</text>
            <text class="value">{{ task.departmentName }}</text>
          </view>
          <view class="info-row">
            <text class="label">完成时间：</text>
            <text class="value">{{ formatTime(task.completeTime) }}</text>
          </view>
          <view class="info-row">
            <text class="label">用时：</text>
            <text class="value">{{ calculateDuration(task.startTime, task.completeTime) }}</text>
          </view>
        </view>
        <view class="task-footer">
          <view class="progress-info">
            <text class="completed">{{ task.completedNodes || 0 }}</text>
            <text class="total">/{{ task.nodes?.length || 0 }} 个节点</text>
          </view>
          <view class="priority-tag" :class="getPriorityClass(task.priority)">
            {{ getPriorityText(task.priority) }}
          </view>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-status" v-if="tasks.length > 0">
        <text v-if="isLoading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="tasks.length === 0 && !isLoading">
        <image src="/static/images/empty.png" mode="aspectFit"></image>
        <text>暂无历史任务记录</text>
      </view>
    </scroll-view>
    
    <!-- 任务详情弹窗 -->
    <uni-popup ref="taskDetailPopup" type="bottom">
      <view class="task-detail" v-if="currentTask">
        <view class="detail-header">
          <text class="title">任务详情</text>
          <text class="close-btn" @click="closeTaskDetail">×</text>
        </view>
        <scroll-view class="detail-content" scroll-y>
          <view class="detail-section">
            <view class="section-title">基本信息</view>
            <view class="info-list">
              <view class="info-item">
                <text class="label">物品名称</text>
                <text class="value">{{ currentTask.itemName }}</text>
              </view>
              <view class="info-item">
                <text class="label">物品类型</text>
                <text class="value">{{ currentTask.itemType }}</text>
              </view>
              <view class="info-item">
                <text class="label">紧急程度</text>
                <text class="value" :class="getPriorityClass(currentTask.priority)">
                  {{ getPriorityText(currentTask.priority) }}
                </text>
              </view>
              <view class="info-item">
                <text class="label">任务状态</text>
                <text class="value" :class="getStatusClass(currentTask.status)">
                  {{ getStatusText(currentTask.status) }}
                </text>
              </view>
              <view class="info-item">
                <text class="label">发起科室</text>
                <text class="value">{{ currentTask.departmentName }}</text>
              </view>
              <view class="info-item">
                <text class="label">开始时间</text>
                <text class="value">{{ formatTime(currentTask.startTime) }}</text>
              </view>
              <view class="info-item">
                <text class="label">完成时间</text>
                <text class="value">{{ formatTime(currentTask.completeTime) }}</text>
              </view>
              <view class="info-item">
                <text class="label">总用时</text>
                <text class="value">{{ calculateDuration(currentTask.startTime, currentTask.completeTime) }}</text>
              </view>
            </view>
          </view>
          
          <view class="detail-section">
            <view class="section-title">交接记录</view>
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
                  <text class="actual-time" v-if="node.actualTime">
                    实际{{ formatTime(node.actualTime) }}
                  </text>
                  <text class="status">{{ getNodeStatusText(node.status) }}</text>
                </view>
                <view class="node-image" v-if="node.confirmImage" @click="previewImage(node.confirmImage)">
                  <image :src="node.confirmImage" mode="aspectFill"></image>
                </view>
              </view>
            </view>
          </view>
          
          <view class="detail-section" v-if="currentTask.files && currentTask.files.length">
            <view class="section-title">附件</view>
            <view class="image-list">
              <image 
                v-for="(file, index) in currentTask.files"
                :key="index"
                :src="file.url"
                mode="aspectFill"
                @click="previewImage(file.url)"
              ></image>
            </view>
          </view>
        </scroll-view>
      </view>
    </uni-popup>
    <tabBar :selectedIndex="2" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import taskApi from '@/api/task.js'

const statusFilters = [
  { label: '全部', value: 'ALL' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' }
]
const currentStatus = ref('ALL')
const startDate = ref('')
const endDate = ref('')
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const isLoading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)
const currentTask = ref(null)
const taskDetailPopup = ref(null)

// 加载任务列表
const loadTasks = async (refresh = false) => {
  if (refresh) {
    page.value = 1
    noMore.value = false
  }
  if (isLoading.value || noMore.value) return

  isLoading.value = true
  try {
    const userInfo = uni.getStorageSync('userInfo')
    const params = {
      status: currentStatus.value === 'ALL' ? null : currentStatus.value,
      startDate: startDate.value,
      endDate: endDate.value
    }
    // 历史任务页面调用 getTransporterTaskRecords
    const res = await taskApi.getTransporterTaskRecords(userInfo.userid, params)
    if (refresh) {
      tasks.value = res
    } else {
      tasks.value = [...tasks.value, ...res]
    }
    noMore.value = res.length < pageSize.value
    page.value++
  } catch (error) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
    if (refresh) {
      isRefreshing.value = false
    }
  }
}

// 处理开始日期变化
const handleStartDateChange = e => {
  startDate.value = e.detail.value
  loadTasks(true)
}

// 处理结束日期变化
const handleEndDateChange = e => {
  endDate.value = e.detail.value
  loadTasks(true)
}

// 状态筛选
const handleFilterChange = status => {
  if (currentStatus.value === status) return
  currentStatus.value = status
  loadTasks(true)
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  await loadTasks(true)
}

// 上拉加载更多
const loadMore = () => {
  loadTasks()
}

// 显示任务详情
const showTaskDetail = async (task) => {
  try {
    // 获取任务节点详情
    const nodes = await taskApi.getTaskNodes(task.id)
    currentTask.value = {
      ...task,
      nodes
    }
    taskDetailPopup.value.open()
  } catch (error) {
    uni.showToast({
      title: error.message || '获取详情失败',
      icon: 'none'
    })
  }
}

// 关闭任务详情
const closeTaskDetail = () => {
  taskDetailPopup.value.close()
  setTimeout(() => {
    currentTask.value = null
  }, 200)
}

// 预览图片
const previewImage = url => {
  uni.previewImage({
    urls: [url],
    current: url
  })
}

// 计算任务用时
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '-'
  const duration = endTime - startTime
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 工具方法
const getPriorityClass = priority => {
  const classes = {
    normal: 'priority-normal',
    urgent: 'priority-urgent',
    critical: 'priority-critical'
  }
  return classes[priority] || ''
}
const getPriorityText = priority => {
  const texts = {
    normal: '普通',
    urgent: '紧急',
    critical: '特急'
  }
  return texts[priority] || ''
}
const getStatusClass = status => {
  const classes = {
    COMPLETED: 'status-completed',
    CANCELLED: 'status-cancelled'
  }
  return classes[status] || ''
}
const getStatusText = status => {
  const texts = {
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  }
  return texts[status] || ''
}
const getNodeStatusText = status => {
  const texts = {
    PENDING: '待到达',
    PROCESSING: '进行中',
    COMPLETED: '已完成'
  }
  return texts[status] || ''
}
const formatTime = timestamp => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const pad = n => n < 10 ? '0' + n : n
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

onMounted(() => {
  loadTasks()
})

onShow(() => {
  uni.hideTabBar({
    animation: false
  })
})
</script>

<style lang="scss">
.history-task {
  min-height: 100vh;
  background-color: #f8f8f8;

  .filter-section {
    background-color: #fff;
    padding: 20rpx 0;
    position: fixed;
    padding-top: 88rpx;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;

    .filter-scroll {
      white-space: nowrap;

      .filter-list {
        display: inline-flex;
        padding: 0 20rpx;

        .filter-item {
          padding: 10rpx 30rpx;
          margin-right: 20rpx;
          border-radius: 30rpx;
          font-size: 28rpx;
          color: #666;
          background-color: #f5f5f5;

          &.active {
            color: #fff;
            background-color: #007AFF;
          }

          &:last-child {
            margin-right: 0;
          }
        }
      }
    }

    .date-filter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10rpx 20rpx 10rpx 20rpx;

      .date-picker {
        font-size: 28rpx;
        color: #666;
        padding: 10rpx 20rpx;
        border: 1rpx solid #ddd;
        border-radius: 8rpx;
        background: #f3f3f3;
        margin-right: 10rpx;
      }

      .separator {
        margin: 0 20rpx;
        color: #666;
      }
    }
  }

  .task-scroll {
    height: calc(100vh - 100rpx - 100rpx);
    margin-top: 100rpx;
    padding: 20rpx;
  }

  .task-item {
    margin-top: 100rpx;
    background-color: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;

    .task-header {
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

      .status-tag {
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
        font-size: 24rpx;

        &.status-completed {
          background-color: #f6ffed;
          color: #52c41a;
        }

        &.status-cancelled {
          background-color: #f5f5f5;
          color: #666;
        }
      }
    }

    .task-info {
      margin-bottom: 20rpx;

      .info-row {
        display: flex;
        margin-bottom: 10rpx;
        font-size: 28rpx;

        .label {
          color: #666;
          margin-right: 10rpx;
        }

        .value {
          color: #333;
        }
      }
    }

    .task-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .progress-info {
        font-size: 24rpx;

        .completed {
          color: #007AFF;
          font-weight: bold;
        }

        .total {
          color: #999;
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
  }

  .loading-status {
    text-align: center;
    padding: 20rpx;
    color: #999;
    font-size: 28rpx;
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
  }
}

.task-detail {
  background-color: #fff;
  border-radius: 40rpx 40rpx 0 0;
  max-height: 80vh;

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
    max-height: calc(80vh - 200rpx);
    padding: 30rpx;

    .detail-section {
      margin-bottom: 40rpx;

      .section-title {
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 20rpx;
      }

      .info-list {
        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20rpx;

          .label {
            color: #666;
            font-size: 28rpx;
          }

          .value {
            color: #333;
            font-size: 28rpx;

            &.priority-normal,
            &.priority-urgent,
            &.priority-critical,
            &.status-completed,
            &.status-cancelled {
              padding: 4rpx 12rpx;
              border-radius: 4rpx;
            }
          }
        }
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

            .actual-time {
              font-size: 24rpx;
              color: #007AFF;
              margin-bottom: 8rpx;
            }

            .status {
              font-size: 24rpx;
              color: #999;
            }
          }

          .node-image {
            width: 120rpx;
            height: 120rpx;
            margin-left: 20rpx;

            image {
              width: 100%;
              height: 100%;
              border-radius: 8rpx;
            }
          }

          &.completed {
            .node-line {
              background-color: #52c41a;
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

      .image-list {
        display: flex;
        flex-wrap: wrap;
        gap: 20rpx;

        image {
          width: 200rpx;
          height: 200rpx;
          border-radius: 8rpx;
        }
      }
    }
  }
}
</style>