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
        <view class="info-row">
          <text class="label">发起科室：</text>
          <text class="value">{{ task.departmentName }}</text>
        </view>
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
                <text class="department">{{ node.department }}</text>
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
    </scroll-view>
    <view class="detail-footer">
      <slot name="footer">
        <button 
		  v-if = "userRole === 'transporter' && task.status === 'NEW'"
          class="accept-btn" 
          @click="$emit('accept', task)"
        >接单</button>
      </slot>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
	
const props = defineProps({
  task: Object,
  userRole: String
})
// 打印传入 task 的变化
import { watch } from 'vue'
import { toRaw } from 'vue'

watch(
  () => props.task,
  (newTask) => {
    console.log('taskDetail的task变化:', toRaw(newTask))
	// {
	// 	"taskid": 9,
	// 	"itemname": "医疗物资",
	// 	"itemtype": "药品",
	// 	"priority": 1,
	// 	"status": "TRANSPORTING",
	// 	"note": "易碎",
	// 	"createtime": "2025-04-10T00:29:11.000+00:00",
	// 	"completion": null,
	// 	"docid": 5,
	// 	"transid": 6,
	// 	"departmentName": "临床科室",
	// 	"departmentAddress": null,
	// 	"nodes": [{
	// 		"taskid": 9,
	// 		"departmentid": 101,
	// 		"sequence": 1,
	// 		"handovertime": "2025-04-19T07:21:56.000+00:00",
	// 		"department": "后勤管理部门",
	// 		"departmentAddress": null
	// 	}, {
	// 		"taskid": 9,
	// 		"departmentid": 102,
	// 		"sequence": 2,
	// 		"handovertime": null,
	// 		"department": "临床科室",
	// 		"departmentAddress": null
	// 	}, {
	// 		"taskid": 9,
	// 		"departmentid": 103,
	// 		"sequence": 3,
	// 		"handovertime": null,
	// 		"department": "药房与供应室",
	// 		"departmentAddress": null
	// 	}]
	// }
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
</style>