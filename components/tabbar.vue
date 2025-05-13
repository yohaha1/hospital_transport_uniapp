<template>
  <view class="tab">
    <view 
      v-for="(item, index) in list" 
      :key="index" 
      class="tab-item" 
      :class="{active: selectedIndex === index}"
      @click="switchTab(item, index)"
    >
      <view class="icon-wrapper">
        <uni-icons 
          :type="item.icon" 
          :color="selectedIndex === index ? selectedColor : color" 
          size="28"
        />
        <view 
          v-if="showBadge(item)" 
          class="tab-badge"
        ></view>
      </view>
      <view class="tab_text">
        {{ item.text }}
      </view>
      <view v-if="selectedIndex === index" class="tab-underline"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  selectedIndex: {
    type: Number,
    default: 0
  },

})
let color = ref('#666666')
let selectedColor = ref('#007AFF')
let list = ref([])
const badgeState = ref(false)

const updateBadge = () => {
  badgeState.value = uni.getStorageSync('hasNewNotification')
}

let timer = ref(null)
onMounted(() => {
  setTabList()
  timer = setInterval(updateBadge, 1000)

})
onUnmounted(() => {
  clearInterval(timer)
})

const showBadge = (item) => {
  return item.text === '我的' && badgeState.value
}

function setTabList() {
  const userInfo = uni.getStorageSync('userInfo');
  const role = userInfo?.role || '';
  if (role === 'doctor') {
    list.value = [
      { pagePath: '/pages/common/task-pool', icon: 'home', text: '任务大厅' },
	  { pagePath: '/pages/doctor/handover-task' , icon: 'link' , text: '任务交接'},
      { pagePath: '/pages/common/my-tasks', icon: 'list', text: '我的任务' },
      { pagePath: '/pages/common/user', icon: 'person', text: '个人中心' }
    ];
  } else if (role === 'transporter') {
    list.value = [
      { pagePath: '/pages/common/task-pool', icon: 'home', text: '任务大厅' },
      { pagePath: '/pages/transporter/active-task', icon: 'navigate', text: '进行中' },
      { pagePath: '/pages/common/my-tasks', icon: 'list', text: '我的任务' },
      { pagePath: '/pages/common/user', icon: 'person', text: '个人中心' }
    ];
  } else {
    list.value = [
      { pagePath: '/pages/common/task-pool', icon: 'home', text: '任务大厅' },
      { pagePath: '/pages/common/user', icon: 'person', text: '我的' }
    ];
  }
}


const switchTab = (item, index) => {
  // 不需要设置 local currentIndex，直接切页面，页面会自动计算 selectedIndex
  if (props.selectedIndex === index) return;
  uni.switchTab({ url: item.pagePath });
}
</script>
<style scoped>
.icon-wrapper {
  position: relative;
  display: inline-block;
}
.tab-badge {
  position: absolute;
  top: 0;
  right: -12rpx;
  width: 20rpx;
  height: 20rpx;
  background: #ff3b30;
  border-radius: 50%;
  border: 2rpx solid #fff;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.1); }
  100% { transform: scale(0.9); }
}
.tab {
  display: flex;
  width: 100vw;
  height: 110rpx;
  background: #fff;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 998;
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