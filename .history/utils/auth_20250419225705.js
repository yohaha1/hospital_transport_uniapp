// 获取用户信息
export function getUserInfo() {
  return uni.getStorageSync('userInfo');
}

// 清除用户信息
export function clearUserInfo() {
  uni.removeStorageSync('userInfo');
  uni.removeStorageSync('token');
}

// 获取用户角色
export function getUserRole() {
  const userInfo = getUserInfo();
  return userInfo ? userInfo.role : null;
}

// 检查是否是医生
export function isDoctor() {
  return getUserRole() === 'doctor';
}

// 检查是否是运送员
export function isTransporter() {
  return getUserRole() === 'transporter';
}

// 检查是否有权限访问页面
export function hasPermission(pagePath) {
  // 登录页面始终可访问
  if (pagePath === '/pages/login/login') {
    return true;
  }

  const role = getUserRole();
  if (!role) return false;

  // 医生可以访问的页面
  const doctorPages = [
    '/pages/nurse/create-task/create-task',
    '/pages/nurse/task-list/task-list',
    '/pages/user/user'
  ];

  // 运送员可以访问的页面
  const transporterPages = [
    '/pages/transporter/task-pool/task-pool',
    '/pages/transporter/active-task/active-task',
    '/pages/transporter/history-task/history-task',
    '/pages/user/user'
  ];

  if (role === 'doctor') {
    return doctorPages.includes(pagePath);
  } else if (role === 'transporter') {
    return transporterPages.includes(pagePath);
  }

  return false;
}

// 获取用户可访问的tabBar
export function getAccessibleTabBar() {
  const role = getUserRole();
  if (!role) return [];

  const allTabBar = [
    {
      pagePath: 'pages/nurse/task-list/task-list',
      text: '任务列表',
      iconPath: 'static/images/task-list.png',
      selectedIconPath: 'static/images/task-list-active.png'
    },
    {
      pagePath: 'pages/nurse/create-task/create-task',
      text: '创建任务',
      iconPath: 'static/images/create-task.png',
      selectedIconPath: 'static/images/create-task-active.png'
    },
    {
      pagePath: 'pages/transporter/task-pool/task-pool',
      text: '任务池',
      iconPath: 'static/images/task-pool.png',
      selectedIconPath: 'static/images/task-pool-active.png'
    },
    {
      pagePath: 'pages/transporter/active-task/active-task',
      text: '进行中',
      iconPath: 'static/images/active-task.png',
      selectedIconPath: 'static/images/active-task-active.png'
    },
    {
      pagePath: 'pages/transporter/history-task/history-task',
      text: '历史任务',
      iconPath: 'static/images/history-task.png',
      selectedIconPath: 'static/images/history-task-active.png'
    },
    {
      pagePath: 'pages/user/user',
      text: '我的',
      iconPath: 'static/images/user.png',
      selectedIconPath: 'static/images/user-active.png'
    }
  ];

  if (role === 'doctor') {
    return allTabBar.filter(item =>
      item.pagePath === 'pages/nurse/task-list/task-list' ||
      item.pagePath === 'pages/nurse/create-task/create-task' ||
      item.pagePath === 'pages/user/user'
    );
  } else if (role === 'transporter') {
    return allTabBar.filter(item =>
      item.pagePath === 'pages/transporter/task-pool/task-pool' ||
      item.pagePath === 'pages/transporter/active-task/active-task' ||
      item.pagePath === 'pages/transporter/history-task/history-task' ||
      item.pagePath === 'pages/user/user'
    );
  }

  return [];
}