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
      <view class="additional-filters">
        <view class="filter-group">
          <picker mode="selector" :value="itemTypeIndex" :range="itemTypeFilters" @change="handleItemTypeChange">
            <view class="picker">
              任务类型：{{ selectedItemType }}
            </view>
          </picker>
        </view>
        <view class="filter-group">
          <picker mode="selector" :value="priorityIndex" :range="priorityFilters" @change="handlePriorityChange">
            <view class="picker">
              优先级：{{ selectedPriority }}
            </view>
          </picker>
        </view>
      </view>
      <!-- 时间筛选区域 -->
      <view class="date-filter">
        <uni-datetime-picker 
          v-model="dateRange"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="handleDateRangeChange"
        />
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
        v-for="item in filteredTasks" 
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
      <view class="loading-status" v-if="filteredTasks.length > 0">
        <text v-if="isLoading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>
      <!-- 空状态 -->
      <view class="empty-state" v-if="filteredTasks.length === 0 && !isLoading">
        <text>暂无历史任务记录</text>
      </view>
    </scroll-view>
    <!-- 任务详情弹窗 -->
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
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import taskApi from '@/api/task.js'
import TaskDetail from '@/components/TaskDetail.vue'

const statusFilters    = [
  { label: '全部', value: 'ALL' },
  { label: '运送中', value: 'TRANSPORTING' },
  { label: '已完成', value: 'DELIVERED' },
]
const itemTypeFilters = ['全部', '药品', '化验样本','标本','文件']
const priorityFilters = ['全部', '普通', '紧急', '特急']

const currentStatus = ref('ALL')
const selectedItemType = ref('全部')
const selectedPriority = ref('全部')
const itemTypeIndex = ref(0)
const priorityIndex = ref(0)
const dateRange = ref([])

const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const isLoading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)
const currentTask = ref(null)
const taskDetailPopup = ref(null)

const filteredTasks = computed(() => {
  return tasks.value.filter(item => {
    if (currentStatus.value !== 'ALL' && item.task.status !== currentStatus.value) return false
    if (selectedItemType.value !== '全部' && item.task.itemtype !== selectedItemType.value) return false
    const pText = ['普通','紧急','特急'][item.task.priority] || ''
    if (selectedPriority.value !== '全部' && pText !== selectedPriority.value) return false
    if (dateRange.value.length === 2) {
      const t = new Date(item.task.createtime).getTime()
      const s = new Date(dateRange.value[0]).getTime()
      const e = new Date(dateRange.value[1]).getTime()
      if (t < s || t > e) return false
    }
    return true
  })
})

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
      startDate: dateRange.value[0] || null,
      endDate:   dateRange.value[1] || null
    }
    const res = await taskApi.getTransporterTaskRecords(userInfo.userid, params)
    tasks.value = refresh ? res : [...tasks.value, ...res]
    noMore.value  = res.length < pageSize.value
    page.value++
  } catch (error) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
    if (refresh) isRefreshing.value = false
  }
}

const handleFilterChange = status => { currentStatus.value = status; loadTasks(true) }
const handleItemTypeChange = e => { itemTypeIndex.value = e.detail.value; selectedItemType.value = itemTypeFilters[itemTypeIndex.value]; loadTasks(true) }
const handlePriorityChange = e => { priorityIndex.value = e.detail.value; selectedPriority.value = priorityFilters[priorityIndex.value]; loadTasks(true) }
const handleDateRangeChange = () => loadTasks(true)
const onRefresh = async () => { isRefreshing.value = true; await loadTasks(true) }
const loadMore = () => loadTasks()

const showTaskDetail = async item => {
  try {
    const nodesRes = await taskApi.getTaskNodes(item.task.taskid)
    const nodes = nodesRes.map(n => ({ ...n.node, departmentname: n.department.departmentname, address: n.department.address }))
    currentTask.value = { ...item.task, transporterName: item.transporterName, doctorName: item.doctorName, nodes }
    taskDetailPopup.value.open()
  } catch {
    uni.showToast({ title: '获取详情失败', icon: 'none' })
  }
}
const closeTaskDetail = () => {
  taskDetailPopup.value.close()
  setTimeout(() => currentTask.value = null, 200)
}

const calculateDuration = (s, e) => {
  if (!s || !e) return '-'
  const diff = +new Date(e) - +new Date(s)
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}
const getPriorityClass = p => ['priority-normal','priority-urgent','priority-critical'][p] || ''
const getPriorityText  = p => ['普通','紧急','特急'][p] || ''
const getStatusText    = s => ({ TRANSPORTING:'运送中', DELIVERED:'已完成', CANCELED:'已取消' }[s] || s)
const formatTime       = t => {
  if (!t) return ''
  const d = new Date(t), pad = n => n < 10 ? '0' + n : n
  return `${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => loadTasks())
onShow(() => uni.hideTabBar({ animation: false }))
</script>

<style lang="scss">
.filter-group {
  display: inline-block;
  margin-right: 20rpx;
}

.additional-filters {
  display: flex;
  justify-content: space-between;
  padding: 10rpx;
}

.picker {
  font-size: 28rpx;
  color: #666;
  padding: 10rpx 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  background: #f3f3f3;
}

.history-task {
  min-height: 100vh;
  background-color: #f8f8f8;

  .filter-section {
    background-color: #fff;
    padding: 20rpx 0;
    position: fixed;
    padding-top: 10rpx;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;

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
        }
      }
    }
    .date-filter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10rpx 20rpx 10rpx 20rpx;
      uni-datetime-picker {
        width: 100%;
      }
    }
  }
  .task-scroll {
    height: calc(100vh - 100rpx - 100rpx);
    margin-top: 200rpx;
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