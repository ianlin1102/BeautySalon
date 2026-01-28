/**
 * Notes: 购买凭证管理-控制器
 * Date: 2026-01-28
 */

const BaseAdminController = require('./base_admin_controller.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const LogModel = require('../../model/log_model.js');
const AdminUserCardService = require('../../service/admin/admin_user_card_service.js');
const CardItemModel = require('../../model/card_item_model.js');

class AdminPurchaseController extends BaseAdminController {

	/**
	 * 获取购买凭证列表（按月分组）
	 * 只返回有凭证图片的记录
	 * 支持按用户ID筛选
	 */
	async getPurchaseProofList() {
		await this.isAdmin();

		let rules = {
			page: 'must|int|default=1',
			size: 'int|default=20',
			userId: 'string|name=用户ID', // 按用户筛选
		};

		let input = this.validateData(rules);
		const page = input.page || 1;
		const size = input.size || 20;
		const userId = input.userId;

		const cloud = cloudBase.getCloud();
		const db = cloud.database();
		const _ = db.command;

		// 构建查询条件
		let whereCondition = {
			PURCHASE_PROOF_URL: _.neq('')
		};
		if (userId) {
			whereCondition.PURCHASE_USER_ID = userId;
		}

		// 查询有凭证的购买记录
		const countRes = await db.collection('ax_purchase_history')
			.where(whereCondition)
			.count();

		const total = countRes.total;

		const orderRes = await db.collection('ax_purchase_history')
			.where(whereCondition)
			.orderBy('PURCHASE_CREATE_TIME', 'desc')
			.skip((page - 1) * size)
			.limit(size)
			.get();

		let list = orderRes.data || [];

		// 格式化时间
		for (let k in list) {
			let createTime = list[k].PURCHASE_CREATE_TIME;

			// 处理不同的时间格式
			let timestamp = createTime;
			if (typeof createTime === 'string') {
				// 如果是字符串，尝试解析
				let parsed = Date.parse(createTime);
				if (!isNaN(parsed)) {
					timestamp = parsed;
				} else {
					// 尝试用 timeUtil 解析
					timestamp = timeUtil.time2Timestamp(createTime);
				}
			}

			// 如果还是无效，使用当前时间
			if (!timestamp || isNaN(timestamp)) {
				timestamp = Date.now();
			}

			list[k].PURCHASE_CREATE_TIME_FMT = timeUtil.timestamp2Time(timestamp, 'Y-M-D h:m');

			// 生成月份标记用于前端分组: "2026年01月"
			let d = new Date(timestamp);
			let year = d.getFullYear();
			let month = String(d.getMonth() + 1).padStart(2, '0');
			list[k].PURCHASE_MONTH = `${year}年${month}月`;

			// 状态描述
			let statusMap = {
				0: '待支付',
				1: '待确认',
				2: '已完成',
				'-1': '已取消'
			};
			list[k].PURCHASE_STATUS_DESC = statusMap[String(list[k].PURCHASE_STATUS)] || '未知';

			if (list[k].PURCHASE_UPDATE_TIME) {
				let updateTimestamp = list[k].PURCHASE_UPDATE_TIME;
				if (typeof updateTimestamp === 'string') {
					let parsed = Date.parse(updateTimestamp);
					updateTimestamp = !isNaN(parsed) ? parsed : timeUtil.time2Timestamp(updateTimestamp);
				}
				list[k].PURCHASE_UPDATE_TIME_FMT = timeUtil.timestamp2Time(updateTimestamp, 'Y-M-D h:m');
			}
		}

		return {
			list,
			total,
			page,
			size,
		};
	}

	/**
	 * 确认购买（审核通过）
	 * 1. 验证订单存在且状态为1(待确认)
	 * 2. 查询卡项商品获取完整信息（fallback到订单冗余字段）
	 * 3. 调用 AdminUserCardService.addUserCard 创建用户卡项
	 * 4. 更新订单状态为2(已完成)
	 * 5. 记录操作日志
	 */
	async confirmPurchase() {
		await this.isAdmin();

		let rules = {
			purchaseId: 'must|string|name=订单号',
		};

		let input = this.validateData(rules);

		const cloud = cloudBase.getCloud();
		const db = cloud.database();

		// 1. 验证订单存在
		const orderRes = await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.get();

		if (!orderRes.data || orderRes.data.length === 0) {
			this.AppError('订单不存在');
		}

		let order = orderRes.data[0];

		if (order.PURCHASE_STATUS !== 1) {
			this.AppError('该订单当前状态不支持确认操作');
		}

		// 2. 获取卡项完整信息（优先从 ax_card_item 查，fallback 到订单冗余字段）
		let cardType = order.PURCHASE_CARD_TYPE || 0;
		let cardTimes = order.PURCHASE_CARD_TIMES || 0;
		let cardAmount = order.PURCHASE_CARD_AMOUNT || 0;
		let cardName = order.PURCHASE_CARD_TITLE || '';
		let cardPrice = order.PURCHASE_CARD_PRICE || 0;

		if (order.PURCHASE_CARD_ID) {
			try {
				let cardItem = await CardItemModel.getOne({ _id: order.PURCHASE_CARD_ID });
				if (cardItem) {
					cardType = cardItem.CARD_TYPE ?? cardType;
					cardTimes = cardItem.CARD_TIMES ?? cardTimes;
					cardAmount = cardItem.CARD_AMOUNT ?? cardAmount;
					cardName = cardItem.CARD_NAME ?? cardName;
					cardPrice = cardItem.CARD_PRICE ?? cardPrice;
				}
			} catch (e) {
				console.log('【confirmPurchase】查询卡项商品失败，使用订单冗余数据:', e.message);
			}
		}

		// 3. 验证卡项类型有效
		if (!cardType || (cardType !== 1 && cardType !== 2)) {
			this.AppError('无法确认：卡项类型未知（订单中无 CARD_TYPE，且原始卡项查询失败）');
		}

		// 4. 创建用户卡项
		let service = new AdminUserCardService();
		let times = cardType === 1 ? cardTimes : 0;
		let amount = cardType === 2 ? cardAmount : 0;

		// 余额卡：如果 CARD_AMOUNT 为 0 但 CARD_PRICE 有值，用 CARD_PRICE 作为充值金额
		if (cardType === 2 && amount === 0 && cardPrice > 0) {
			amount = cardPrice;
		}

		let addResult = await service.addUserCard(this._adminId, {
			userId: order.PURCHASE_USER_ID,
			cardId: order.PURCHASE_CARD_ID || '',
			cardName: cardName || '未知卡项',
			type: cardType,
			times: times,
			amount: amount,
			reason: `购买确认 - 订单号 ${input.purchaseId}`,
			paymentMethod: order.PURCHASE_PAYMENT_METHOD || ''
		});

		// 5. 更新订单状态
		await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.update({
				data: {
					PURCHASE_STATUS: 2,
					PURCHASE_UPDATE_TIME: Date.now(),
				}
			});

		// 6. 记录操作日志
		this.log(`确认购买订单 ${input.purchaseId}，用户：${order.PURCHASE_USER_NAME || order.PURCHASE_USER_ID}，卡项：${cardName}，已自动创建用户卡项 ${addResult.uniqueId}`, LogModel.TYPE.PURCHASE);

		return {
			message: '确认成功，已为用户创建卡项',
			userCardId: addResult.userCardId,
			uniqueId: addResult.uniqueId
		};
	}

	/**
	 * 拒绝/取消购买
	 */
	async rejectPurchase() {
		await this.isAdmin();

		let rules = {
			purchaseId: 'must|string|name=订单号',
		};

		let input = this.validateData(rules);

		const cloud = cloudBase.getCloud();
		const db = cloud.database();

		// 验证订单存在
		const orderRes = await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.get();

		if (!orderRes.data || orderRes.data.length === 0) {
			this.AppError('订单不存在');
		}

		let order = orderRes.data[0];

		// 更新订单状态
		await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.update({
				data: {
					PURCHASE_STATUS: -1,
					PURCHASE_UPDATE_TIME: Date.now(),
				}
			});

		// 记录操作日志
		this.log(`拒绝购买订单 ${input.purchaseId}，用户：${order.PURCHASE_USER_NAME || order.PURCHASE_USER_ID}，卡项：${order.PURCHASE_CARD_TITLE}`, LogModel.TYPE.PURCHASE);

		return { message: '已拒绝' };
	}

	/**
	 * 删除购买记录（同时删除凭证图片）
	 */
	async deletePurchase() {
		await this.isAdmin();

		let rules = {
			purchaseId: 'must|string|name=订单号',
		};

		let input = this.validateData(rules);

		const cloud = cloudBase.getCloud();
		const db = cloud.database();

		// 1. 查询订单获取图片URL
		const orderRes = await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.get();

		if (!orderRes.data || orderRes.data.length === 0) {
			this.AppError('订单不存在');
		}

		let order = orderRes.data[0];
		let proofUrl = order.PURCHASE_PROOF_URL;

		// 2. 删除云存储中的图片
		if (proofUrl) {
			try {
				// 从URL中提取fileID (cloud://xxx 格式)
				let fileID = proofUrl;
				// 如果是 https 链接，需要转换为 cloud:// 格式
				// 但通常存储的就是 cloud:// 格式的 fileID
				if (fileID.startsWith('cloud://') || fileID.includes('qcloud.la')) {
					await cloud.deleteFile({
						fileList: [fileID]
					});
					console.log('【deletePurchase】删除凭证图片成功:', fileID);
				}
			} catch (err) {
				// 图片删除失败不影响记录删除
				console.log('【deletePurchase】删除凭证图片失败:', err.message);
			}
		}

		// 3. 删除数据库记录
		await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.remove();

		// 4. 记录操作日志
		this.log(`删除购买订单 ${input.purchaseId}，用户：${order.PURCHASE_USER_NAME || order.PURCHASE_USER_ID}，卡项：${order.PURCHASE_CARD_TITLE}`, LogModel.TYPE.PURCHASE);

		return { message: '删除成功' };
	}
}

module.exports = AdminPurchaseController;
