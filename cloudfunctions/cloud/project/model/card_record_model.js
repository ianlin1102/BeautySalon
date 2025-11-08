/**
 * Notes: 卡项使用记录实体
 * Date: 2025-10-26
 */

const BaseModel = require('./base_model.js');

class CardRecordModel extends BaseModel {

}

// 集合名
CardRecordModel.CL = 'ax_card_record';
CardRecordModel.FIELD_PREFIX = 'RECORD_';
CardRecordModel.ADD_TIME = true;
CardRecordModel.UPDATE_TIME = true; // 框架需要此标志来自动填充时间戳字段

// 数据结构定义
CardRecordModel.DB_STRUCTURE = {
	_pid: 'string|true',
	RECORD_ID: 'string|true',
	RECORD_USER_ID: 'string|true|comment=用户ID',
	RECORD_USER_CARD_ID: 'string|true|comment=用户卡项ID',
	RECORD_TYPE: 'int|true|comment=1=充值/购买 2=消费/使用 3=管理员调整 4=过期作废',

	// 变动数值
	RECORD_CHANGE_TIMES: 'int|false|default=0|comment=次数变动（正数=增加，负数=减少）',
	RECORD_CHANGE_AMOUNT: 'float|false|default=0|comment=金额变动（正数=增加，负数=减少）',

	// 变动前后数值
	RECORD_BEFORE_TIMES: 'int|false|default=0|comment=变动前次数',
	RECORD_AFTER_TIMES: 'int|false|default=0|comment=变动后次数',
	RECORD_BEFORE_AMOUNT: 'float|false|default=0|comment=变动前金额',
	RECORD_AFTER_AMOUNT: 'float|false|default=0|comment=变动后金额',

	RECORD_REASON: 'string|true|comment=变动原因（必填）',
	RECORD_ADMIN_ID: 'string|false|comment=操作的管理员ID',
	RECORD_RELATED_ID: 'string|false|comment=关联ID（预约ID等）',
	RECORD_PAYMENT_METHOD: 'string|false|comment=支付方式（充值时）',

	RECORD_ADD_TIME: 'int|true',
	RECORD_EDIT_TIME: 'int|true',
	RECORD_ADD_IP: 'string|false',
	RECORD_EDIT_IP: 'string|false'
};

// 记录类型常量
CardRecordModel.TYPE = {
	RECHARGE: 1,      // 充值/购买
	CONSUME: 2,       // 消费/使用
	ADMIN_ADJUST: 3,  // 管理员调整
	EXPIRED: 4        // 过期作废
};

// 获取记录类型描述
CardRecordModel.getTypeDesc = function(type) {
	const typeMap = {
		1: '充值',
		2: '消费',
		3: '管理员调整',
		4: '过期作废'
	};
	return typeMap[type] || '未知操作';
};

// 获取用户记录
CardRecordModel.getUserRecords = async function(userId, page = 1, size = 20) {
	let where = {
		RECORD_USER_ID: userId
	};

	let orderBy = {
		RECORD_ADD_TIME: 'desc'
	};

	return await this.getList(where, '*', orderBy, page, size, true, 0);
};

// 获取用户某张卡的记录
CardRecordModel.getUserCardRecords = async function(userCardId, page = 1, size = 20) {
	let where = {
		RECORD_USER_CARD_ID: userCardId
	};

	let orderBy = {
		RECORD_ADD_TIME: 'desc'
	};

	return await this.getList(where, '*', orderBy, page, size, true, 0);
};

// 创建记录
CardRecordModel.createRecord = async function({
	userId,
	userCardId,
	type,
	changeTimes = 0,
	changeAmount = 0,
	beforeTimes = 0,
	afterTimes = 0,
	beforeAmount = 0,
	afterAmount = 0,
	reason,
	adminId = '',
	relatedId = '',
	paymentMethod = ''
}) {
	const timeUtil = require('../../framework/utils/time_util.js');

	let data = {
		RECORD_USER_ID: userId,
		RECORD_USER_CARD_ID: userCardId,
		RECORD_TYPE: type,
		RECORD_CHANGE_TIMES: changeTimes,
		RECORD_CHANGE_AMOUNT: changeAmount,
		RECORD_BEFORE_TIMES: beforeTimes,
		RECORD_AFTER_TIMES: afterTimes,
		RECORD_BEFORE_AMOUNT: beforeAmount,
		RECORD_AFTER_AMOUNT: afterAmount,
		RECORD_REASON: reason,
		RECORD_ADMIN_ID: adminId,
		RECORD_RELATED_ID: relatedId,
		RECORD_PAYMENT_METHOD: paymentMethod,
		RECORD_ADD_TIME: timeUtil.time()
	};

	return await this.insert(data);
};

module.exports = CardRecordModel;
