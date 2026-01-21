/**
 * Notes: 用户卡项实体
 * Date: 2025-10-26
 */

const BaseModel = require('./base_model.js');

class UserCardModel extends BaseModel {
	/**
	 * 获取单个object (重写以支持自动过期检查)
	 * @param {*} where 
	 * @param {*} fields 
	 * @param {*} orderBy 
	 * @returns object or null
	 */
	static async getOne(where, fields = '*', orderBy = {}, mustPID = true) {
		let card = await super.getOne(where, fields, orderBy, mustPID);

		if (card && card.USER_CARD_STATUS === this.STATUS.IN_USE &&
			card.USER_CARD_EXPIRE_TIME > 0) {

			const timeUtil = require('../../framework/utils/time_util.js');
			const now = timeUtil.time();

			if (card.USER_CARD_EXPIRE_TIME < now) {
				// 更新数据库
				await this.edit(card._id, {
					USER_CARD_STATUS: this.STATUS.EXPIRED
				});
				// 更新返回对象
				card.USER_CARD_STATUS = this.STATUS.EXPIRED;
				console.log(`[UserCardModel] Updated expired card ${card._id} in getOne`);
			}
		}
		return card;
	}
}

// 集合名
UserCardModel.CL = 'ax_user_card';
UserCardModel.FIELD_PREFIX = 'USER_CARD_';
UserCardModel.ADD_TIME = true;
UserCardModel.UPDATE_TIME = true;

// 数据结构定义
UserCardModel.DB_STRUCTURE = {
	_pid: 'string|true',
	USER_CARD_ID: 'string|true',
	USER_CARD_UNIQUE_ID: 'string|true|comment=唯一识别码，便于管理员搜索',
	USER_CARD_USER_ID: 'string|true|comment=用户ID',
	USER_CARD_CARD_ID: 'string|false|comment=卡项ID（可能为空，直接充值）',
	USER_CARD_CARD_NAME: 'string|true|comment=卡项名称',
	USER_CARD_TYPE: 'int|true|comment=1=次数卡 2=余额卡',

	// 次数卡字段
	USER_CARD_TOTAL_TIMES: 'int|false|default=0|comment=总次数',
	USER_CARD_USED_TIMES: 'int|false|default=0|comment=已用次数',
	USER_CARD_REMAIN_TIMES: 'int|false|default=0|comment=剩余次数',

	// 余额卡字段
	USER_CARD_TOTAL_AMOUNT: 'float|false|default=0|comment=总金额',
	USER_CARD_USED_AMOUNT: 'float|false|default=0|comment=已用金额',
	USER_CARD_REMAIN_AMOUNT: 'float|false|default=0|comment=剩余金额',

	USER_CARD_STATUS: 'int|true|default=1|comment=0=已用完 1=使用中 2=已过期',
	USER_CARD_PAYMENT_METHOD: 'string|false|comment=支付方式',
	USER_CARD_ADMIN_ID: 'string|false|comment=确认充值的管理员ID',

	USER_CARD_ADD_TIME: 'int|true',
	USER_CARD_EDIT_TIME: 'int|true',
	USER_CARD_EXPIRE_TIME: 'int|false|comment=过期时间',
	USER_CARD_ADD_IP: 'string|false',
	USER_CARD_EDIT_IP: 'string|false'
};

// 卡项类型常量
UserCardModel.TYPE = {
	TIMES: 1,     // 次数卡
	BALANCE: 2    // 余额卡
};

// 卡项状态常量
UserCardModel.STATUS = {
	USED_UP: 0,     // 已用完
	IN_USE: 1,      // 使用中
	EXPIRED: 2      // 已过期
};

// 获取用户总余额
UserCardModel.getUserTotalBalance = async function(userId) {
	let where = {
		USER_CARD_USER_ID: userId,
		USER_CARD_TYPE: this.TYPE.BALANCE,
		USER_CARD_STATUS: this.STATUS.IN_USE
	};

	let result = await this.sum(where, 'USER_CARD_REMAIN_AMOUNT');
	return result || 0;
};

// 获取用户总剩余次数
UserCardModel.getUserTotalTimes = async function(userId) {
	let where = {
		USER_CARD_USER_ID: userId,
		USER_CARD_TYPE: this.TYPE.TIMES,
		USER_CARD_STATUS: this.STATUS.IN_USE
	};

	let result = await this.sum(where, 'USER_CARD_REMAIN_TIMES');
	return result || 0;
};

// 获取用户所有卡项
UserCardModel.getUserCards = async function(userId, { type, status, page = 1, size = 20 } = {}) {
	let where = {
		USER_CARD_USER_ID: userId
	};

	// 按类型筛选
	if (type !== undefined && type !== null) {
		where.USER_CARD_TYPE = type;
	}

	// 按状态筛选
	if (status !== undefined && status !== null) {
		where.USER_CARD_STATUS = status;
	}

	let orderBy = {
		USER_CARD_ADD_TIME: 'desc'
	};

	let result = await this.getList(where, '*', orderBy, page, size, true, 0);

	// 检查并更新过期卡项
	if (result && result.list && result.list.length > 0) {
		const timeUtil = require('../../framework/utils/time_util.js');
		const now = timeUtil.time();
		let expiredIds = [];

		result.list.forEach(card => {
			// 检查是否过期且状态仍为使用中
			if (card.USER_CARD_STATUS === this.STATUS.IN_USE &&
				card.USER_CARD_EXPIRE_TIME > 0 &&
				card.USER_CARD_EXPIRE_TIME < now) {
				
				// 记录过期ID
				expiredIds.push(card._id);
				
				// 更新返回列表中的状态
				card.USER_CARD_STATUS = this.STATUS.EXPIRED;
			}
		});

		// 批量更新数据库
		if (expiredIds.length > 0) {
			await this.edit({
				_id: ['in', expiredIds]
			}, {
				USER_CARD_STATUS: this.STATUS.EXPIRED
			});
			console.log(`[UserCardModel] Updated ${expiredIds.length} expired cards for user ${userId}`);
		}
	}

	return result;
};

// 获取用户某类型的卡项
UserCardModel.getUserCardsByType = async function(userId, type) {
	let where = {
		USER_CARD_USER_ID: userId,
		USER_CARD_TYPE: type,
		USER_CARD_STATUS: this.STATUS.IN_USE
	};

	let orderBy = {
		USER_CARD_ADD_TIME: 'desc'
	};

	return await this.getAll(where, '*', orderBy);
};

// 生成唯一识别码 (格式: UC + 8位随机字符)
UserCardModel.generateUniqueId = function() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符 I,O,0,1
	let code = 'UC';
	for (let i = 0; i < 8; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
};

// 检查唯一识别码是否已存在
UserCardModel.isUniqueIdExists = async function(uniqueId) {
	let count = await this.count({ USER_CARD_UNIQUE_ID: uniqueId });
	return count > 0;
};

// 生成不重复的唯一识别码
UserCardModel.generateUniqueUniqueId = async function() {
	let uniqueId = '';
	let exists = true;
	let attempts = 0;
	const maxAttempts = 10;

	while (exists && attempts < maxAttempts) {
		uniqueId = this.generateUniqueId();
		exists = await this.isUniqueIdExists(uniqueId);
		attempts++;
	}

	if (exists) {
		throw new Error('无法生成唯一识别码，请重试');
	}

	return uniqueId;
};

// 通过唯一识别码查找卡项
UserCardModel.getByUniqueId = async function(uniqueId) {
	return await this.getOne({ USER_CARD_UNIQUE_ID: uniqueId });
};

// 检查卡项是否过期
UserCardModel.isExpired = function(expireTime) {
	if (!expireTime) return false;
	const timeUtil = require('../../framework/utils/time_util.js');
	return timeUtil.time() > expireTime;
};

// 更新过期卡项的状态
UserCardModel.updateExpiredCards = async function() {
	const timeUtil = require('../../framework/utils/time_util.js');
	const now = timeUtil.time();

	let where = {
		USER_CARD_STATUS: this.STATUS.IN_USE,
		USER_CARD_EXPIRE_TIME: {
			$gt: 0,
			$lt: now
		}
	};

	let data = {
		USER_CARD_STATUS: this.STATUS.EXPIRED
	};

	return await this.edit(where, data);
};

module.exports = UserCardModel;
