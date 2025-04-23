<template>
  <view class="tab">
    <view 
      v-for="(item, index) in list" 
      :key="index" 
      class="tab-item" 
      :class="{active: selectedIndex === index}"
      @click="switchTab(item, index)"
    >
      <uni-icons 
        :type="item.icon" 
        :color="selectedIndex === index ? selectedColor : color" 
        size="28"
      />
      <view class="tab_text">
        {{ item.text }}
      </view>
      <view v-if="selectedIndex === index" class="tab-underline"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  selectedIndex: {
    type: Number,
    default: 0
  }
})
let color = ref('#666666')
let selectedColor = ref('#007AFF')
let list = ref([])

function setTabList() {
  const userInfo = uni.getStorageSync('userInfo');
  const role = userInfo?.role || '';
  if (role === 'doctor') {
    list.value = [
      { pagePath: '/pages/common/task-pool', icon: 'home', text: '任务大厅' },
      { pagePath: '/pages/doctor/task-list', icon: 'list', text: '任务列表' },
      { pagePath: '/pages/common/user', icon: 'person', text: '我的' }
    ];
  } else if (role === 'transporter') {
    list.value = [
      { pagePath: '/pages/common/task-pool', icon: 'home', text: '任务大厅' },
      { pagePath: '/pages/transporter/active-task', icon: 'navigate', text: '进行中' },
      { pagePath: '/pages/transporter/history-task', icon: 'list', text: '历史任务' },
      { pagePath: '/pages/common/user', icon: 'person', text: '我的' }
    ];
  } else {
    list.value = [
      { pagePath: '/pages/common/task-pool', icon: 'home', text: '任务大厅' },
      { pagePath: '/pages/common/user', icon: 'person', text: '我的' }
    ];
  }
}

onMounted(() => {
  setTabList()
})

const switchTab = (item, index) => {
  // 不需要设置 local currentIndex，直接切页面，页面会自动计算 selectedIndex
  if (props.selectedIndex === index) return;
  uni.switchTab({ url: item.pagePath });
}
</script>
<style scoped>
.tab {
  display: flex;
  width: 100vw;
  height: 110rpx;
  background: #fff;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 999;
  box-shadow: 0 -2px 10px rgba(0,0,0,.04);
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.tab_text {
  font-size: 26rpx;
  margin-top: 5rpx;
  font-weight: 500;
}
.tab-underline {
  width: 40%;
  height: 4rpx;
  background: #007AFF;
  border-radius: 2rpx;
  margin: 4rpx auto 0 auto;
}
.active .tab_text {
  color: #007AFF;
}
</style>