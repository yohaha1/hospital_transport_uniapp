<template>
  <view class="active-task">
    <!-- 只保留一个scroll-view，去掉页面其它滚动条相关的view -->
    <scroll-view
      scroll-y
      class="scroll-content"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <template v-if="currentTasks.length > 0">
        <view
          class="status-section"
          v-for="(currentTask, idx) in currentTasks"
          :key="currentTask.taskid"
          style="margin-bottom: 36rpx;"
        >
          <view class="status-card">
            <view class="status-header">
              <view class="left">
                <text class="type-tag">{{ currentTask.itemtype }}</text>
                <text class="item-name">{{ currentTask.itemname }}</text>
              </view>
              <text class="priority-tag" :class="getPriorityClass(currentTask.priority)">
                {{ getPriorityText(currentTask.priority) }}
              </text>
            </view>
            <view class="status-info">
              <text class="status-text">{{ getStatusText(currentTask.status) }}</text>
              <text class="time-text">{{ formatTime(currentTask.createtime) }}</text>
            </view>
            <view class="note-row" v-if="currentTask.note">
              <text class="note-icon">📝</text>
              <text class="note-label">备注：</text>
              <text class="note-content">{{ currentTask.note }}</text>
            </view>
            <view class="progress-section">
              <view class="section-title">运送进度</view>
              <view class="node-list">
                <view
                  class="node-item"
                  v-for="(node, index) in currentTask.nodes"
                  :key="node.departmentid"
                  :class="{
                    'completed': !!node.handovertime,
                    'current': !node.handovertime && isCurrentNode(currentTask.nodes, index)
                  }"
                >
                  <view class="node-line" v-if="index > 0"></view>
                  <view class="node-dot"></view>
                  <view class="node-info">
                    <text class="department">{{ node.departmentname }}</text>
                    <text class="time" v-if="node.handovertime">交接时间：{{ formatTime(node.handovertime) }}</text>
                    <text class="time" v-else>等待交接</text>
                  </view>
                </view>
              </view>
            </view>
            <!-- 操作按钮根据节点状态显示 -->
            <view class="action-section">
              <button
                class="action-btn primary"
                v-if="shouldShowStartButton(currentTask)"
                @click.stop="handleStart(currentTask)"
              >
                开始运送
              </button>
              <button
                class="action-btn primary"
                v-if="shouldShowHandoverButton(currentTask)"
                @click.stop="handleHandover(currentTask)"
              >
                交接确认
              </button>
            </view>
          </view>
        </view>
      </template>
	  
      <view class="empty-state" v-else>
        <image src="/static/images/empty.png" mode="aspectFit"></image>
        <text>暂无进行中的任务</text>
        <button class="nav-btn" @click="navigateToTaskPool">
          去接单
        </button>
      </view>
	  
    </scroll-view>
	
    <!-- 二维码弹窗 -->
    <uni-popup ref="qrCodePopup" type="center">
      <view class="qr-popup">
        <view class="popup-header">
          <text class="title">扫描交接二维码</text>
          <text class="close-btn" @click="closeQrCodePopup">×</text>
        </view>
        <view class="popup-content">
          <button class="scan-btn" @click="startScan">点击扫码</button>
        </view>
      </view>
    </uni-popup>

    <!-- 附件上传弹窗 -->
    <uni-popup ref="filePopup" type="center">
      <view class="file-popup">
        <view class="popup-header">
          <text class="title">上传交接附件</text>
          <text class="close-btn" @click="closeFilePopup">×</text>
        </view>
        <view class="popup-content">
          <view class="upload-area">
            <view
              class="image-item"
              v-for="(f, i) in currentAction.files"
              :key="i"
            >
              <image :src="f.url" mode="aspectFill" />
              <text class="delete-icon" @click="removeFile(i)">×</text>
            </view>
            <view
              class="upload-btn"
              @click="chooseImage"
              v-if="currentAction.files.length < 3"
            >
              <text class="iconfont icon-camera"></text>
              <text>上传图片</text>
            </view>
          </view>
          <button
            class="photo-btn confirm"
            @click="confirmAction"
          >确认提交</button>
        </view>
      </view>
    </uni-popup>


    <tabBar :selectedIndex="1"/>
  </view>
</template>

<script setup>
import { ref, onMounted,toRaw } from 'vue'
import taskApi from '@/api/task.js'

const currentTasks = ref([])
const qrCodeData = ref('')
const isRefreshing = ref(false)

const qrCodePopup = ref(null)
const filePopup = ref(null)

const priorityMap = {
  0: 'normal',
  1: 'urgent',
  2: 'critical'
}

const currentAction = ref({
  type: '',       // pickup | handover
  task: null,
  qrData: '',     // 扫码获取的数据 
  files: [] ,
})

onMounted(() => {
  console.log('qr:', qrCodePopup.value, 'file:', filePopup.value)
  loadCurrentTasks()
})

const onRefresh = async () => {
  isRefreshing.value = true
  await loadCurrentTasks(true)
  isRefreshing.value = false
}

const loadCurrentTasks = async (refresh = false) => {
  try {
    const userInfo = uni.getStorageSync('userInfo')
    const res = await taskApi.getTransporterTaskRecords(userInfo.userid, {
      status: 'TRANSPORTING'
    })
    if (Array.isArray(res) && res.length > 0) {
      const tasksWithNodes = await Promise.all(res.map(async item => {
        const flatTask = {
          ...item.task,
          ...item.department
        }
        const nodesRaw = await taskApi.getTaskNodes(item.task.taskid)
        const nodes = (nodesRaw || []).map(n => ({
          ...n.node,
          ...n.department
        }))
        return { ...flatTask, nodes }
      }))
      currentTasks.value = tasksWithNodes
	  console.log("tsettttttttttt",toRaw(currentTasks.value))
    } else {
      currentTasks.value = []
    }
  } catch (error) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none'
    })
  }
}

// 状态判断逻辑
const shouldShowStartButton = (task) => {
  return !task.nodes[0]?.handovertime
}

const shouldShowHandoverButton = (task) => {
  return task.nodes[0]?.handovertime && task.nodes.some(n => !n.handovertime)
}

const isCurrentNode = (nodes, index) => {
  if (!nodes) return false
  const firstUnfinished = nodes.findIndex(node => !node.handovertime)
  return index === firstUnfinished
}

// 操作处理逻辑
const handleStart = async (task) => {
  currentAction.value = {
    type: 'pickup',
    task,
  }
  openQrCodePopup()
}

const handleHandover = async (task) => {
  const currentNode = task.nodes.find(n => !n.handovertime)
  currentAction.value = {
    type: 'handover',
    task,
  }
  openQrCodePopup()
}

// 二维码扫描
const startScan = async () => {
  try {
    const res = await uni.scanCode()
    if (!res.result) throw new Error('扫码失败')
    
    currentAction.value.qrData = res.result
	console.log("扫码数据：",res.result)
    qrCodePopup.value.close()
    filePopup.value?.open()
  } catch (error) {
    handleError('扫码失败', error)
  }
}

// 选择图片
function chooseImage() {
  uni.chooseImage({
    count: 3-currentAction.value.files.length,
    success(res) {
      res.tempFilePaths.forEach(p=>{
        currentAction.value.files.push({ url:p, path:p })
      })
    }
  })
}
function removeFile(i) {
  currentAction.value.files.splice(i,1)
}

// 确认提交：先接口再循环上传
async function confirmAction() {
  try {
    const { type, task, qrData, files } = currentAction.value
    const uid = uni.getStorageSync('userInfo').userid
    // 调用 pickup 或 handover
    if (type==='pickup') {
      await taskApi.startTask(task.taskid, uid, qrData)
    } else {
      const dept = task.nodes.find(n=>!n.handovertime)?.departmentid||''
      await taskApi.handOverTask(task.taskid, uid, dept, qrData)
    }
    // 循环上传
    for (const f of files) {
      await taskApi.uploadTaskFile(task.taskid, type.toUpperCase(), f.path)
    }
    uni.showToast({ title:'提交成功', icon:'success' })
    closeFilePopup()
    await loadCurrentTasks(true)
	resetAction()
  } catch (e) {
    uni.showToast({ title:e.message||'提交失败', icon:'none' })
  }
}

const handleError = (msg, error) => {
  console.error(error)
  uni.showToast({
    title: error.message || msg,
    icon: 'none'
  })
  resetAction()
}
// 辅助方法
const resetAction = () => {
  currentAction.value = { type: '', task: null, qrData: '', files: [] }
  closeFilePopup()
}

const openQrCodePopup = () => {
  currentAction.value.files = []
  qrCodePopup.value.open()
}
const closeQrCodePopup = () => {
  qrCodePopup.value.close()
}
const openFilePopup = () => {
  currentAction.value.files = []
  filePopup.value.open()
}
const closeFilePopup = () => {
  filePopup.value.close()
}

const navigateToTaskPool = () => {
  uni.switchTab({
    url: '/pages/transporter/task-pool/task-pool'
  })
}

const getPriorityClass = (priority) => {
  const classes = {
    normal: 'priority-normal',
    urgent: 'priority-urgent',
    critical: 'priority-critical'
  }
  return classes[priorityMap[priority] || priority] || ''
}

const getPriorityText = (priority) => {
  const texts = {
    normal: '普通',
    urgent: '紧急',
    critical: '特急'
  }
  return texts[priorityMap[priority] || priority] || ''
}

const getStatusText = (status) => {
  const texts = {
    TRANSPORTING: '运送中',
    COMPLETED: '已完成'
  }
  return texts[status] || status
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = n => n < 10 ? '0' + n : n
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
</script>

<style lang="scss">
.active-task {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding: 0 30rpx;

  .scroll-content {
    height: 100vh;
    overflow: hidden;
	padding: 30rpx 0 160rpx 0;
  }

  .status-section {
    margin-bottom: 30rpx;

    .status-card {
      background-color: #fff;
      border-radius: 20rpx;
      padding: 30rpx;
      box-shadow: 0 4rpx 24rpx 0 rgba(0,0,0,0.04);

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
        margin-bottom: 10rpx;
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
      .note-row {
        display: flex;
        align-items: flex-start;
        margin-top: 10rpx;
        background: #fffbe6;
        border-radius: 10rpx;
        padding: 10rpx 14rpx;
        font-size: 26rpx;
        .note-icon {
          margin-right: 6rpx;
          color: #faad14;
        }
        .note-label {
          font-weight: bold;
          color: #faad14;
          margin-right: 4rpx;
        }
        .note-content {
          color: #8c6f1a;
          word-break: break-all;
          flex: 1;
        }
      }
      .progress-section {
        background-color: #fff;
        border-radius: 12rpx;
        padding: 30rpx 0 0 0;
        margin-bottom: 0;

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
      }
      .action-section {
        margin-top: 32rpx;
        padding: 0 10rpx 0 10rpx;
        text-align: center;
        .action-btn {
          width: 100%;
          height: 88rpx;
          line-height: 88rpx;
          border-radius: 44rpx;
          font-size: 32rpx;
          font-weight: bold;
          box-shadow: 0 4rpx 16rpx rgba(0,122,255,0.08);
          &.primary {
            background-color: #007AFF;
            color: #fff;
            &:active {
              opacity: 0.8;
            }
          }
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

/* 自定义弹窗样式 */
.qr-popup , .file-popup {
  width: 90%;
  max-width: 700rpx;
  min-height: 400rpx; 
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  .scan-btn {
    width: 60%;
    height: 100rpx;
    background: #007AFF;
    color: white;
    border-radius: 50rpx;
    margin: 40rpx auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
  }
  .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 28rpx 32rpx;
      background: #f8f8f8;
      border-bottom: 2rpx solid #eee;
  
      /* 标题样式 */
      .title {
        font-size: 34rpx;
        font-weight: 600;
        color: #333;
        letter-spacing: 1rpx;
        max-width: 80%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
  
      /* 关闭按钮 */
      .close-btn {
        font-size: 48rpx;
        color: #999;
        padding: 0 20rpx;
        transition: color 0.2s;
        line-height: 1;
  
        &:active {
          color: #666;
        }
      }
	}
	  .popup-content {
	    padding: 40rpx 32rpx;
		min-height: 400rpx; 
	    .scan-btn {
	      width: 100%;
	      height: 88rpx;
	      line-height: 88rpx;
	      background: #007AFF;
	      color: white;
	      border-radius: 44rpx;
	      font-size: 32rpx;
	      transition: opacity 0.2s;
	
	      &:active {
	        opacity: 0.8;
	      }
	    }
	}
}


.file-popup .confirm{display:block;margin:40rpx auto;font-size:32rpx;width:60%;height:88rpx;line-height:88rpx;background:#007AFF;color:#fff;border-radius:44rpx;}
.file-popup .upload-area{display:flex;flex-wrap:wrap;gap:20rpx;padding:30rpx;}
.file-popup .image-item{position:relative;width:240rpx;height:240rpx;}
.file-popup image{width:100%;height:100%;border-radius:8rpx;}
.file-popup .delete-icon{position:absolute;top:-20rpx;right:-20rpx;width:40rpx;height:40rpx;line-height:40rpx;text-align:center;background:rgba(0,0,0,0.5);color:#fff;border-radius:50%;}
.file-popup .upload-btn{width:240rpx;height:240rpx;border:2rpx dashed #ddd;border-radius:8rpx;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#999;}
.file-popup .iconfont{font-size:48rpx;margin-bottom:10rpx;}
/* 动态节点样式 */
.node-item {
  &.current {
    .node-dot {
      animation: pulse 1.5s infinite;
      background: #007AFF;
    }
  }
  
  &.completed {
    .node-dot {
      background: #52c41a;
    }
  }
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}
</style>