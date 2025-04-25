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
<!--        <view class="task-footer">
          <view class="progress-info">
            <text class="completed">{{ item.task.completedNodes || 0 }}</text>
            <text class="total">/{{ item.task.nodes?.length || 0 }} 个节点</text>
          </view>
        </view> -->
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-status" v-if="tasks.length > 0">
        <text v-if="isLoading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="tasks.length === 0 && !isLoading">
        <image src="/static/images/empty.png" mode="aspectFit"></image>
        <text>暂无任务记录</text>
        <button class="create-btn" @click.stop="navigateToCreate">
          发起任务
        </button>
      </view>
    </scroll-view>
    <!-- 任务详情弹窗，直接复用TaskDetail组件 -->
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
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import taskApi from '@/api/task.js'
import TaskDetail from '@/components/TaskDetail.vue'

const statusFilters = [
  { label: '全部', value: 'ALL' },
  { label: '待接单', value: 'NEW' },
  { label: '运送中', value: 'TRANSPORTING' },
  { label: '已完成', value: 'DELIVERED' }
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
const userRole = ref('')

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

//获取优先级文本
const getPriorityText = priority => {
  const texts = {
    normal: '普通',
    urgent: '紧急',
    critical: '特急'
  }
  return texts[priorityMap[priority] || priority] || ''
}

//获取状态文本
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
      startDate: startDate.value,
      endDate: endDate.value
    }
    const res = await taskApi.getDepartmentTasks(userInfo.departmentid, params)
	console.log("task list 部门任务列表 ",res)
    
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

// 时间筛选
const handleStartDateChange = e => {
  startDate.value = e.detail.value
  loadTasks(true)
}
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

// 弹窗展示任务详情，全部复用TaskDetail
const showTaskDetail = async (item) => {
  try {
    const nodesRes = await taskApi.getTaskNodes(item.task.taskid)
	// console.log("testtttttttttt",nodesRes)
    const nodes = nodesRes.map(n => ({
      ...n.node,
      departmentname: n.department.departmentname,
      address: n.department.address,
    }))
	console.log("任务节点序列：",nodes)
    currentTask.value = {
      ...item.task,
	  transporterName:item.transporterName,
	  doctorName:item.doctorName,
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

// 可扩展：接单逻辑（如需）
const handleAcceptTask = async (task) => {
  // 按需实现
}

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


<style lang="scss">
.task-list {
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
  }
      /* 新增时间筛选样式 */
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
  
  .task-scroll {
	height: calc(100vh - 100rpx - 100rpx); // 减去顶部和底部
	margin-top: 150rpx; // 这里要和 .filter-section 的高度一致
	padding: 20rpx;
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