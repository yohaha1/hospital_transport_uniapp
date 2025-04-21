<template>
  <view class="tab">
    <view 
      v-for="(item, index) in list" 
      :key="index" 
      class="tab-item" 
      :class="{active: currentIndex === index}"
      @click="switchTab(item, index)"
    >
      <uni-icons 
        :type="currentIndex === index ? item.selectedIcon : item.icon" 
        :color="currentIndex === index ? selectedColor : color" 
        size="28"
      />
      <view 
        class="tab_text"
      >
        {{ item.text }}
      </view>
      <view v-if="currentIndex === index" class="tab-underline"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import {onShow} from '@dcloudio/uni-app'

import '@/uni_modules/uni-icons/components/uni-icons/uni-icons.vue'

let color = ref('#666666')
let selectedColor = ref('#007AFF')
let list = ref([])
let currentIndex = ref(0)

// 接收父组件传入的 selectedIndex
const props = defineProps({
  selectedIndex: {
    type: Number,
    default: 0
  }
})

onMounted(() => {
  setTabList();
  // 初始高亮
  currentIndex.value = props.selectedIndex;
})

onShow(() => {
  setTabList();
  // 页面切换后，自动根据selectedIndex高亮
  currentIndex.value = props.selectedIndex;
})

// 监听父级参数变化，自动同步高亮
watch(() => props.selectedIndex, (val) => {
  currentIndex.value = val
})

function setTabList() {
  const userInfo = uni.getStorageSync('userInfo');
  const role = userInfo?.role || '';
  if (role === 'doctor') {
    list.value = [
      {
        pagePath: '/pages/common/task-pool',
        icon: 'home',
        selectedIcon: 'home-filled',
        text: '任务大厅'
      },
      {
        pagePath: '/pages/doctor/task-list',
        icon: 'list',
        selectedIcon: 'list-filled',
        text: '任务列表'
      },
      {
        pagePath: '/pages/common/user',
        icon: 'person',
        selectedIcon: 'person-filled',
        text: '我的'
      }
    ];
  } else if (role === 'transporter') {
    list.value = [
      {
        pagePath: '/pages/common/task-pool',
        icon: 'home',
        selectedIcon: 'home-filled',
        text: '任务大厅'
      },
      {
        pagePath: '/pages/transporter/active-task',
        icon: 'clock',
        selectedIcon: 'clock-filled',
        text: '进行中'
      },
      {
        pagePath: '/pages/transporter/history-task',
        icon: 'history',
        selectedIcon: 'history-filled',
        text: '历史任务'
      },
      {
        pagePath: '/pages/common/user',
        icon: 'person',
        selectedIcon: 'person-filled',
        text: '我的'
      }
    ];
  }
}

const switchTab = (item, index) => {
  if (currentIndex.value === index) return;
  currentIndex.value = index;
  uni.switchTab({
    url: item.pagePath
  });
};
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
</style>