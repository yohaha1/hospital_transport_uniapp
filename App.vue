<script>
import { getAccessibleTabBar } from '@/utils/auth'
import { setupRouterInterceptor } from '@/utils/permission'

export default {
	onLaunch: function() {
		console.log('App Launch')
		// 检查登录状态
		const userInfo = uni.getStorageSync('userInfo')
		if (!userInfo) {
			uni.reLaunch({
				url: '/pages/login/login'
			})
			return
		}
		
		// 动态设置tabBar
		const tabBar = getAccessibleTabBar()
		if (tabBar.length > 0) {
			uni.setTabBarItems({
				items: tabBar
			})
		}
		
		// 检查初始页面权限
		setupRouterInterceptor()
	},
	onShow: function() {
		console.log('App Show')
		// 检查页面访问权限
		setupRouterInterceptor()
	},
	onHide: function() {
		console.log('App Hide')
	},
	onPageNotFound: function() {
		uni.redirectTo({
			url: '/pages/login/login'
		})
	},
	onUniNViewMessage: function(e) {
		console.log('App onUniNViewMessage', e)
	},
	onError: function(err) {
		console.log('App onError', err)
	}
}
</script>

<style>
	/*每个页面公共css */
	page {
		background-color: #f5f5f5;
		font-size: 28rpx;
		color: #333;
	}
</style>
