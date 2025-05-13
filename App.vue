
<script>

export default {
    data() {
      return {
        socketConnected: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectInterval: 50000,
        userInfo: null,
		socketTask: null,
      }
    },
	onLaunch: function() {
		
		// wx.cloud.init({
		// 	env: 'prod-9g2b9i2n9a553ec9', // 替换为你的云开发环境ID
		// 	traceUser: true
		// })

		console.log('App Launch')
		// 检查登录状态
		this.userInfo = uni.getStorageSync('userInfo')
		if (!this.userInfo) {
			uni.reLaunch({
				url: '/pages/login/login'
			})
			return
		}else{
			// 添加事件监听
			uni.$on('send-websocket-message', this.handleSendMessage);
			this.initWebSocket()
		}
		
		uni.$on('logout', this.disconnectNotification);
		
		
	},
	onShow: function() {
		console.log('App Show')
	},
	onHide: function() {
		console.log('App Hide')
		uni.$off('logout', this.disconnectNotification)

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
	},
	
    methods: {
		// 处理从其他页面发送的消息
		handleSendMessage(data) {
			if (this.socketTask && this.socketConnected) {
				this.socketTask.send({ data: JSON.stringify(data) });
			}
		},
		initWebSocket() {
			console.log("开始socket连接111111111111111111111")
			this.userInfo = uni.getStorageSync('userInfo');
			const departmentId = this.userInfo.departmentid;
			if (!departmentId) return;

			// 关闭旧连接
			if (this.socketConnected) {
			  uni.closeSocket()
			  this.socketConnected = false
			}

			// 创建新连接
			uni.connectSocket({ url: 'ws://localhost:8080/ws' })
			
			uni.onSocketOpen(() => {
				console.log("WebSocket连接已建立");
				this.socketConnected = true;
				this.reconnectAttempts = 0;
				// 发送订阅请求
				const subscribeMsg = JSON.stringify({
					type: "subscribe",
					departmentId: departmentId
				});
				uni.sendSocketMessage({ data: subscribeMsg })
				console.log('发送消息 ', subscribeMsg)
			});

			// 监听消息
			uni.onSocketMessage(res => {
				console.log("111111111111111111111111111111111",res)
				const notice = JSON.parse(res.data);
				uni.$emit('websocket-message', notice);
				if (notice.type === 'handoverConfirm') {
					uni.$emit('handoverTaskId',notice.taskId);
					// 从缓存里读出数组
					let pending = uni.getStorageSync('pendingHandoverIds') || [];
					pending.push(notice.taskId);
					pending = Array.from(new Set(pending));
					uni.setStorageSync('pendingHandoverIds', pending);
					
				    uni.showModal({
				      title: "交接确认",
				      content: `任务 ${notice.taskId} — ${notice.itemName}\n运送员：${notice.transName}`,
				      confirmText: "去确认",
				      showCancel: false,
				      success: (res) => {
				       if (res.confirm) {
				          uni.reLaunch({
				            url: '/pages/doctor/handover-task'
				          });
				        }
				      }
				    });
				} else {
				    uni.showModal({
				      title: "交接通知",
				      content: `任务 ${notice.taskId} — ${notice.itemName}\n运送员：${notice.transName}`,
				      showCancel: false
				    });
				}
			});

			// 错误处理
			uni.onSocketError(err => {
				console.error("WebSocket错误");
				this.handleReconnect();
			});

			// 连接关闭处理
			uni.onSocketClose(() => {
				console.log("WebSocket连接已关闭");
				this.socketConnected = false;
				this.handleReconnect();
			});
		},
		handleReconnect() {
			if (this.reconnectAttempts < this.maxReconnectAttempts) {
				setTimeout(() => {
					this.reconnectAttempts++;
					this.initWebSocket();
				}, this.reconnectInterval);
			} else {
				uni.showToast({ title: "连接失败，请检查网络", icon: "none" });
			}
		},
		//logout
		disconnectNotification() {
			uni.closeSocket()
			this.socketConnected = false
			console.log('[WebSocket] Disconnected via logout')
		}
	},

};
</script>

<!-- export default {
  mounted() {
    uni.$on('websocket-message', this.handleNotice);
  },
  beforeDestroy() {
    uni.$off('websocket-message', this.handleNotice);
  },
  methods: {
    handleNotice(notice) {
      uni.showToast({
        title: `任务 ${notice.taskId}`,
        icon: "none"
      });
      // 或者弹窗提示
      uni.showModal({
        title: "交接通知",
        content: `任务 ${notice.taskId} — ${notice.itemName}\n运送员：${notice.transName}`,
        showCancel: false
      });
    }，
	  sendMessage() {
		const message = { type: "test", content: "Hello from other page" };
		uni.$emit('send-websocket-message', message);
	  }
  }
}; -->

<style>
	/*每个页面公共css */
	page {
		background-color: #f5f5f5;
		font-size: 28rpx;
		color: #333;
	}
</style>