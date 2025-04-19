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
            <text class="label">运送员：</text>
            <text class="value">{{ task.transporterName || '待接单' }}</text>
          </view>
          <view class="info-row">
            <text class="label">发起时间：</text>
            <text class="value">{{ formatTime(task.createTime) }}</text>
          </view>
          <view class="info-row">
            <text class="label">当前位置：</text>
            <text class="value">{{ task.currentNode?.department || '-' }}</text>
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
        <text>暂无任务记录</text>
        <button class="create-btn" @click="navigateToCreate">
          发起任务
        </button>
      </view>
    </scroll-view>
    
    <!-- 任务详情弹窗 -->
    <uni-popup ref="taskDetailPopup" type="bottom">
      <view class="task-detail">
        <view class="detail-header">
          <text class="title">任务详情</text>
          <text class="close-btn" @click="closeTaskDetail">×</text>
        </view>
        
        <scroll-view class="detail-content" scroll-y>
          <template v-if="currentTask">
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
                  <text class="label">运送员</text>
                  <text class="value">{{ currentTask.transporterName || '待接单' }}</text>
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
          </template>
        </scroll-view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import taskApi from '@/api/task.js';

export default {
  data() {
    return {
      // 状态筛选选项
      statusFilters: [
        { label: '全部', value: 'ALL' },
        { label: '待接单', value: 'PENDING' },
        { label: '运送中', value: 'PROCESSING' },
        { label: '已完成', value: 'COMPLETED' }
      ],
      currentStatus: 'ALL',
      
      // 列表数据
      tasks: [],
      page: 1,
      pageSize: 10,
      isLoading: false,
      noMore: false,
      isRefreshing: false,
      
      // 当前选中的任务
      currentTask: null
    };
  },
  
  onLoad() {
    this.loadTasks();
  },
  
  methods: {
    // 加载任务列表
    async loadTasks(refresh = false) {
      if (refresh) {
        this.page = 1;
        this.noMore = false;
      }
      
      if (this.isLoading || this.noMore) return;
      
      this.isLoading = true;
      
      try {
        const userInfo = uni.getStorageSync('userInfo');
        if (!userInfo || !userInfo.departmentId) {
          throw new Error('Department ID is missing for the user.');
        }
        const params = {
          status: this.currentStatus === 'ALL' ? null : this.currentStatus,
          startDate: this.startDate,
          endDate: this.endDate
        };
        
        const res = await taskApi.getDepartmentTasks(userInfo.departmentid, params);
        
        if (refresh) {
          this.tasks = res;
        } else {
          this.tasks = [...this.tasks, ...res];
        }
        
        this.noMore = res.length < this.pageSize;
        this.page++;
      } catch (error) {
        uni.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      } finally {
        this.isLoading = false;
        if (refresh) {
          this.isRefreshing = false;
        }
      }
    },
    
    // 状态筛选
    handleFilterChange(status) {
      if (this.currentStatus === status) return;
      this.currentStatus = status;
      this.loadTasks(true);
    },
    
    // 下拉刷新
    async onRefresh() {
      this.isRefreshing = true;
      await this.loadTasks(true);
    },
    
    // 上拉加载更多
    loadMore() {
      this.loadTasks();
    },
    
    // 显示任务详情
    async showTaskDetail(task) {
      try {
        // 获取任务节点详情
        const nodes = await taskApi.getTaskNodes(task.id);
        this.currentTask = {
          ...task,
          nodes
        };
        this.$refs.taskDetailPopup.open();
      } catch (error) {
        uni.showToast({
          title: error.message || '获取详情失败',
          icon: 'none'
        });
      }
    },
    
    // 关闭任务详情
    closeTaskDetail() {
      this.$refs.taskDetailPopup.close();
      setTimeout(() => {
        this.currentTask = null;
      }, 200);
    },
    
    // 页面导航
    navigateToCreate() {
      uni.navigateTo({
        url: '/pages/nurse/create-task/create-task'
      });
    },
    
    // 预览图片
    previewImage(url) {
      uni.previewImage({
        urls: [url],
        current: url
      });
    },
    
    // 工具方法
    getPriorityClass(priority) {
      const classes = {
        normal: 'priority-normal',
        urgent: 'priority-urgent',
        critical: 'priority-critical'
      };
      return classes[priority] || '';
    },
    
    getPriorityText(priority) {
      const texts = {
        normal: '普通',
        urgent: '紧急',
        critical: '特急'
      };
      return texts[priority] || '';
    },
    
    getStatusClass(status) {
      const classes = {
        PENDING: 'status-pending',
        ACCEPTED: 'status-accepted',
        PROCESSING: 'status-processing',
        COMPLETED: 'status-completed'
      };
      return classes[status] || '';
    },
    
    getStatusText(status) {
      const texts = {
        PENDING: '待接单',
        ACCEPTED: '待开始',
        PROCESSING: '运送中',
        COMPLETED: '已完成'
      };
      return texts[status] || '';
    },
    
    getNodeStatusText(status) {
      const texts = {
        PENDING: '待到达',
        PROCESSING: '进行中',
        COMPLETED: '已完成'
      };
      return texts[status] || '';
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes()}`;
    }
  }
};
</script>

<style lang="scss">
.task-list {
  min-height: 100vh;
  background-color: #f8f8f8;
  
  .filter-section {
    background-color: #fff;
    padding: 20rpx 0;
    position: fixed;
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
  
  .task-scroll {
    height: calc(100vh - 100rpx);
    margin-top: 100rpx;
    padding: 20rpx;
  }
  
  .task-item {
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
            
            &.priority-normal,
            &.priority-urgent,
            &.priority-critical,
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