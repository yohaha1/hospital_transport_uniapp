import { hasPermission, getUserInfo } from './auth'

// 路由拦截器
export function setupRouterInterceptor() {
  // 获取当前页面路径
  const pages = getCurrentPages()
  if (!pages.length) return true
  
  const currentPage = pages[pages.length - 1]
  const currentPath = '/' + currentPage.route

  // 检查是否有权限访问当前页面
  if (!hasPermission(currentPath)) {
    const userInfo = getUserInfo()
    if (!userInfo) {
      // 未登录，跳转到登录页
      uni.reLaunch({
        url: '/pages/login/login'
      })
    } else {
      // 已登录但无权限，跳转到个人中心
      uni.showToast({
        title: '无权限访问该页面',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/user/user'
        })
      }, 2000)
    }
    return false
  }
  return true
} 