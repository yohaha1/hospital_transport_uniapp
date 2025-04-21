
<script>

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
		
	},
	onShow: function() {
		console.log('App Show')

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