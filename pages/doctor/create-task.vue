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
            v-model="formData.itemname"
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
              {{ formData.itemtype || '请选择物品类型' }}
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">紧急程度</text>
          <radio-group class="radio-group" @change="handlePriorityChange">
            <label class="radio" v-for="item in priorities" :key="item.value">
              <radio :value="String(item.value)" :checked="String(formData.priority) === String(item.value)" />
              <text>{{ item.label }}</text>
            </label>
          </radio-group>
        </view>
        <view class="form-item">
          <text class="label">任务备注</text>
          <input
            class="input"
            v-model="formData.note"
            placeholder="请输入备注"
          />
        </view>
      </view>

      <!-- 交接节点 -->
      <view class="form-section">
        <view class="section-title">
          <text>交接节点</text>
          <button class="add-btn" type="button" @click="addNode">添加节点</button>
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
              :range="departments.map(dep => dep.departmentname)"
              @change="(e) => handleDepartmentChange(e, index)"
            >
              <view class="picker-text">
                {{ node.departmentName || '请选择科室' }}
              </view>
            </picker>
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
            <image :src="item.url" mode="aspectFill"></image>
            <text class="delete-icon" @click="deleteFile(index)">×</text>
          </view>

          <view class="upload-btn" @click="chooseImage" v-if="formData.files.length < 3">
            <text class="iconfont icon-camera"></text>
            <text>上传图片</text>
          </view>
        </view>
      </view>

      <button class="submit-btn" form-type="submit" type="submit">发起任务</button>
    </form>
    <!-- 隐藏的input用于选择图片文件 -->
    <input type="file" accept="image/*" capture="camera" style="display:none" ref="fileInput" @change="onFileInputChange" />
  </view>
</template>

<script setup>
import { ref, onMounted, toRaw } from 'vue'
import taskApi from '@/api/task.js'

const formData = ref({
  itemname: '',
  itemtype: '',
  priority: 0, // 0普通 1紧急 2特急
  note: '',
  nodes: [{ departmentId: '', departmentName: '' }],
  files: [] // {file: File, url: string}
})

const itemTypes = ['药品', '医疗器械', '化验样本', '其他']
const priorities = [
  { label: '普通', value: 0 },
  { label: '紧急', value: 1 },
  { label: '特急', value: 2 }
]
const departments = ref([])

// 获取部门列表
onMounted(async () => {
  try {
    const res = await taskApi.getDepartments()
    departments.value = Array.isArray(res) ? res : [],
	console.log("所有部门信息：",toRaw(departments.value))
  } catch (e) {
    uni.showToast({ title: '获取科室失败', icon: 'none' })
  }
})

// 选择器事件处理
const handleTypeChange = (e) => {
  formData.value.itemtype = itemTypes[e.detail.value]
}

const handlePriorityChange = (e) => {
  formData.value.priority = Number(e.detail.value)
}

const handleDepartmentChange = (e, index) => {
  const selectIdx = e.detail.value
  const dep = departments.value[selectIdx]
  formData.value.nodes[index].departmentId = dep.departmentid
  formData.value.nodes[index].departmentName = dep.departmentname
}

// 节点管理
const addNode = () => {
  if (formData.value.nodes.length >= 5) {
    uni.showToast({
      title: '最多添加5个节点',
      icon: 'none'
    })
    return
  }
  formData.value.nodes.push({ departmentId: '', departmentName: '' })
}

const deleteNode = (index) => {
  if (formData.value.nodes.length === 1) {
    uni.showToast({
      title: '至少需要一个节点',
      icon: 'none'
    })
    return
  }
  formData.value.nodes.splice(index, 1)
}

//用uni.chooseImage选图，然后用uni.getFileSystemManager读取真实文件后上传
const chooseImage = async () => {
  uni.chooseImage({
    count: 3 - formData.value.files.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: res => {
      res.tempFilePaths.forEach(filePath => {
        formData.value.files.push({ url: filePath, path: filePath })
      })
    }
  })
}

const fileInput = ref()
const triggerChooseFile = () => {
  if (fileInput.value) fileInput.value.click()
}

const onFileInputChange = (e) => {
  const files = Array.from(e.target.files)
  files.forEach(file => {
    const url = URL.createObjectURL(file)
    formData.value.files.push({ file, url })
  })
}

const deleteFile = (index) => {
  formData.value.files.splice(index, 1)
}

// 表单提交
const handleSubmit = async () => {
  if (!formData.value.itemname || !formData.value.itemtype) {
    uni.showToast({ title: '请填写物品信息', icon: 'none' }); return;
  }
  if (!formData.value.nodes.every(node => node.departmentId)) {
    uni.showToast({ title: '请选择所有节点科室', icon: 'none' }); return;
  }
  try {
    const userInfo = uni.getStorageSync('userInfo')
    const taskData = {
      itemname: formData.value.itemname,
      itemtype: formData.value.itemtype,
      priority: formData.value.priority,
      status: 'NEW',
      note: formData.value.note,
      docid: userInfo.userid
    }
    const nodeData = formData.value.nodes.map(node => ({
      departmentid: node.departmentId
    }))

    // 1. 创建任务
    const taskId = await taskApi.createTask(taskData, nodeData)
    // 2. 循环上传图片
    for (const f of formData.value.files) {
      await taskApi.uploadTaskFile(taskId,"CREATION", f.path)
    }
    uni.showToast({ title: '任务创建成功', icon: 'success' })
    setTimeout(() => { uni.navigateBack() }, 1500)
  } catch (error) {
    uni.showToast({
      title: error.message || '创建任务失败',
      icon: 'none'
    })
  }
}
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
        border: none;

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