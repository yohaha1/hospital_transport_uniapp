<template>
  <view class="handover-container">
    <scroll-view 
	scroll-y 
	class="task-scroll"
	:refresher-enabled="true"               
	:refresher-triggered="isRefreshing"     
	@refresherrefresh="onRefresh"          
	@scrolltolower="loadMore"
	>
      <view v-for="item in tasks" :key="item.task.taskid" class="task-item">
        <view class="task-header">
			<view class="left">
			  <text class="task-type">{{ item.task.itemtype }}</text>
			  <text class="task-name">{{ item.task.itemname }}</text>
			</view>
			<view
			  class="priority-tag"
			  :class="getPriorityClass(item.task.priority)">
			  {{ getPriorityText(item.task.priority) }}
			</view>
        </view>
        <view class="task-info">
          <text>创建者：{{ item.doctorName}}</text>
          <text>运送员：{{ item.transporterName }}</text>
          <text>发起时间：{{ formatTime(item.task.createtime) }}</text>
		  <text>节点进度：</text>
        </view>
		
		<!-- 节点进度条:  -->
		<view
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
		
		<button
		  v-if="toHandoverIds.includes(item.task.taskid)"
		  class="confirm-btn"
		  @click="confirmHandover(item.task.taskid,item.task.transid)"
		>
		  确认交接
		</button>
      </view>
	  
		<!-- 上拉加载更多提示 -->
		<view class="loading-status" v-if="!noMore">
		  <text v-if="isLoading">加载中...</text>
		</view>
		<view class="loading-status" v-else>
		  <text>没有更多了</text>
		</view>
    </scroll-view>
	
	<tabBar :selectedIndex= '1'/>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import taskApi from '@/api/task.js'

const tasks = ref([])
const toHandoverIds = ref([])
const userInfo = uni.getStorageSync('userInfo')
const priorityMap = { 0: 'normal', 1: 'urgent', 2: 'critical' }
const getPriorityClass = p => ['priority-normal','priority-urgent','priority-critical'][p] || ''

// 分页及刷新状态
const isLoading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)


const handleNotice = (taskId) => {
	console.log('接收到的notice中的taskid',taskId)
	toHandoverIds.value.push(taskId)
}

const isCurrentNode = (node, index, nodes) => {
  const lastCompleted = nodes.findIndex(n => !n.handovertime) - 1
  return index === lastCompleted + 1
}

// 获取任务和待交接ID
const fetchTasks = async (refresh = false) => {
  if (refresh) {
    page.value = 1
    noMore.value = false
	isRefreshing.value = true
  }
  if (isLoading.value || noMore.value) return

  isLoading.value = true
  
  const departmentId = userInfo.departmentid
  try {
    const res = await taskApi.getDepartmentHandoverTasks(departmentId)
	
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
	console.log("testtttttttttttttttttt",tasks.value)
	
	noMore.value = withNodes.length < pageSize.value
	page.value++
  } catch (error) {
    uni.showToast({ title: '任务获取失败', icon: 'none' })
  } finally {
    isLoading.value = false
    isRefreshing.value = false // 无论成功/失败都关闭刷新状态
  }
}

// 确认交接
const confirmHandover = async (taskId,transId) => {
  const departmentId = userInfo.departmentid
  // console.log('确认交接的参数:', taskId, transId, departmentId)
  try {
    await taskApi.handOverConfirm(taskId, transId, departmentId)
    uni.showToast({ title: '交接成功', icon: 'success' })
    // 从待交接列表中移除
    toHandoverIds.value = toHandoverIds.value.filter(id => id !== taskId)
    // 更新 UI
    fetchTasks()
  } catch (error) {
    uni.showToast({ title: '交接失败', icon: 'none' })
  }
}

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

// 下拉刷新
const onRefresh = async () => {
  await fetchTasks(true)
}

// 上拉加载更多
const loadMore = () => {
  fetchTasks(false)
}

onMounted(() => {
	fetchTasks()
	// console.log('[钩子] onShow：订阅 handleNotice')
	// uni.$on('handoverTaskId', handleNotice);
    const cached = uni.getStorageSync('pendingHandoverIds') || []
    if (cached.length) {
      toHandoverIds.value.push(...cached)
    }
}) 

onShow(() => {
})

onUnload(() => {
	// uni.$off('handoverTaskId', handleNotice);
})


</script>

<style scoped lang="scss">
.handover-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.task-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20rpx;
}

.task-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.05);
}

.task-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
  .left {
    display: flex;
    align-items: center;
    
    .task-type {
      padding: 4rpx 12rpx;
      background-color: #e6f7ff;
      color: #1890ff;
      border-radius: 4rpx;
      font-size: 24rpx;
      margin-right: 16rpx;
    }
    
    .task-name {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  // 优先级标签右上角
  .priority-tag {
    padding: 4rpx 12rpx;
    border-radius: 4rpx;
    font-size: 28rpx;
  		
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
  font-size: 28rpx;
  color: #666;
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.confirm-btn {
  margin-top: 20rpx;
  background-color: #409eff;
  color: #fff;
  font-size: 26rpx;
  border-radius: 12rpx;
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

/* 加载状态 */
.loading-status {
  text-align: center;
  padding: 20rpx;
  font-size: 28rpx;
  color: #999;
}
</style>
