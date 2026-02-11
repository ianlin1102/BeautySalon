/**
 * Notes: 条款同意记录实体
 * Date: 2026-02-03
 */

const BaseModel = require('./base_model.js');

class TermsAgreementModel extends BaseModel {}

// 集合名
TermsAgreementModel.CL = "ax_terms_agreement";

TermsAgreementModel.DB_STRUCTURE = {
	_pid: 'string|true',
	AGREE_ID: 'string|true|comment=记录ID',

	AGREE_USER_ID: 'string|true|comment=用户ID',
	AGREE_UNIQUE_ID: 'string|true|comment=平台唯一标识(openID/gmail/username)',
	AGREE_UNIQUE_TYPE: 'string|true|comment=标识类型:wechat/google/username',
	AGREE_PRINTED_NAME: 'string|true|comment=用户输入的法律姓名',
	AGREE_VERSION: 'int|true|comment=同意的条款版本号',
	AGREE_CHECKBOX: 'bool|true|default=true|comment=是否打勾确认',

	AGREE_IP: 'string|false|comment=IP地址',
	AGREE_DEVICE_INFO: 'object|false|comment=设备信息',

	AGREE_TIME: 'int|true|comment=同意时间戳',
	AGREE_ADD_TIME: 'int|true',
	AGREE_EDIT_TIME: 'int|false|comment=编辑时间',
	AGREE_ADD_IP: 'string|false|comment=添加时IP',
	AGREE_EDIT_IP: 'string|false|comment=编辑时IP',
};

TermsAgreementModel.FIELD_PREFIX = "AGREE_";

module.exports = TermsAgreementModel;
