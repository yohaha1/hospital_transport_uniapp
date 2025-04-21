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

  // 根据状体获取任务
  getTasksByStatus(status) {
    return request.get('/task/searchByStatus', {
      data: { 
        status: status,
      }
    });
  },

  // 获取部门任务历史记录
  getDepartmentTasks(departmentId, params) {
    const query = {};
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.startDate) query.startDate = params.startDate;
    if (params.endDate) query.endDate = params.endDate;
    return request.get(`/records/department/${departmentId}`, {
      data: query
    });
  },

  // 获取运送员任务记录
  getTransporterTaskRecords(transporterId, params) {
	  console.log("tse111111111111"+transporterId,params);
    return request.get(`/records/transporter/${transporterId}`, {
      data: { 
        status: params.status,
        startDate: params.startDate,
        endDate: params.endDate
      }
    });
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


  // 获取任务节点
  getTaskNodes(taskId) {
    return request.get(`/records/taskNodes/${taskId}`);
  }
};