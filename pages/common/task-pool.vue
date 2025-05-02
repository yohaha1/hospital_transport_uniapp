<template>
  <view class="task-pool">
    <!-- 顶部统计栏 -->
    <view class="status-summary">
      <view class="status-item">
        <text class="count">{{ pendingCount }}</text>
        <text class="label">待接单</text>
      </view>
      <view class="status-item">
        <text class="count">{{ transportingCount }}</text>
        <text class="label">运送中</text>
      </view>
      <view class="status-item">
        <text class="count">{{ totalTransCount }}</text>
        <text class="label">运送员总数</text>
      </view>
      <view class="status-item">
        <text class="count">{{ freeTransCount }}</text>
        <text class="label">空闲运送员</text>
      </view>
    </view>

    <!-- 加号按钮 -->
    <button
      v-if="userRole === 'doctor'"
      class="fab-plus"
      @click="gotoCreateTask"
    >
      <text class="fab-icon">＋</text>
    </button>

    <!-- 任务列表 -->
    <scroll-view 
      class="task-list" 
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
          <text class="priority-tag" :class="getPriorityClass(priorityMap[item.task.priority])">
            {{ getPriorityText(priorityMap[item.task.priority]) }}
          </text>
        </view>
        <view class="task-info">
          <view class="info-item">
            <text class="label">发起科室：</text>
            <text class="value">{{ item.department.departmentname || '加载中...' }}</text>
          </view>
          <view class="info-item">
            <text class="label">优先级：</text>
            <text class="value">{{ getPriorityText(priorityMap[item.task.priority]) }}</text>
          </view>
          <view class="info-item">
            <text class="label">发起时间：</text>
            <text class="value">{{ formatTime(item.task.createtime) }}</text>
          </view>
        </view>

        <!-- 状态水印 -->
        <view class="status-watermark" :class="getStatusClass(item.task.status)">
          {{ getStatusText(item.task.status) }}
        </view>
      </view>

      <!-- 加载、空状态 -->
      <view class="loading-status" v-if="tasks.length > 0">
        <text v-if="isLoading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>
      <view class="empty-state" v-if="tasks.length === 0 && !isLoading">
        <text>暂无待接单任务</text>
      </view>
    </scroll-view>

    <!-- 详情弹窗 -->
    <uni-popup ref="taskDetailPopup" type="bottom">
      <TaskDetail
        :task="currentTask"
        :user-role="userRole"
        @close="closeTaskDetail"
        @accept="handleAcceptTask"
      />
    </uni-popup>

    <tabBar :selectedIndex="0"/>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import taskApi from '@/api/task.js'
import userApi from '@/api/user.js'
import TaskDetail from '@/components/TaskDetail.vue'

const tasks = ref([])
const currentTask = ref(null)
const isLoading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const userRole = ref('')
const taskDetailPopup = ref(null)
const totalTransCount = ref(0)  // 运送员总数
const freeTransCount  = ref(0) 

const priorityMap = { 0: 'normal', 1: 'urgent', 2: 'critical' }

// —— 新增：计算各状态数量 —— 
const pendingCount = computed(() => 
  tasks.value.filter(t => t.task.status === 'NEW').length
)
const transportingCount = computed(() => 
  tasks.value.filter(t => t.task.status === 'TRANSPORTING').length
)

onMounted(() => {
  loadTasks()
  getUserRole()
  fetchTransCounts()
})

onShow(() => {
  uni.hideTabBar({ animation: false })
})

// 获取用户角色
const getUserRole = () => {
  const userInfo = uni.getStorageSync('userInfo')
  userRole.value = (userInfo.role || '').toLowerCase()
}

// 拉取运送员统计数据
const fetchTransCounts = async () => {
  try {
    const res = await userApi.getFreeTransCount()
	console.log("运送员数量：",res)
    const counts = res  
    totalTransCount.value = counts.all
    freeTransCount.value  = counts.free
  } catch (e) {
    uni.showToast({
      title: e.message || '统计加载失败',
      icon: 'none'
    })
  }
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
    const tmp = await taskApi.getTasksByStatus('')
    // 过滤掉已完成，以「大厅」展示未完成
    const res = tmp.filter(task => task.status !== 'DELIVERED')
    if (refresh) {
      tasks.value = res
    } else {
      tasks.value.push(...res)
    }
    noMore.value = res.length < pageSize.value
    page.value++
  } catch (error) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
    if (refresh) isRefreshing.value = false
  }
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  await loadTasks(true)
}

// 上拉加载更多
const loadMore = () => loadTasks()

// 跳转到创建任务
const gotoCreateTask = () =>
  uni.navigateTo({ url: '/pages/doctor/create-task' })

// 显示任务详情
const showTaskDetail = async (item) => {
  try {
    const nodesRes = await taskApi.getTaskNodes(item.task.taskid)
    const nodes = nodesRes.map(n => ({
      ...n.node,
      departmentname: n.department.departmentname,
      departmentaddress: n.department.address,
    }))
	
	const files = await taskApi.getFiles(item.task.taskid);
	
    currentTask.value = {
      ...item.task,
      departmentname: item.department.departmentname,
      departmentaddress: item.department.address,
      nodes,
	  files 
    }
    taskDetailPopup.value.open()
  } catch (e) {
    uni.showToast({ title: e.message || '加载节点失败', icon: 'none' })
  }
}

// 关闭详情弹窗
const closeTaskDetail = () => {
  taskDetailPopup.value.close()
  setTimeout(() => (currentTask.value = null), 200)
}

// 接单处理
const handleAcceptTask = async (task) => {
  try {
    const userInfo = uni.getStorageSync('userInfo')
    await taskApi.acceptTask(task.taskid, userInfo.userid)
    uni.showToast({ title: '接单成功', icon: 'success' })
    await loadTasks(true)
    closeTaskDetail()
    uni.navigateTo({
      url: '/pages/transporter/active-task/active-task'
    })
  } catch (error) {
    uni.showToast({ title: error.message || '接单失败', icon: 'none' })
  }
}

// 工具函数
const getStatusText = (status) => ({
  NEW: '待接单',
  TRANSPORTING: '运送中',
  DELIVERED: '已完成',
}[status] || status)

const getPriorityClass = (priority) => ({
  normal: 'priority-normal',
  urgent: 'priority-urgent',
  critical: 'priority-critical'
}[priority] || '')

const getPriorityText = (priority) => ({
  normal: '普通',
  urgent: '紧急',
  critical: '特急'
}[priority] || '')

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = n => n < 10 ? '0'+n : n
  return `${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const getStatusClass = (status) => ({
  NEW: 'status-new',
  TRANSPORTING: 'status-transporting',
  DELIVERED: 'status-delivered'
}[status] || '')
</script>

<style lang="scss">
.task-pool {
  min-height: 100vh;
  background-color: #f8f8f8;

  /* —— 顶部统计栏 —— */
  .status-summary {
    position: fixed;       /* 固定在顶部 */
    top: 10;
    left: 0;
    right: 0;
    z-index: 9;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 20rpx 20rpx 0;
    background: #fff;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
    .status-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 160rpx;
      padding: 20rpx;
      border-radius: 12rpx;

      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
  
      &:hover {
        transform: translateY(-8rpx);
        box-shadow: 0 12rpx 24rpx rgba(0, 0, 0, 0.12);
      }
      .count {
        font-size: 36rpx;
        font-weight: bold;
        /* 文本渐变 */
        background-image: linear-gradient(45deg, #4facfe, #00f2fe);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 8rpx;
      }

      .label {
	    font-size: 24rpx;
	    color: #555;
      }
    }
  }

  /* 浮动加号按钮 */
  .fab-plus {
    position: fixed;
    right: 48rpx;
    bottom: 180rpx;
    width: 108rpx;
    height: 108rpx;
    border-radius: 50%;
    background: #007AFF;
    box-shadow: 0 8rpx 24rpx rgba(0,122,255,0.20);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9;
    border: none;
    padding: 0;
    margin: 0;

    .fab-icon {
      color: #fff;
      font-size: 72rpx;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      width: 1em;
      height: 1em;
      margin: 0;
      padding: 0;
    }
    &:active { opacity: 0.7; }
  }

  .task-list {
	padding-top: 160rpx;
    height: 100vh;
    
  }

  .task-item {
	position: relative; 
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
      
      .info-item {
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
      justify-content: flex-end;
      
      .accept-btn {
        width: 160rpx;
        height: 64rpx;
        line-height: 64rpx;
        background-color: #007AFF;
        color: #fff;
        font-size: 28rpx;
        border-radius: 32rpx;
        
        &:active {
          opacity: 0.8;
        }
      }
    }
	
	// 状态水印
	.status-watermark {
		position: absolute;
		right: 26rpx;
		bottom: 22rpx;
		font-size: 36rpx;    // 更大字体
		padding: 10rpx 36rpx;
		border-radius: 32rpx 0 20rpx 32rpx;
		font-weight: bold;
		opacity: 0.5;        // 更透明
		color: #fff;
		letter-spacing: 6rpx;
		pointer-events: none;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
		background: #bbb;
		z-index: 3;
		&.status-new {
		  background: linear-gradient(90deg, rgba(66,197,255,0.7) 0%, rgba(7,193,96,0.7) 100%);
		}
		&.status-transporting {
		  background: linear-gradient(90deg, rgba(255,179,0,0.7) 0%, rgba(255,131,77,0.7) 100%);
		}
		&.status-delivered {
		  background: linear-gradient(90deg, rgba(180,180,180,0.7) 0%, rgba(124,124,124,0.7) 100%);
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
    }
  }
}
</style>