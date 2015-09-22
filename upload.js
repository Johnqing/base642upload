var fs = require('fs');
var request = require('request');
var bt = require('buffer-type');

var decodeBase64Image = exports.decodeBase64Image = function (dataString){
    var matches = decodeURIComponent(dataString).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    var response = {};

    if (matches.length !== 3){
        return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');
    response.extension = matches[1].split('/')[1];
    return response;
}

/**
 * Upload file content
 *
 * @param {String|Buffer|Stream} file content string or buffer, or a Stream instance.
 * @param {Object} [options]
 *  - {String} [key] 标识文件的索引，所在的存储空间内唯一。key可包含斜杠，但不以斜杠开头，比如 a/b/c.jpg 是一个合法的key。
 *                   若不指定 key，缺省使用文件的 etag（即上传成功后返回的hash值）作为key；
 *                   此时若 UploadToken 有指定 returnUrl 选项，则文件上传成功后跳转到 returnUrl?query_string,
 *                   query_string 包含key={FileID}
 *  - {String} [fileKey]                      文件的名称
 *  - {String} [filename]
 *  - {String} [contentType]
 *  - {Number} [size]
 * @param {Function(err, result)} callback
 *  - {Object} result
 *   - {String} hash
 *   - {String} key
 *   - {String} url
 */
exports.upload = function upload(base64, options, callback, req) {

    var dataBuffer = decodeBase64Image(base64);
    var content = dataBuffer.data;

    if (typeof options === 'function') {
        callback = options;
        options = null;
    }
    if (typeof content === 'string') {
        content = new Buffer(content);
    }

    options = options || {};

    var url = options.url;
    delete options.url;
    options = options.formData || {};

    options.filename = options.filename || options.key;
    if (Buffer.isBuffer(content) && !options.filename && !options.contentType) {
        // try to guess contentType from buffer
        var info = bt(content);
        if (info) {
            options.contentType = info.type;
            options.filename = 'file' + info.extension;
        } else {
            options.contentType = dataBuffer.type;
            options.filename = 'file' + dataBuffer.extension;
        }
    }
    // 发送到后端
    var r = request.post(url, function(err, res, body){

        if(err){
            return;
        }

        var data;

        try {
            data = JSON.parse(body);
        } catch (e) {
            data = {
                code: 'n11',
                msg: '服务器错误',
                data: {}
            }
        }
        callback && callback(data, res);
    });

    var form = r.form();
    var requestOptions = options.formData;
    for(var key in requestOptions){
        form.append(key, requestOptions[key]);
    }

    form.append(options.fileKey, content, {filename: options.filename});
};
