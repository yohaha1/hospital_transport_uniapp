import request from '@/utils/request';

export default {
  // 创建运输任务（不带文件）
  createTask(task, nodes) {
    return request.post('/task/create', {
      task,
      nodes
    });
  },

  // 上传任务附件（单文件上传，filePath为本地路径）
  uploadTaskFile(taskId,stage, filePath) {
    // filePath 是 chooseImage 后返回的本地图片路径
    return request.upload('/task/uploadFile', filePath, { taskId, stage });
  },

  // 接受任务
  acceptTask(taskId, transporterId) {
	return request.post(`/task/accept/${taskId}?transporterId=${transporterId}`);
  },

  // 开始任务
  startTask(taskId, transporterId, qrCodeData) {
    const url = `/task/start/${taskId}` +
      `?transporterId=${transporterId}` +
      `&qrCodeData=${encodeURIComponent(qrCodeData)}`;
    return request.post(url);
  },

  // 任务交接
  handOverTask(taskId, transporterId, qrCodeData) {
    const url = `/task/handover/${taskId}` +
      `?transporterId=${transporterId}` +
      `&qrCodeData=${encodeURIComponent(qrCodeData)}`;
    return request.post(url);
  },
  //任务交接确认
  handOverConfirm(taskId,transporterId,departmentId){
    const url = `/task/handoverConfirm/${taskId}` +
      `?transporterId=${transporterId}` +
      `&departmentId=${departmentId}`;
    return request.post(url);
  },
  
  // 根据状态获取任务
  getTasksByStatus(status) {
    return request.get('/task/searchByStatus', {
      data: { 
        status: status,
      }
    });
  },
  
  //获取途径某部门的任务
  getDepartmentHandoverTasks(departmentId) {
	  return request.get(`/records/departmentHandoverTask/${departmentId}`);
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
	const query = {};
	if (params.status && params.status !== 'ALL') query.status = params.status;
	if (params.startDate) query.startDate = params.startDate;
	if (params.endDate) query.endDate = params.endDate;
    return request.get(`/records/transporter/${transporterId}`, {
      data: query
    });
  },

  // 获取任务节点
  getTaskNodes(taskId) {
    return request.get(`/records/taskNodes/${taskId}`);
  },
  
  //获取所有科室信息
  getDepartments(){
	return request.get(`/department/getAllDepartments`)
  },
  
  getFiles(taskId){
	return request.get(`/records/getFiles/${taskId}`);
  },
  
  //取消任务
  cancelTask(taskId, reason){
	  const encodedReason = encodeURIComponent(reason);	
	  return request.post(`/task/cancel/${taskId}?reason=${encodedReason}`);
  },
  

  
};