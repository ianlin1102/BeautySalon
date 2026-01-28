/**
 * Notes: 用户卡项管理服务
 * Date: 2025-10-26
 */

const BaseAdminService = require('./base_admin_service.js');
const UserModel = require('../../model/user_model.js');
const UserCardModel = require('../../model/user_card_model.js');
const CardRecordModel = require('../../model/card_record_model.js');
const CardItemModel = require('../../model/card_item_model.js');

class AdminUserCardService extends BaseAdminService {

	/** 通过手机号搜索用户 */
	async searchUserByPhone(phone, countryCode = '') {
		// 构建搜索条件：尝试多种格式匹配
		const fields = 'USER_ID,USER_NAME,USER_MOBILE,USER_MINI_OPENID,USER_GOOGLE_ID,USER_GOOGLE_EMAIL,USER_ACCOUNT,USER_SOURCE,USER_WORK,USER_CITY,USER_TRADE,USER_ADD_TIME,USER_LOGIN_TIME';

		// 尝试纯号码
		let user = await UserModel.getOne({ USER_MOBILE: phone }, fields);

		// 如果提供了国家代码，尝试完整格式
		if (!user && countryCode) {
			const fullPhone = countryCode + phone;
			user = await UserModel.getOne({ USER_MOBILE: fullPhone }, fields);

			// 也尝试不带 + 的格式
			if (!user) {
				const codeWithoutPlus = countryCode.replace('+', '');
				user = await UserModel.getOne({ USER_MOBILE: codeWithoutPlus + phone }, fields);
			}
		}

		if (!user) return null;

		// 使用用户标识：优先 USER_MINI_OPENID（微信），其次 USER_ID（Web），最后 _id
		let userOpenId = user.USER_MINI_OPENID || user.USER_ID || user._id;

		// 获取用户卡项汇总
		let totalBalance = await UserCardModel.getUserTotalBalance(userOpenId);
		let totalTimes = await UserCardModel.getUserTotalTimes(userOpenId);

		// 获取用户所有卡项
		let cards = await UserCardModel.getUserCards(userOpenId, { page: 1, size: 100 });

		return {
			user: user,
			userId: userOpenId, // 返回 openid 用于后续操作
			totalBalance: totalBalance,
			totalAmount: totalBalance, // 为了兼容性，同时返回两个字段
			totalTimes: totalTimes,
			cards: cards
		};
	}

	/** 通过卡项唯一识别码搜索 */
	async searchByUniqueId(uniqueId) {
		// 查找卡项
		let userCard = await UserCardModel.getByUniqueId(uniqueId);
		if (!userCard) return null;

		// 获取用户信息 - 支持多种用户类型（顺序查找）
		let userId = userCard.USER_CARD_USER_ID;
		const fields = 'USER_ID,USER_NAME,USER_MOBILE,USER_MINI_OPENID,USER_GOOGLE_ID,USER_GOOGLE_EMAIL,USER_ACCOUNT,USER_SOURCE,USER_WORK,USER_CITY,USER_TRADE,USER_ADD_TIME,USER_LOGIN_TIME';

		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, fields);
		if (!user) user = await UserModel.getOne({ USER_ID: userId }, fields);
		if (!user) user = await UserModel.getOne({ USER_GOOGLE_ID: userId }, fields);
		if (!user) user = await UserModel.getOne({ _id: userId }, fields);

		return {
			userCard: userCard,
			user: user
		};
	}

	/** 获取用户卡项列表 */
	async getUserCardList(userId, page = 1, size = 20) {
		return await UserCardModel.getUserCards(userId, page, size);
	}

	/** 给用户添加卡项（充值） */
	async addUserCard(adminId, {
		userId,
		cardId = '', // 卡项ID（可选，可以直接充值而不关联卡项商品）
		cardName,
		type, // 1=次数卡, 2=余额卡
		times = 0, // 次数（次数卡）
		amount = 0, // 金额（余额卡）
		validityDays = null, // 有效期天数（可选，如果不传则从卡项商品中获取）
		reason, // 充值原因（必填）
		paymentMethod = '' // 支付方式
	}) {
		// 验证参数
		if (!userId || !cardName || !type || !reason) {
			throw new Error('参数不完整');
		}

		if (type === UserCardModel.TYPE.TIMES && times <= 0) {
			throw new Error('次数卡必须指定次数');
		}

		if (type === UserCardModel.TYPE.BALANCE && amount <= 0) {
			throw new Error('余额卡必须指定金额');
		}

		// 如果有卡项ID且没有指定有效期，从卡项商品中获取有效期
		if (cardId && validityDays === null) {
			let cardItem = await CardItemModel.getOne({ _id: cardId }, 'CARD_VALIDITY_DAYS');
			if (cardItem && cardItem.CARD_VALIDITY_DAYS) {
				validityDays = cardItem.CARD_VALIDITY_DAYS;
			}
		}

		// 如果还是没有有效期，使用默认值365天
		if (validityDays === null) {
			validityDays = 365;
		}

		// 生成唯一识别码
		let uniqueId = await UserCardModel.generateUniqueUniqueId();

		// 计算过期时间（0表示永久有效）
		const timeUtil = require('../../../framework/utils/time_util.js');
		let expireTime = 0;
		if (validityDays > 0) {
			// timeUtil.time() 返回毫秒时间戳，需要乘以 1000
			expireTime = timeUtil.time() + (validityDays * 24 * 60 * 60 * 1000);
		}

		// 创建用户卡项记录
		let userCardData = {
			USER_CARD_USER_ID: userId,
			USER_CARD_UNIQUE_ID: uniqueId,
			USER_CARD_CARD_ID: cardId,
			USER_CARD_CARD_NAME: cardName,
			USER_CARD_TYPE: type,
			USER_CARD_TOTAL_TIMES: times,
			USER_CARD_USED_TIMES: 0,
			USER_CARD_REMAIN_TIMES: times,
			USER_CARD_TOTAL_AMOUNT: amount,
			USER_CARD_USED_AMOUNT: 0,
			USER_CARD_REMAIN_AMOUNT: amount,
			USER_CARD_STATUS: UserCardModel.STATUS.IN_USE,
			USER_CARD_PAYMENT_METHOD: paymentMethod,
			USER_CARD_ADMIN_ID: adminId,
			USER_CARD_EXPIRE_TIME: expireTime
		};

		let userCardId = await UserCardModel.insert(userCardData);

		// 创建充值记录
		await CardRecordModel.createRecord({
			userId: userId,
			userCardId: userCardId,
			type: CardRecordModel.TYPE.RECHARGE,
			changeTimes: times,
			changeAmount: amount,
			beforeTimes: 0,
			afterTimes: times,
			beforeAmount: 0,
			afterAmount: amount,
			reason: reason,
			adminId: adminId,
			relatedId: cardId,
			paymentMethod: paymentMethod
		});

		return {
			userCardId,
			uniqueId,
			expireTime
		};
	}

	/** 调整用户卡项（扣减或增加） */
	async adjustUserCard(adminId, {
		userCardId,
		changeTimes = 0, // 次数变动（正数=增加，负数=减少）
		changeAmount = 0, // 金额变动（正数=增加，负数=减少）
		reason, // 调整原因（必填）
		relatedId = '' // 关联ID（如预约ID）
	}) {
		// 验证参数
		if (!userCardId || !reason) {
			throw new Error('参数不完整');
		}

		if (changeTimes === 0 && changeAmount === 0) {
			throw new Error('变动数值不能为0');
		}

		// 获取当前卡项
		let userCard = await UserCardModel.getOne({ _id: userCardId });
		if (!userCard) {
			throw new Error('卡项不存在');
		}

		// 检查卡项是否过期
		if (UserCardModel.isExpired(userCard.USER_CARD_EXPIRE_TIME)) {
			throw new Error('卡项已过期，无法使用');
		}

		// 检查卡项状态
		if (userCard.USER_CARD_STATUS === UserCardModel.STATUS.EXPIRED) {
			throw new Error('卡项已过期，无法使用');
		}

		if (userCard.USER_CARD_STATUS === UserCardModel.STATUS.USED_UP) {
			throw new Error('卡项已用完，无法使用');
		}

		// 计算变动前后的数值
		let beforeTimes = userCard.USER_CARD_REMAIN_TIMES;
		let beforeAmount = userCard.USER_CARD_REMAIN_AMOUNT;
		let afterTimes = beforeTimes + changeTimes;
		let afterAmount = beforeAmount + changeAmount;

		// 验证扣减后不能为负数
		if (afterTimes < 0) {
			throw new Error('剩余次数不足');
		}
		if (afterAmount < 0) {
			throw new Error('剩余余额不足');
		}

		// 更新用户卡项
		let updateData = {};
		if (changeTimes !== 0) {
			updateData.USER_CARD_REMAIN_TIMES = afterTimes;
			if (changeTimes > 0) {
				updateData.USER_CARD_TOTAL_TIMES = userCard.USER_CARD_TOTAL_TIMES + changeTimes;
			} else {
				updateData.USER_CARD_USED_TIMES = userCard.USER_CARD_USED_TIMES + Math.abs(changeTimes);
			}
		}

		if (changeAmount !== 0) {
			updateData.USER_CARD_REMAIN_AMOUNT = afterAmount;
			if (changeAmount > 0) {
				updateData.USER_CARD_TOTAL_AMOUNT = userCard.USER_CARD_TOTAL_AMOUNT + changeAmount;
			} else {
				updateData.USER_CARD_USED_AMOUNT = userCard.USER_CARD_USED_AMOUNT + Math.abs(changeAmount);
			}
		}

		// 检查是否用完
		if (afterTimes === 0 && userCard.USER_CARD_TYPE === UserCardModel.TYPE.TIMES) {
			updateData.USER_CARD_STATUS = UserCardModel.STATUS.USED_UP;
		}
		if (afterAmount === 0 && userCard.USER_CARD_TYPE === UserCardModel.TYPE.BALANCE) {
			updateData.USER_CARD_STATUS = UserCardModel.STATUS.USED_UP;
		}

		await UserCardModel.edit(userCardId, updateData);

		// 创建使用记录
		let recordType = changeAmount < 0 || changeTimes < 0 ?
			CardRecordModel.TYPE.CONSUME :
			CardRecordModel.TYPE.ADMIN_ADJUST;

		await CardRecordModel.createRecord({
			userId: userCard.USER_CARD_USER_ID,
			userCardId: userCardId,
			type: recordType,
			changeTimes: changeTimes,
			changeAmount: changeAmount,
			beforeTimes: beforeTimes,
			afterTimes: afterTimes,
			beforeAmount: beforeAmount,
			afterAmount: afterAmount,
			reason: reason,
			adminId: adminId,
			relatedId: relatedId
		});

		return {
			success: true,
			afterTimes: afterTimes,
			afterAmount: afterAmount
		};
	}

	/** 获取用户卡项使用记录 */
	async getUserCardRecords(userId, userCardId = '', page = 1, size = 20) {
		if (userCardId) {
			return await CardRecordModel.getUserCardRecords(userCardId, page, size);
		} else {
			return await CardRecordModel.getUserRecords(userId, page, size);
		}
	}

	/** 获取用户信息（包含卡项汇总） */
	async getUserInfo(userId) {
		// 获取用户基本信息
		let user = await UserModel.getOne({ _id: userId }, 'USER_ID,USER_NAME,USER_MOBILE');
		if (!user) return null;

		// 获取卡项汇总
		let totalBalance = await UserCardModel.getUserTotalBalance(userId);
		let totalTimes = await UserCardModel.getUserTotalTimes(userId);

		// 获取卡项列表
		let cards = await UserCardModel.getUserCards(userId, { page: 1, size: 100 });

		return {
			user: user,
			totalBalance: totalBalance,
			totalTimes: totalTimes,
			cards: cards
		};
	}

	/** 统一搜索用户（支持手机号、email、用户ID、卡项唯一ID）*/
	async searchUser(keyword) {
		// 1. 优先匹配卡项唯一ID（UC开头，忽略大小写）
		if (keyword.toUpperCase().startsWith('UC')) {
			let result = await this.searchByUniqueId(keyword.toUpperCase());
			if (result) {
				// 获取完整用户信息
				let userOpenId = result.user?.USER_MINI_OPENID;
				if (userOpenId) {
					let totalBalance = await UserCardModel.getUserTotalBalance(userOpenId);
					let totalTimes = await UserCardModel.getUserTotalTimes(userOpenId);
					let cards = await UserCardModel.getUserCards(userOpenId, { page: 1, size: 100 });
					return {
						user: result.user,
						userId: userOpenId,
						totalBalance,
						totalAmount: totalBalance,
						totalTimes,
						cards,
						matchedBy: 'cardUniqueId',
						matchedCard: result.userCard
					};
				}
			}
		}

		// 2. 尝试按用户ID搜索（USER_MINI_OPENID、USER_ID、USER_GOOGLE_ID、_id）
		const idFields = 'USER_ID,USER_NAME,USER_MOBILE,USER_MINI_OPENID,USER_GOOGLE_ID,USER_GOOGLE_EMAIL,USER_ACCOUNT,USER_SOURCE,USER_WORK,USER_CITY,USER_TRADE,USER_ADD_TIME,USER_LOGIN_TIME';
		let userById = await UserModel.getOne({ USER_MINI_OPENID: keyword }, idFields);
		if (!userById) userById = await UserModel.getOne({ USER_ID: keyword }, idFields);
		if (!userById) userById = await UserModel.getOne({ USER_GOOGLE_ID: keyword }, idFields);
		if (!userById) userById = await UserModel.getOne({ _id: keyword }, idFields);

		if (userById) {
			let userOpenId = userById.USER_MINI_OPENID || userById._id;
			let totalBalance = await UserCardModel.getUserTotalBalance(userOpenId);
			let totalTimes = await UserCardModel.getUserTotalTimes(userOpenId);
			let cards = await UserCardModel.getUserCards(userOpenId, { page: 1, size: 100 });
			return {
				user: userById,
				userId: userOpenId,
				totalBalance,
				totalAmount: totalBalance,
				totalTimes,
				cards,
				matchedBy: 'userId'
			};
		}

		// 3. 尝试按 Google Email 搜索（忽略大小写）
		if (keyword.includes('@')) {
			let userByEmail = await UserModel.getOne(
				{ USER_GOOGLE_EMAIL: keyword.toLowerCase() },
				'USER_ID,USER_NAME,USER_MOBILE,USER_MINI_OPENID,USER_GOOGLE_ID,USER_GOOGLE_EMAIL,USER_ACCOUNT,USER_SOURCE,USER_WORK,USER_CITY,USER_TRADE,USER_ADD_TIME,USER_LOGIN_TIME'
			);
			if (userByEmail) {
				let userOpenId = userByEmail.USER_MINI_OPENID || userByEmail._id;
				let totalBalance = await UserCardModel.getUserTotalBalance(userOpenId);
				let totalTimes = await UserCardModel.getUserTotalTimes(userOpenId);
				let cards = await UserCardModel.getUserCards(userOpenId, { page: 1, size: 100 });
				return {
					user: userByEmail,
					userId: userOpenId,
					totalBalance,
					totalAmount: totalBalance,
					totalTimes,
					cards,
					matchedBy: 'email'
				};
			}
		}

		// 4. 最后尝试按手机号搜索
		let phoneResult = await this.searchUserByPhone(keyword, '');
		if (phoneResult) {
			phoneResult.matchedBy = 'phone';
		}
		return phoneResult;
	}
}

module.exports = AdminUserCardService;
