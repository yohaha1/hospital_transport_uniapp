<template>
  <view class="create-task">
    <form @submit="handleSubmit">
      <!-- 基本信息 -->
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item">
          <text class="label">物品名称</text>
          <input 
            class="input" 
            v-model="formData.itemName" 
            placeholder="请输入物品名称"
          />
        </view>
        
        <view class="form-item">
          <text class="label">物品类型</text>
          <picker 
            class="picker" 
            :range="itemTypes" 
            @change="handleTypeChange"
          >
            <view class="picker-text">
              {{ formData.itemType || '请选择物品类型' }}
            </view>
          </picker>
        </view>
        
        <view class="form-item">
          <text class="label">紧急程度</text>
          <radio-group class="radio-group" @change="handlePriorityChange">
            <label class="radio" v-for="item in priorities" :key="item.value">
              <radio :value="item.value" :checked="formData.priority === item.value" />
              <text>{{ item.label }}</text>
            </label>
          </radio-group>
        </view>
      </view>
      
      <!-- 交接节点 -->
      <view class="form-section">
        <view class="section-title">
          <text>交接节点</text>
          <button class="add-btn" @click="addNode">添加节点</button>
        </view>
        
        <view 
          class="node-item" 
          v-for="(node, index) in formData.nodes" 
          :key="index"
        >
          <view class="node-header">
            <text class="node-title">节点 {{ index + 1 }}</text>
            <text class="delete-btn" @click="deleteNode(index)">删除</text>
          </view>
          
          <view class="form-item">
            <text class="label">科室</text>
            <picker 
              class="picker" 
              :range="departments" 
              @change="(e) => handleDepartmentChange(e, index)"
            >
              <view class="picker-text">
                {{ node.department || '请选择科室' }}
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="label">预计时间</text>
            <picker 
              class="picker" 
              mode="time" 
              @change="(e) => handleTimeChange(e, index)"
            >
              <view class="picker-text">
                {{ node.expectedTime || '请选择预计时间' }}
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="label">备注</text>
            <input 
              class="input" 
              v-model="node.remark" 
              placeholder="请输入备注信息"
            />
          </view>
        </view>
      </view>
      
      <!-- 附件上传 -->
      <view class="form-section">
        <view class="section-title">附件</view>
        <view class="upload-area">
          <view 
            class="image-item" 
            v-for="(item, index) in formData.files" 
            :key="index"
          >
            <image :src="item.path" mode="aspectFill"></image>
            <text class="delete-icon" @click="deleteFile(index)">×</text>
          </view>
          
          <view class="upload-btn" @click="chooseImage" v-if="formData.files.length < 3">
            <text class="iconfont icon-camera"></text>
            <text>上传图片</text>
          </view>
        </view>
      </view>
      
      <button class="submit-btn" form-type="submit">发起任务</button>
    </form>
  </view>
</template>

<script>
import taskApi from '@/api/task.js';

export default {
  data() {
    return {
      // 表单数据
      formData: {
        itemName: '',
        itemType: '',
        priority: 'normal',
        nodes: [{ department: '', expectedTime: '', remark: '' }],
        files: []
      },
      
      // 选项数据
      itemTypes: ['药品', '医疗器械', '化验样本', '其他'],
      priorities: [
        { label: '普通', value: 'normal' },
        { label: '紧急', value: 'urgent' },
        { label: '特急', value: 'critical' }
      ],
      departments: ['内科', '外科', '急诊科', '检验科', '药房'] // 实际应从后端获取
    };
  },
  
  methods: {
    // 选择器事件处理
    handleTypeChange(e) {
      this.formData.itemType = this.itemTypes[e.detail.value];
    },
    
    handlePriorityChange(e) {
      this.formData.priority = e.detail.value;
    },
    
    handleDepartmentChange(e, index) {
      this.formData.nodes[index].department = this.departments[e.detail.value];
    },
    
    handleTimeChange(e, index) {
      this.formData.nodes[index].expectedTime = e.detail.value;
    },
    
    // 节点管理
    addNode() {
      if (this.formData.nodes.length >= 5) {
        uni.showToast({
          title: '最多添加5个节点',
          icon: 'none'
        });
        return;
      }
      this.formData.nodes.push({ department: '', expectedTime: '', remark: '' });
    },
    
    deleteNode(index) {
      if (this.formData.nodes.length === 1) {
        uni.showToast({
          title: '至少需要一个节点',
          icon: 'none'
        });
        return;
      }
      this.formData.nodes.splice(index, 1);
    },
    
    // 文件管理
    async chooseImage() {
      try {
        const res = await uni.chooseImage({
          count: 1,
          sizeType: ['compressed']
        });
        
        this.formData.files.push({
          path: res.tempFilePaths[0]
        });
      } catch (error) {
        console.error('选择图片失败：', error);
      }
    },
    
    deleteFile(index) {
      this.formData.files.splice(index, 1);
    },
    
    // 表单提交
    async handleSubmit() {
      // 表单验证
      if (!this.formData.itemName || !this.formData.itemType) {
        uni.showToast({
          title: '请填写物品信息',
          icon: 'none'
        });
        return;
      }
      
      if (!this.formData.nodes.every(node => node.department && node.expectedTime)) {
        uni.showToast({
          title: '请完善节点信息',
          icon: 'none'
        });
        return;
      }
      
      try {
        const userInfo = uni.getStorageSync('userInfo');
        
        // 构建任务数据
        const taskData = {
          itemName: this.formData.itemName,
          itemType: this.formData.itemType,
          priority: this.formData.priority,
          creatorId: userInfo.id,
          departmentId: userInfo.departmentId,
          status: 'PENDING'
        };
        
        // 构建节点数据
        const nodeData = this.formData.nodes.map((node, index) => ({
          departmentId: node.department, // 实际应使用部门ID
          expectedTime: node.expectedTime,
          remark: node.remark,
          sequence: index + 1
        }));
        
        // 获取文件路径列表
        const files = this.formData.files.map(file => file.path);
        
        // 提交任务
        await taskApi.createTask(taskData, nodeData, files);
        
        uni.showToast({
          title: '任务创建成功',
          icon: 'success'
        });
        
        // 返回任务列表页
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        uni.showToast({
          title: error.message || '创建任务失败',
          icon: 'none'
        });
      }
    }
  }
};
</script>

<style lang="scss">
.create-task {
  padding: 30rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
  
  .form-section {
    background-color: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    
    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 32rpx;
      font-weight: bold;
      margin-bottom: 30rpx;
      
      .add-btn {
        font-size: 28rpx;
        color: #007AFF;
        background: none;
        padding: 0;
        
        &::after {
          border: none;
        }
      }
    }
  }
  
  .form-item {
    margin-bottom: 30rpx;
    
    .label {
      display: block;
      font-size: 28rpx;
      color: #666;
      margin-bottom: 10rpx;
    }
    
    .input {
      width: 100%;
      height: 80rpx;
      border: 2rpx solid #ddd;
      border-radius: 8rpx;
      padding: 0 20rpx;
      font-size: 28rpx;
    }
    
    .picker {
      width: 100%;
      height: 80rpx;
      border: 2rpx solid #ddd;
      border-radius: 8rpx;
      
      .picker-text {
        line-height: 80rpx;
        padding: 0 20rpx;
        font-size: 28rpx;
        color: #333;
      }
    }
    
    .radio-group {
      display: flex;
      flex-wrap: wrap;
      
      .radio {
        margin-right: 30rpx;
        font-size: 28rpx;
        
        text {
          margin-left: 8rpx;
        }
      }
    }
  }
  
  .node-item {
    background-color: #f8f8f8;
    border-radius: 16rpx;
    padding: 20rpx;
    margin-bottom: 20rpx;
    
    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      .node-title {
        font-size: 28rpx;
        font-weight: bold;
      }
      
      .delete-btn {
        color: #ff4d4f;
        font-size: 28rpx;
      }
    }
  }
  
  .upload-area {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    
    .image-item {
      position: relative;
      width: 200rpx;
      height: 200rpx;
      
      image {
        width: 100%;
        height: 100%;
        border-radius: 8rpx;
      }
      
      .delete-icon {
        position: absolute;
        top: -20rpx;
        right: -20rpx;
        width: 40rpx;
        height: 40rpx;
        line-height: 40rpx;
        text-align: center;
        background-color: rgba(0, 0, 0, 0.5);
        color: #fff;
        border-radius: 50%;
      }
    }
    
    .upload-btn {
      width: 200rpx;
      height: 200rpx;
      border: 2rpx dashed #ddd;
      border-radius: 8rpx;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #999;
      
      .iconfont {
        font-size: 48rpx;
        margin-bottom: 10rpx;
      }
      
      text {
        font-size: 24rpx;
      }
    }
  }
  
  .submit-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    background-color: #007AFF;
    color: #fff;
    font-size: 32rpx;
    border-radius: 44rpx;
    margin-top: 60rpx;
    
    &:active {
      opacity: 0.8;
    }
  }
}
</style> 