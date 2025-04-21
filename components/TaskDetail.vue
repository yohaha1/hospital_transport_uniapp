<template>
  <view class="task-detail" v-if="task">
    <view class="detail-header">
      <text class="title">任务详情</text>
      <text class="close-btn" @click="$emit('close')">×</text>
    </view>
    <scroll-view class="detail-content" scroll-y>
      <view class="detail-section">
        <view class="section-title">基本信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">物品名称</text>
            <text class="value">{{ task.itemName }}</text>
          </view>
          <view class="info-item">
            <text class="label">物品类型</text>
            <text class="value">{{ task.itemType }}</text>
          </view>
          <view class="info-item">
            <text class="label">紧急程度</text>
            <text class="value" :class="getPriorityClass(task.priority)">
              {{ getPriorityText(task.priority) }}
            </text>
          </view>
        </view>
      </view>
      <view class="detail-section">
        <view class="section-title">交接节点</view>
        <view class="node-list">
          <view 
            class="node-item"
            v-for="(node, index) in task.nodes"
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
      <view class="detail-section" v-if="task.files && task.files.length">
        <view class="section-title">附件</view>
        <view class="image-list">
          <image 
            v-for="(file, index) in task.files"
            :key="index"
            :src="file.url"
            mode="aspectFill"
            @click="previewImage(file.url)"
          ></image>
        </view>
      </view>
    </scroll-view>
    <view class="detail-footer">
      <slot name="footer">
        <button 
          class="accept-btn" 
          @click="$emit('accept', task)"
        >接单</button>
      </slot>
    </view>
  </view>
</template>

<script>
export default {
  name: "TaskDetail",
  props: {
    task: Object,
    getPriorityClass: Function,
    getPriorityText: Function
  },
  methods: {
    previewImage(url) {
      if (!this.task.files) return;
      uni.previewImage({
        urls: this.task.files.map(file => file.url),
        current: url
      });
    }
  }
}
</script>

<style scoped>
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