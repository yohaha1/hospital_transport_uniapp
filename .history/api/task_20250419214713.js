import request from '@/utils/request';

export default {
  // 创建运输任务
  createTask(task, nodes, files) {
    const formData = new FormData();
    formData.append('task', JSON.stringify(task));
    formData.append('nodes', JSON.stringify(nodes));
    files.forEach(file => {
      formData.append('files', file);
    });
    return request.post('/task/create', formData);
  },

  // 获取待接单任务
  getPendingTasks() {
    return request.get('/task/search/pending');
  },
  getDepartmentTasks(departmentId,status){
    return request.get(`/records/department/${departmentId}`)
  },

  // 接受任务
  acceptTask(taskId, transporterId) {
    return request.post(`/task/accept/${taskId}`, {
      transporterId
    });
  },

  // 开始任务
  startTask(taskId, transporterId, file, qrCodeData) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transporterId', transporterId);
    formData.append('qrCodeData', qrCodeData);
    return request.post(`/task/start/${taskId}`, formData);
  },

  // 任务交接
  handOverTask(taskId, transporterId, departmentId, file, qrCodeData) {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('transporterId', transporterId);
    formData.append('departmentId', departmentId);
    formData.append('qrCodeData', qrCodeData);
    return request.post(`/task/handover/${taskId}`, formData);
  },

  // 获取运送员任务记录
  getTransporterTaskRecords(transporterId, params) {
    return request.get(`/records/transporter/${transporterId}`, {
      params: {
        type: params.type,
        startDate: params.startDate,
        endDate: params.endDate
      }
    });
  },

  // 获取任务节点
  getTaskNodes(taskId) {
    return request.get(`/records/taskNodes/${taskId}`);
  }
};