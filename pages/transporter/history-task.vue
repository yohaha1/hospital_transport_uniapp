<template>
  <view class="history-task">
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
      <!-- 时间筛选区域 -->
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
        v-for="item in tasks" 
        :key="item.task.taskid"
        @click="showTaskDetail(item)"
      >
        <view class="task-header">
          <view class="left">
            <text class="type-tag">{{ item.task.itemtype }}</text>
            <text class="item-name">{{ item.task.itemname }}</text>
          </view>
          <view
            class="priority-tag"
            :class="getPriorityClass(item.task.priority)"
          >
            {{ getPriorityText(item.task.priority) }}
          </view>
        </view>
        <view class="task-info">
          <view class="info-row">
            <text class="label">发起科室：</text>
            <text class="value">{{ item.department.departmentname }}</text>
          </view>
          <view class="info-row">
            <text class="label">任务状态：</text>
            <text class="value">{{ getStatusText(item.task.status) }}</text>
          </view>
          <view class="info-row" v-if="item.task.completion">
            <text class="label">完成时间：</text>
            <text class="value">{{ formatTime(item.task.completion) }}</text>
          </view>
          <view class="info-row" v-if="item.task.completion">
            <text class="label">用时：</text>
            <text class="value">{{ calculateDuration(item.task.createtime, item.task.completion) }}</text>
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
    <!-- 任务详情弹窗（组件方式） -->
    <uni-popup ref="taskDetailPopup" type="bottom">
      <TaskDetail
        :task="currentTask"
        user-role="transporter"
        @close="closeTaskDetail"
      />
    </uni-popup>
    <tabBar :selectedIndex="2" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import taskApi from '@/api/task.js'
import TaskDetail from '@/components/TaskDetail.vue'

const statusFilters = [
  { label: '全部', value: 'ALL' },
  { label: '已完成', value: 'DELIVERED' },
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

// --- 逻辑与原有一致 ---
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

const handleStartDateChange = e => {
  startDate.value = e.detail.value
  loadTasks(true)
}
const handleEndDateChange = e => {
  endDate.value = e.detail.value
  loadTasks(true)
}
const handleFilterChange = status => {
  if (currentStatus.value === status) return
  currentStatus.value = status
  loadTasks(true)
}
const onRefresh = async () => {
  isRefreshing.value = true
  await loadTasks(true)
}
const loadMore = () => {
  loadTasks()
}

const showTaskDetail = async (item) => {
  try {
    const nodesRes = await taskApi.getTaskNodes(item.task.taskid)
    const nodes = nodesRes.map(n => ({
      ...n.node,
      departmentname: n.department.departmentname,
      address: n.department.address,
    }))
    currentTask.value = {
      ...item.task,
      departmentname: item.department.departmentname,
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
const closeTaskDetail = () => {
  taskDetailPopup.value.close()
  setTimeout(() => {
    currentTask.value = null
  }, 200)
}
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '-'
  const start = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime
  const end = typeof endTime === 'string' ? new Date(endTime).getTime() : endTime
  if (isNaN(start) || isNaN(end)) return '-'
  const duration = end - start
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}
const getPriorityClass = priority => {
  const map = { 0: 'priority-normal', 1: 'priority-urgent', 2: 'priority-critical' }
  if (typeof priority === 'string') return map[parseInt(priority)] || ''
  return map[priority] || ''
}
const getPriorityText = priority => {
  const map = { 0: '普通', 1: '紧急', 2: '特急' }
  if (typeof priority === 'string') return map[parseInt(priority)] || ''
  return map[priority] || ''
}
const getStatusClass = status => {
  const classes = {
    DELIVERED: 'status-completed',
    CANCELLED: 'status-cancelled'
  }
  return classes[status] || ''
}
const getStatusText = (status) => {
  const statusMap = {
    'NEW': '待接单',
    'TRANSPORTING': '运送中',
    'DELIVERED': '已完成',
  }
  return statusMap[status] || status
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
      .picker {
        font-size: 28rpx;
        color: #666;
        padding: 10rpx 20rpx;
        border: 1rpx solid #ddd;
        border-radius: 8rpx;
        background: #f3f3f3;
        margin-right: 10rpx;
      }
    }
  }
  .task-scroll {
    height: calc(100vh - 100rpx - 100rpx);
    margin-top: 150rpx;
    padding: 20rpx;
  }
  .task-item {
    margin-top: 50rpx;
    background-color: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    position: relative;
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
      // 优先级标签右上角
      .priority-tag {
        position: absolute;
        top: 30rpx;
        right: 30rpx;
        font-size: 24rpx;
        border-radius: 8rpx;
        padding: 4rpx 18rpx;
        z-index: 2;
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
</style>