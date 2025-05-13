<template>
  <view class="task-list">
    <!-- 状态筛选 -->
    <view class="filter-section">
      <view class="filter-scroll" scroll-x>
        <view class="filter-list">
          <view
            class="filter-item"
            v-for="(item, index) in statusFilters"
            :key="index"
            :class="{ active: currentStatus === item.value }"
            @click="handleFilterChange(item.value)">
            {{ item.label }}
          </view>
        </view>
      </view>
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
        @click="showTaskDetail(item)">
        <view class="task-header">
          <view class="left">
            <text class="type-tag">{{ item.task.itemtype }}</text>
            <text class="item-name">{{ item.task.itemname }}</text>
          </view>
          <text
            v-if="isDoctor"
            class="status-tag"
            :class="getStatusClass(item.task.status)">
            {{ getStatusText(item.task.status) }}
          </text>
          <view
            v-else
            class="priority-tag"
            :class="getPriorityClass(item.task.priority)">
            {{ getPriorityText(item.task.priority) }}
          </view>
        </view>

        <view class="task-info">
          <view class="info-row">
            <text class="label">{{ isDoctor ? '创建者：' : '发起科室：' }}</text>
            <text class="value">
              {{ isDoctor ? (item.doctorName || '—') : item.department.departmentname }}
            </text>
          </view>
          <view class="info-row">
            <text class="label">{{isDoctor? '运送员：' : '任务状态：'}}</text>
            <text class="value">{{ isDoctor ? (item.transporterName || '—') : getStatusText(item.task.status) }}</text>
          </view>
          <view class="info-row" v-if="isDoctor">
            <text class="label">优先级：</text>
            <text class="value">{{ getPriorityText(priorityMap[item.task.priority]) }}</text>
          </view>
          <view class="info-row">
            <text class="label">发起时间：</text>
            <text class="value">{{ formatTime(item.task.createtime) }}</text>
          </view>
          <view class="info-row" v-if="item.task.completion">
            <text class="label">完成时间：</text>
            <text class="value">{{ formatTime(item.task.completion) }}</text>
          </view>
          <view class="info-row" v-if="item.task.completion">
            <text class="label">用时：</text>
            <text class="value">{{ calculateDuration(item.task.createtime, item.task.completion) || '-' }}</text>
          </view>
		  <view class="info-row" v-if = "isDoctor && item.task.status === 'TRANSPORTING'" >
		    <text class="label">节点进度：</text>
		  </view>
        </view>

        <!-- 节点进度条:  -->
        <view
          v-if="isDoctor && item.task.status === 'TRANSPORTING'"
          class="progress-container">
          <view class="nodes-wrapper">
            <view
              v-for="(node, idx) in item.nodes"
              :key="idx"
              class="node-wrapper">
              <view
                class="dot"
                :class="{
                  completed: node.handovertime,
                  current: isCurrentNode(node, idx, item.nodes)
                }"
              ></view>
              <view
                v-if="idx < item.nodes.length - 1"
                class="segment"
                :class="{
                  'segment-completed': node.handovertime,
                  'segment-current': isCurrentNode(item.nodes[idx+1], idx+1, item.nodes)
                }"
              ></view>
            </view>
          </view>
          <view class="info-wrapper">
            <view
              v-for="(node, idx) in item.nodes"
              :key="idx"
              class="node-info">
              <text class="dept-name">{{ node.departmentname }}</text>
              <text v-if="node.handovertime" class="time-value">{{ formatTime(node.handovertime) }}</text>
              <text v-else class="estimated-time">待交接</text>
            </view>
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
        <text>暂无任务记录</text>
        <button class="create-btn" @click.stop="navigateToCreate">发起任务</button>
      </view>
    </scroll-view>

    <uni-popup ref="taskDetailPopup" type="bottom">
      <TaskDetail
        :task="currentTask"
        :user-role="userRole"
        @close="closeTaskDetail"
      />
    </uni-popup>
    <tabBar :selectedIndex= '2' />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import taskApi from '@/api/task.js'
import TaskDetail from '@/components/TaskDetail.vue'

const statusFiltersDoctor = [
  { label: '全部', value: 'ALL' },
  { label: '待接单', value: 'NEW' },
  { label: '运送中', value: 'TRANSPORTING' },
  { label: '已完成', value: 'DELIVERED' }
]
const statusFiltersTransporter = [
  { label: '全部', value: 'ALL' },
  { label: '运送中', value: 'TRANSPORTING' },
  { label: '已完成', value: 'DELIVERED' }
]
const itemTypeFilters = ['全部', '药品', '化验样本','标本','文件']
const priorityFilters = ['全部', '普通', '紧急', '特急']

const userRole = ref('')
onMounted(async () => {
  const userInfo = uni.getStorageSync('userInfo')
  userRole.value = (userInfo.role || '').toLowerCase()
  await loadTasks()
})
const isDoctor = computed(() => userRole.value === 'doctor')
const isTransporter = computed(() => userRole.value === 'transporter')

const statusFilters = computed(() => isDoctor.value ? statusFiltersDoctor : statusFiltersTransporter)

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
const dateRange = ref([])

const priorityMap = { 0: 'normal', 1: 'urgent', 2: 'critical' }

const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    if (currentStatus.value !== 'ALL' && task.task.status !== currentStatus.value) return false
    if (selectedItemType.value !== '全部' && task.task.itemtype !== selectedItemType.value) return false
    if (selectedPriority.value !== '全部' && getPriorityText(priorityMap[task.task.priority]) !== selectedPriority.value) return false
    return true
  })
})

const loadTasks = async (refresh = false) => {
  if (refresh) { page.value = 1; noMore.value = false }
  if (isLoading.value || noMore.value) return

  isLoading.value = true
  try {
    const userInfo = uni.getStorageSync('userInfo')
    const params = {
      status: currentStatus.value === 'ALL' ? null : currentStatus.value,
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    const res = await (isDoctor.value
      ? taskApi.getDepartmentTasks(userInfo.departmentid, params)
      : taskApi.getTransporterTaskRecords(userInfo.userid, params))
	  
	console.log("tttttttttttttttttttttttt",res)
	
    const sortedData = res.sort((a, b) => {
      const statusOrder = { 
        TRANSPORTING: 0, 
        NEW: 1, 
        CANCELED: 2, 
        DELIVERED: 3 
      }
      return statusOrder[a.task.status] - statusOrder[b.task.status]
    })  
	
    const withNodes = await Promise.all(res.map(async item => {
      if (item.task.status === 'TRANSPORTING') {
        const nodesRes = await taskApi.getTaskNodes(item.task.taskid)
        const nodes = nodesRes.map(n => ({
          ...n.node,
          departmentname: n.department.departmentname,
          address: n.department.address,
        }))
        return { ...item, nodes }
      } else {
        return { ...item, nodes: [] }
      }
    }))
    tasks.value = refresh ? withNodes : [...tasks.value, ...withNodes]
	// console.log("tttttttttttttttttttttttt",tasks.value)
    noMore.value = res.length < pageSize.value
    page.value++
  } catch (error) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
    if (refresh) isRefreshing.value = false
  }
}

const handleFilterChange = status => { 
	currentStatus.value = status;
	loadTasks(true)
}

const handleItemTypeChange = e => { 
	itemTypeIndex.value = e.detail.value; 
	selectedItemType.value = itemTypeFilters[itemTypeIndex.value]; 
	loadTasks(true) 
}

const handlePriorityChange = e => { 
	priorityIndex.value = e.detail.value; 
	selectedPriority.value = priorityFilters[priorityIndex.value];
	 loadTasks(true) 
}

// 时间筛选
const handleDateRangeChange = (e) => {
  const [start, end] = e
  dateRange.value.start = start
  dateRange.value.end = end
  // console.log("testttttttttttttttt",dateRange.value.start)
  loadTasks(true)
}

const onRefresh = async () => { 
	isRefreshing.value = true; 
	await loadTasks(true) 
}

const loadMore = () => loadTasks()

const showTaskDetail = async item => {
  try {
    const nodesRes = await taskApi.getTaskNodes(item.task.taskid)
    const nodes = nodesRes.map(n => ({ ...n.node, departmentname: n.department.departmentname, address: n.department.address }))
    const files = isDoctor.value ? await taskApi.getFiles(item.task.taskid) : []
    currentTask.value = { ...item.task, transporterName: item.transporterName, doctorName: item.doctorName, nodes, files }
    taskDetailPopup.value.open()
  } catch {
    uni.showToast({ title: '详情加载失败', icon: 'none' })
  }
}
const closeTaskDetail = () => { 
	taskDetailPopup.value.close(); 
	setTimeout(() => currentTask.value = null, 200)
}

const navigateToCreate = () => uni.navigateTo({ url: '/pages/nurse/create-task/create-task' })

const isCurrentNode = (node, index, nodes) => {
  const lastCompleted = nodes.findIndex(n => !n.handovertime) - 1
  return index === lastCompleted + 1
}

const getStatusClass = status => {
  const classes = {
    NEW: 'status-pending',
    TRANSPORTING: 'status-processing',
    DELIVERED: 'status-completed',
	CANCELED: 'status-canceled'
  }
  return classes[status] || ''
}

const getStatusText = status => {
  const texts = {
    NEW: '待接单',
    TRANSPORTING: '运送中',
    DELIVERED: '已完成',
	CANCELED: '已取消',
  }
  return texts[status] || status
}

const getPriorityClass = p => ['priority-normal','priority-urgent','priority-critical'][p] || ''

const getPriorityText = priority => {
  const texts = {
    normal: '普通',
    urgent: '紧急',
    critical: '特急'
  }
  return texts[priorityMap[priority] || priority] || ''
}

const formatTime = ts => {
  if (!ts) return ''
  const d = new Date(ts), pad = n => n < 10 ? '0'+n : n
  return `${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const calculateDuration = (s, e) => {
  if (!s || !e) return '-'
  const diff = +new Date(e) - +new Date(s)
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000)
  return h>0 ? `${h}小时${m}分钟` : `${m}分钟`
}
</script>

<style lang="scss" scoped>
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

/* 进度条容器 */
.progress-container {
  margin: 20rpx 0;
  padding-top: 30rpx;
  position: relative;
}

/* 节点 + 段线 外层容器 */
.nodes-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 10%; /* 保持与左右点对齐 */
}

/* 每个点 + 段线 的组合 */
.node-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

/* 圆点样式 */
.dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #ccc;
  z-index: 2;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
}
.dot.completed { background: #07C160; }
.dot.current {
  background: #ff9900; /* 高亮色 */
  border: 2rpx solid #fff; /* 增加对比度 */
  box-shadow: 0 4rpx 8rpx rgba(255, 153, 0, 0.5);
  transform: scale(1.5); /* 稍微放大 */
}

/* 段线：每两点之间一个，平分宽度 */
.segment {
  flex: 1;
  height: 8rpx;
  margin: 0 6rpx;
  background: #eee;
  border-radius: 4rpx;
  transition: background 0.4s;
}
.segment-completed {
  background-color: #5cb900; 
}

.segment-current {
  background-color: #5cb900; 
  animation: pulse 1.5s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

/* 保留原有的节点信息样式 */
.info-wrapper {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 5%;
}

.node-info {
  flex: 1;             /* 等分 */
  min-width: 0;        /* 防止内容撑破 */
  text-align: left;
  box-sizing: border-box;
  padding: 0 6rpx; 

  .dept-name {
    font-size: 26rpx;
    color: #333;
    font-weight: 500;
    white-space: normal;
    word-break: break-word;
    margin-bottom: 8rpx;
  }
  .time-value, .estimated-time {
    display: block;
    font-size: 24rpx;
  }
  .time-value { color: #07C160; }
  .estimated-time { color: #ff9900; }
}
.node-info .dept-name,
.node-info .time-value,
.node-info .estimated-time {
  display: block;
  margin-bottom: 8rpx;
}


.task-list {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8f8f8;

  .filter-section {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: #fff;

    .filter-scroll {
	  padding-top: 15rpx;
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
    margin-top: 210rpx; /* 适配筛选栏高度 */
    margin-bottom: 110rpx; /* 适配tabBar高度 */
    overflow-y: auto;
    min-height: 0;
    box-sizing: border-box;
    padding: 20rpx 0 0 0;
  }
  
  .task-item {
	margin-top: 30rpx;  
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
		
		&.status-canceled {
		  background-color: #ffedee;
		  color: #ff0000;
		}
		
      }
	  
	  // 优先级标签右上角
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
  z-index: 11;
  
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