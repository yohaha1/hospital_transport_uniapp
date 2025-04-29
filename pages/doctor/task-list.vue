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
      <view class="additional-filters">
        <view class="filter-group">
          <picker mode="selector" :value="itemTypeIndex" :range="itemTypeFilters" @change="handleItemTypeChange">
            <view class="picker">
              任务类型：{{ selectedItemType || '全部' }}
            </view>
          </picker>
        </view>
        <view class="filter-group">
          <picker mode="selector" :value="priorityIndex" :range="priorityFilters" @change="handlePriorityChange">
            <view class="picker">
              优先级：{{ selectedPriority || '全部' }}
            </view>
          </picker>
        </view>
      </view>
      <view class="date-filter">
        <!-- 日期范围选择器 -->
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
          <text class="status-tag" :class="getStatusClass(item.task.status)">
            {{ getStatusText(item.task.status) }}
          </text>
        </view>
        <view class="task-info">
          <view class="info-row">
            <text class="label">创建者：</text>
            <text class="value">{{ item.doctorName || '—' }}</text>
          </view>			
          <view class="info-row">
            <text class="label">运送员：</text>
            <text class="value">{{ item.transporterName || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="label">发起时间：</text>
            <text class="value">{{ formatTime(item.task.createtime) }}</text>
          </view>
          <view class="info-row">
            <text class="label">优先级：</text>
            <text class="value">{{ getPriorityText(priorityMap[item.task.priority]) }}</text>
          </view>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-status" v-if="tasks.length > 0">
        <text v-if="isLoading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="filteredTasks.length === 0 && !isLoading">
        <image src="/static/images/empty.png" mode="aspectFit"></image>
        <text>暂无任务记录</text>
        <button class="create-btn" @click.stop="navigateToCreate">
          发起任务
        </button>
      </view>
    </scroll-view>
    <!-- 任务详情弹窗 -->
    <uni-popup ref="taskDetailPopup" type="bottom">
      <TaskDetail
        :task="currentTask"
        :user-role="userRole"
        @close="closeTaskDetail"
        @accept="handleAcceptTask"
      />
    </uni-popup>
    <tabBar :selectedIndex="1" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import taskApi from '@/api/task.js'
import TaskDetail from '@/components/TaskDetail.vue'

const statusFilters = [
  { label: '全部', value: 'ALL' },
  { label: '待接单', value: 'NEW' },
  { label: '运送中', value: 'TRANSPORTING' },
  { label: '已完成', value: 'DELIVERED' }
]
const itemTypeFilters = ['全部', '药品', '化验样本']
const priorityFilters = ['全部', '普通', '紧急', '特急']

const currentStatus = ref('ALL')
const selectedItemType = ref('全部')
const selectedPriority = ref('全部')
const itemTypeIndex = ref(0)
const priorityIndex = ref(0)

const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const isLoading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)
const currentTask = ref(null)
const taskDetailPopup = ref(null)
const userRole = ref('')


// 日期范围选择
const dateRange = ref([])

// 优先级映射
const priorityMap = {
  0: 'normal',
  1: 'urgent',
  2: 'critical'
}

const getStatusClass = status => {
  const classes = {
    NEW: 'status-pending',
    TRANSPORTING: 'status-processing',
    DELIVERED: 'status-completed'
  }
  return classes[status] || ''
}

const getPriorityText = priority => {
  const texts = {
    normal: '普通',
    urgent: '紧急',
    critical: '特急'
  }
  return texts[priorityMap[priority] || priority] || ''
}

const getStatusText = status => {
  const texts = {
    NEW: '待接单',
    TRANSPORTING: '运送中',
    DELIVERED: '已完成'
  }
  return texts[status] || status
}

const formatTime = ts => {
  if (!ts) return ''
  const date = new Date(ts)
  const pad = n => n < 10 ? '0' + n : n
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesStatus = currentStatus.value === 'ALL' || task.task.status === currentStatus.value
    const matchesItemType = selectedItemType.value === '全部' || task.task.itemtype === selectedItemType.value
    const matchesPriority = selectedPriority.value === '全部' || getPriorityText(priorityMap[task.task.priority]) === selectedPriority.value
    return matchesStatus && matchesItemType && matchesPriority
  })
})

// 时间筛选
const handleDateRangeChange = (e) => {
  const [start, end] = e
  dateRange.value.start = start
  dateRange.value.end = end
  console.log("testttttttttttttttt",dateRange.value.start)
  loadTasks(true)
}

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
    userRole.value = (userInfo.role || '').toLowerCase()
    const params = {
      status: currentStatus.value === 'ALL' ? null : currentStatus.value,
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    const res = await taskApi.getDepartmentTasks(userInfo.departmentid, params)
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



// 状态筛选
const handleFilterChange = status => {
  if (currentStatus.value === status) return
  currentStatus.value = status
  loadTasks(true)
}

//类型筛选
const handleItemTypeChange = e => {
  itemTypeIndex.value = e.detail.value
  selectedItemType.value = itemTypeFilters[itemTypeIndex.value]
}

//优先级筛选
const handlePriorityChange = e => {
  priorityIndex.value = e.detail.value
  selectedPriority.value = priorityFilters[priorityIndex.value]
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

// 弹窗展示任务详情
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
      transporterName: item.transporterName,
      doctorName: item.doctorName,
      nodes,
    }
    taskDetailPopup.value.open()
  } catch (error) {
    uni.showToast({
      title: error.message || '详情加载失败',
      icon: 'none'
    })
  }
}

// 关闭详情弹窗
const closeTaskDetail = () => {
  taskDetailPopup.value.close()
  setTimeout(() => {
    currentTask.value = null
  }, 200)
}

//医生页面，无需任务交接
const handleAcceptTask = async (task) => {}

// 新建任务
const navigateToCreate = () => {
  uni.navigateTo({
    url: '/pages/nurse/create-task/create-task'
  })
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

<style scoped>
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
</style>

<style lang="scss">
.task-list {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8f8f8;

  .filter-section {
    position: fixed;
    top: 10;
    left: 0;
    right: 0;
    z-index: 100;
    background: #fff;

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
    flex: 1;
    margin-top: 160rpx; /* 适配筛选栏高度 */
    margin-bottom: 110rpx; /* 适配tabBar高度 */
    overflow-y: auto;
    min-height: 0;
    box-sizing: border-box;
    padding: 20rpx 0 0 0;
  }
  
  .task-item {
	margin-top: 50rpx;  
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
        
        &.status-pending {
          background-color: #fff7e6;
          color: #fa8c16;
        }
        
        &.status-accepted {
          background-color: #e6f7ff;
          color: #1890ff;
        }
        
        &.status-processing {
          background-color: #f6ffed;
          color: #52c41a;
        }
        
        &.status-completed {
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
    
    .create-btn {
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

.task-detail {
  background-color: #fff;
  border-radius: 40rpx 40rpx 0 0;
  max-height: 80vh;
  position: relative;
  z-index: 1001;
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 2rpx solid #f0f0f0;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 2;
    
    .title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .close-btn {
      font-size: 48rpx;
      color: #999;
      padding: 0 20rpx;
      z-index: 10;
      cursor: pointer;
    }
  }
  
  .detail-content {
    max-height: calc(80vh - 200rpx);
    padding: 30rpx;
    overflow-y: auto;
    
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
            
            &.status-pending,
            &.status-accepted,
            &.status-processing,
            &.status-completed {
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