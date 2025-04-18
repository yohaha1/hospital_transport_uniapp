<template>
  <view class="task-pool">
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
        v-for="task in tasks" 
        :key="task.id"
        @click="showTaskDetail(task)"
      >
        <view class="task-header">
          <view class="left">
            <text class="type-tag">{{ task.itemType }}</text>
            <text class="item-name">{{ task.itemName }}</text>
          </view>
          <text class="priority-tag" :class="getPriorityClass(task.priority)">
            {{ getPriorityText(task.priority) }}
          </text>
        </view>
        
        <view class="task-info">
          <view class="info-item">
            <text class="label">发起科室：</text>
            <text class="value">{{ task.departmentName }}</text>
          </view>
          <view class="info-item">
            <text class="label">发起时间：</text>
            <text class="value">{{ formatTime(task.createTime) }}</text>
          </view>
          <view class="info-item">
            <text class="label">交接节点：</text>
            <text class="value">{{ task.nodes.length }}个</text>
          </view>
        </view>
        
        <view class="task-footer">
          <button 
            class="accept-btn" 
            @click.stop="handleAcceptTask(task)"
          >接单</button>
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
        <text>暂无待接单任务</text>
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
              </view>
            </view>
            
            <view class="detail-section">
              <view class="section-title">交接节点</view>
              <view class="node-list">
                <view 
                  class="node-item"
                  v-for="(node, index) in currentTask.nodes"
                  :key="index"
                >
                  <view class="node-index">{{ index + 1 }}</view>
                  <view class="node-info">
                    <text class="department">{{ node.department }}</text>
                    <text class="time">预计{{ node.expectedTime }}</text>
                    <text class="remark" v-if="node.remark">备注：{{ node.remark }}</text>
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
        
        <view class="detail-footer">
          <button 
            class="accept-btn" 
            @click="handleAcceptTask(currentTask)"
          >接单</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import taskApi from '@/api/task.js';

export default {
  data() {
    return {
      tasks: [],
      currentTask: null,
      page: 1,
      pageSize: 10,
      isLoading: false,
      noMore: false,
      isRefreshing: false
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
        const res = await taskApi.getPendingTasks();
        
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
    showTaskDetail(task) {
      this.currentTask = task;
      this.$refs.taskDetailPopup.open();
    },
    
    // 关闭任务详情
    closeTaskDetail() {
      this.$refs.taskDetailPopup.close();
      setTimeout(() => {
        this.currentTask = null;
      }, 200);
    },
    
    // 接单处理
    async handleAcceptTask(task) {
      try {
        const userInfo = uni.getStorageSync('userInfo');
        await taskApi.acceptTask(task.id, userInfo.id);
        
        uni.showToast({
          title: '接单成功',
          icon: 'success'
        });
        
        // 刷新列表
        this.loadTasks(true);
        
        // 关闭详情弹窗
        if (this.$refs.taskDetailPopup.isOpen()) {
          this.closeTaskDetail();
        }
        
        // 跳转到进行中任务页面
        uni.navigateTo({
          url: '/pages/transporter/active-task/active-task'
        });
      } catch (error) {
        uni.showToast({
          title: error.message || '接单失败',
          icon: 'none'
        });
      }
    },
    
    // 获取优先级样式类
    getPriorityClass(priority) {
      const classes = {
        normal: 'priority-normal',
        urgent: 'priority-urgent',
        critical: 'priority-critical'
      };
      return classes[priority] || '';
    },
    
    // 获取优先级文本
    getPriorityText(priority) {
      const texts = {
        normal: '普通',
        urgent: '紧急',
        critical: '特急'
      };
      return texts[priority] || '';
    },
    
    // 格式化时间
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes()}`;
    },
    
    // 预览图片
    previewImage(url) {
      uni.previewImage({
        urls: this.currentTask.files.map(file => file.url),
        current: url
      });
    }
  }
};
</script>

<style lang="scss">
.task-pool {
  min-height: 100vh;
  background-color: #f8f8f8;
  
  .task-list {
    height: 100vh;
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

.task-detail {
  background-color: #fff;
  border-radius: 40rpx 40rpx 0 0;
  
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
    max-height: 800rpx;
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
            &.priority-critical {
              padding: 4rpx 12rpx;
              border-radius: 4rpx;
            }
          }
        }
      }
      
      .node-list {
        .node-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 30rpx;
          
          .node-index {
            width: 40rpx;
            height: 40rpx;
            line-height: 40rpx;
            text-align: center;
            background-color: #007AFF;
            color: #fff;
            border-radius: 50%;
            font-size: 24rpx;
            margin-right: 20rpx;
          }
          
          .node-info {
            flex: 1;
            
            .department {
              display: block;
              font-size: 28rpx;
              color: #333;
              margin-bottom: 8rpx;
            }
            
            .time {
              display: block;
              font-size: 24rpx;
              color: #666;
              margin-bottom: 8rpx;
            }
            
            .remark {
              display: block;
              font-size: 24rpx;
              color: #999;
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
  
  .detail-footer {
    padding: 30rpx;
    border-top: 2rpx solid #f0f0f0;
    
    .accept-btn {
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      background-color: #007AFF;
      color: #fff;
      font-size: 32rpx;
      border-radius: 44rpx;
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}
</style> 