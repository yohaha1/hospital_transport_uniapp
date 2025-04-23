/**
 * 微信小程序 FormData 多文件上传封装
 * https://github.com/weixin-js/wxapp-formdata
 */
function FormData() {
  this.boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
  this._fields = [];
}
FormData.prototype.append = function(name, value) {
  this._fields.push({
    name: name,
    value: value,
    file: false
  });
};
FormData.prototype.appendFile = function(name, filePath) {
  this._fields.push({
    name: name,
    value: filePath,
    file: true
  });
};
FormData.prototype.getData = function() {
  let boundary = this.boundary;
  let body = [];
  let files = [];
  for (let i = 0; i < this._fields.length; i++) {
    const field = this._fields[i];
    if (!field.file) {
      body.push(`--${boundary}\r\n`);
      body.push(
        `Content-Disposition: form-data; name="${field.name}"\r\n\r\n${field.value}\r\n`
      );
    } else {
      // 文件占位，后面用真实 wx.uploadFile
      files.push(field.value);
    }
  }
  body.push(`--${boundary}--\r\n`);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    buffer: body.join(''),
    files: files
  };
};
FormData.prototype.getHeaders = function() {
  return {
    "content-type": `multipart/form-data; boundary=${this.boundary}`
  }
}
export default FormData;