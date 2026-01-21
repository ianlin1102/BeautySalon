/**
 * Notes: 用户卡项管理-控制器
 * Date: 2025-10-26
 */

const BaseAdminController = require('./base_admin_controller.js');
const AdminUserCardService = require('../../service/admin/admin_user_card_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const LogModel = require('../../model/log_model.js');
const AppError = require('../../../framework/core/app_error.js');
const appCode = require('../../../framework/core/app_code.js');

class AdminUserCardController extends BaseAdminController {

	/** 通过手机号搜索用户 */
	async searchUserByPhone() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			phone: 'must|string|min:10|max:15|name=手机号',  // 支持中国(11位)、美国(10位)
			countryCode: 'string|name=国家代码'  // 如 +1, +86
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserCardService();
		let result = await service.searchUserByPhone(input.phone, input.countryCode);

		if (!result) {
			throw new AppError('未找到该用户', appCode.LOGIC);
		}

		// 格式化卡项数据
		if (result.cards && result.cards.list) {
			for (let k in result.cards.list) {
				result.cards.list[k].USER_CARD_ADD_TIME = timeUtil.timestamp2Time(result.cards.list[k].USER_CARD_ADD_TIME, 'Y-M-D h:m');
				if (result.cards.list[k].USER_CARD_EXPIRE_TIME) {
					result.cards.list[k].USER_CARD_EXPIRE_TIME = timeUtil.timestamp2Time(result.cards.list[k].USER_CARD_EXPIRE_TIME, 'Y-M-D');
				}
				// 添加类型描述
				result.cards.list[k].USER_CARD_TYPE_DESC = result.cards.list[k].USER_CARD_TYPE === 1 ? '次数卡' : '余额卡';
				// 添加状态描述
				let statusMap = {
					0: '已用完',
					1: '使用中',
					2: '已过期'
				};
				result.cards.list[k].USER_CARD_STATUS_DESC = statusMap[result.cards.list[k].USER_CARD_STATUS] || '未知';
			}
		}

		return result;
	}

	/** 通过卡项唯一识别码搜索 */
	async searchByUniqueId() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			uniqueId: 'must|string|min:2|max:20|name=卡项识别码'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserCardService();
		let result = await service.searchByUniqueId(input.uniqueId);

		if (!result) {
			throw new AppError('未找到该卡项', appCode.LOGIC);
		}

		// 格式化卡项数据
		if (result.userCard) {
			result.userCard.USER_CARD_ADD_TIME = timeUtil.timestamp2Time(result.userCard.USER_CARD_ADD_TIME, 'Y-M-D h:m');
			if (result.userCard.USER_CARD_EXPIRE_TIME) {
				result.userCard.USER_CARD_EXPIRE_TIME = timeUtil.timestamp2Time(result.userCard.USER_CARD_EXPIRE_TIME, 'Y-M-D');
			}
			// 添加类型描述
			result.userCard.USER_CARD_TYPE_DESC = result.userCard.USER_CARD_TYPE === 1 ? '次数卡' : '余额卡';
			// 添加状态描述
			let statusMap = {
				0: '已用完',
				1: '使用中',
				2: '已过期'
			};
			result.userCard.USER_CARD_STATUS_DESC = statusMap[result.userCard.USER_CARD_STATUS] || '未知';
		}

		return result;
	}

	/** 获取用户卡项列表 */
	async getUserCardList() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			userId: 'must|id',
			page: 'must|int|default=1',
			size: 'int|default=20'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserCardService();
		let result = await service.getUserCardList(input.userId, input.page, input.size);

		// 格式化数据
		if (result.list) {
			for (let k in result.list) {
				result.list[k].USER_CARD_ADD_TIME = timeUtil.timestamp2Time(result.list[k].USER_CARD_ADD_TIME, 'Y-M-D h:m');
				if (result.list[k].USER_CARD_EXPIRE_TIME) {
					result.list[k].USER_CARD_EXPIRE_TIME = timeUtil.timestamp2Time(result.list[k].USER_CARD_EXPIRE_TIME, 'Y-M-D');
				}
			}
		}

		return result;
	}

	/** 给用户添加卡项（充值） */
	async addUserCard() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			userId: 'must|id|name=用户ID',
			cardId: 'string|name=卡项ID',
			cardName: 'must|string|min:2|max:50|name=卡项名称',
			type: 'must|int|in:1,2|name=卡项类型',
			times: 'int|min:0|name=次数',
			amount: 'float|min:0|name=金额',
			reason: 'must|string|min:2|max:200|name=充值原因',
			paymentMethod: 'string|max:50|name=支付方式'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 验证次数卡必须有次数，余额卡必须有金额
		if (input.type === 1 && (!input.times || input.times <= 0)) {
			throw new AppError('次数卡必须设置次数', appCode.LOGIC);
		}
		if (input.type === 2 && (!input.amount || input.amount <= 0)) {
			throw new AppError('余额卡必须设置金额', appCode.LOGIC);
		}

		let service = new AdminUserCardService();
		let result = await service.addUserCard(this._adminId, input);

		// 记录日志
		let desc = input.type === 1 ?
			`给用户充值了${input.times}次` :
			`给用户充值了$${input.amount}`;
		this.log(desc + ` - ${input.cardName}，原因：${input.reason}`, LogModel.TYPE.USER);

		return result;
	}

	/** 调整用户卡项（扣减或增加） */
	async adjustUserCard() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			userCardId: 'must|id|name=用户卡项ID',
			changeTimes: 'name=次数变动',
			changeAmount: 'name=金额变动',
			reason: 'must|string|min:2|max:200|name=调整原因',
			relatedId: 'string|name=关联ID'
		};

		// 取得数据
		let input = this.validateData(rules);

		// 手动转换和验证数值
		if (input.changeTimes !== undefined && input.changeTimes !== null && input.changeTimes !== '') {
			input.changeTimes = parseInt(input.changeTimes);
			if (isNaN(input.changeTimes)) {
				throw new AppError('次数变动必须是数字', appCode.LOGIC);
			}
		} else {
			input.changeTimes = 0;
		}

		if (input.changeAmount !== undefined && input.changeAmount !== null && input.changeAmount !== '') {
			input.changeAmount = parseFloat(input.changeAmount);
			if (isNaN(input.changeAmount)) {
				throw new AppError('金额变动必须是数字', appCode.LOGIC);
			}
		} else {
			input.changeAmount = 0;
		}

		// 验证至少有一个变动值
		if ((!input.changeTimes || input.changeTimes === 0) &&
			(!input.changeAmount || input.changeAmount === 0)) {
			throw new AppError('必须设置次数变动或金额变动', appCode.LOGIC);
		}

		let service = new AdminUserCardService();
		let result = await service.adjustUserCard(this._adminId, input);

		// 记录日志
		let desc = '';
		if (input.changeTimes !== 0) {
			desc = input.changeTimes > 0 ?
				`给用户增加了${input.changeTimes}次` :
				`给用户扣减了${Math.abs(input.changeTimes)}次`;
		} else if (input.changeAmount !== 0) {
			desc = input.changeAmount > 0 ?
				`给用户增加了$${input.changeAmount}` :
				`给用户扣减了$${Math.abs(input.changeAmount)}`;
		}
		this.log(desc + `，原因：${input.reason}`, LogModel.TYPE.USER);

		return result;
	}

	/** 获取用户卡项使用记录 */
	async getUserCardRecords() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			userId: 'must|id',
			userCardId: 'string',
			page: 'must|int|default=1',
			size: 'int|default=20'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserCardService();
		let result = await service.getUserCardRecords(input.userId, input.userCardId, input.page, input.size);

		// 格式化数据
		if (result.list) {
			// 收集所有管理员ID
			const AdminModel = require('../../model/admin_model.js');
			let adminIds = [];
			for (let k in result.list) {
				if (result.list[k].RECORD_ADMIN_ID && !adminIds.includes(result.list[k].RECORD_ADMIN_ID)) {
					adminIds.push(result.list[k].RECORD_ADMIN_ID);
				}
			}

			// 批量查询管理员信息
			let adminMap = {};
			if (adminIds.length > 0) {
				let admins = await AdminModel.getAll({ _id: { $in: adminIds } }, 'ADMIN_ID,ADMIN_NAME,ADMIN_PHONE');
				for (let admin of admins) {
					adminMap[admin._id] = admin;
				}
			}

			// 格式化每条记录
			for (let k in result.list) {
				result.list[k].RECORD_ADD_TIME = timeUtil.timestamp2Time(result.list[k].RECORD_ADD_TIME, 'Y-M-D h:m');

				// 添加类型描述
				let typeMap = {
					1: '充值',
					2: '消费',
					3: '管理员调整',
					4: '过期作废'
				};
				result.list[k].RECORD_TYPE_DESC = typeMap[result.list[k].RECORD_TYPE] || '未知';

				// 添加管理员信息
				if (result.list[k].RECORD_ADMIN_ID && adminMap[result.list[k].RECORD_ADMIN_ID]) {
					result.list[k].ADMIN_NAME = adminMap[result.list[k].RECORD_ADMIN_ID].ADMIN_NAME;
					result.list[k].ADMIN_PHONE = adminMap[result.list[k].RECORD_ADMIN_ID].ADMIN_PHONE;
				}

				// 添加变动描述
				if (result.list[k].RECORD_CHANGE_TIMES !== 0) {
					result.list[k].changeDesc = (result.list[k].RECORD_CHANGE_TIMES > 0 ? '+' : '') + result.list[k].RECORD_CHANGE_TIMES + '次';
				} else if (result.list[k].RECORD_CHANGE_AMOUNT !== 0) {
					result.list[k].changeDesc = (result.list[k].RECORD_CHANGE_AMOUNT > 0 ? '+$' : '-$') + Math.abs(result.list[k].RECORD_CHANGE_AMOUNT);
				}
			}
		}

		return result;
	}

	/** 获取用户信息（包含卡项汇总） */
	async getUserInfo() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			userId: 'must|id'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserCardService();
		let result = await service.getUserInfo(input.userId);

		// 格式化卡项数据
		if (result && result.cards && result.cards.list) {
			for (let k in result.cards.list) {
				result.cards.list[k].USER_CARD_ADD_TIME = timeUtil.timestamp2Time(result.cards.list[k].USER_CARD_ADD_TIME, 'Y-M-D h:m');
				if (result.cards.list[k].USER_CARD_EXPIRE_TIME) {
					result.cards.list[k].USER_CARD_EXPIRE_TIME = timeUtil.timestamp2Time(result.cards.list[k].USER_CARD_EXPIRE_TIME, 'Y-M-D');
				}
			}
		}

		return result;
	}
}

module.exports = AdminUserCardController;
