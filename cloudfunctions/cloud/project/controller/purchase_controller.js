/**
 * Notes: 购买/充值模块控制器
 * Date: 2026-01-07
 */

const BaseController = require('./base_controller.js');
const cloudBase = require('../../framework/cloud/cloud_base.js');
const timeUtil = require('../../framework/utils/time_util.js');

class PurchaseController extends BaseController {

	/**
	 * 测试方法 - 用于验证路由是否正常工作
	 */
	async test() {
		console.log('【Purchase Test】测试方法被调用');
		return {
			success: true,
			message: '购买模块测试成功',
			timestamp: Date.now(),
			userId: this._userId
		};
	}

	/**
	 * 创建购买订单
	 */
	async createOrder() {
		console.log('【Purchase】createOrder 开始执行');
		try {
		// 数据校验
		let rules = {
			cardId: 'must|string',
			paymentMethod: 'must|string',
		};

		let input = this.validateData(rules);

		const cloud = cloudBase.getCloud();
		const db = cloud.database();

		// 生成订单号
		const purchaseId = 'PUR' + timeUtil.time('YMDhms') + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

		// 获取卡项信息
		let cardInfo = {};
		if (input.cardId) {
			try {
				const cardRes = await db.collection('ax_card').doc(input.cardId).get();
				if (cardRes.data) {
					cardInfo = cardRes.data;
				}
			} catch (e) {
				console.log('获取卡项信息失败:', e);
			}
		}

		// 创建订单记录
		const orderData = {
			PURCHASE_ID: purchaseId,
			PURCHASE_USER_ID: this._userId,
			PURCHASE_USER_NAME: input.userName || '',
			PURCHASE_USER_PHONE: input.userPhone || '',
			PURCHASE_CARD_ID: input.cardId,
			PURCHASE_CARD_TITLE: cardInfo.CARD_TITLE || input.cardInfo?.CARD_TITLE || '',
			PURCHASE_CARD_PRICE: cardInfo.CARD_PRICE || input.cardInfo?.CARD_PRICE || 0,
			PURCHASE_PAYMENT_METHOD: input.paymentMethod,
			PURCHASE_STATUS: 0, // 0:待支付 1:待确认 2:已完成 -1:已取消
			PURCHASE_PROOF_URL: '',
			PURCHASE_CREATE_TIME: Date.now(),
			PURCHASE_UPDATE_TIME: Date.now(),
		};

		await db.collection('ax_purchase_history').add({
			data: orderData
		});

		console.log('【Purchase】订单创建成功:', purchaseId);
		return {
			purchaseId,
			message: '订单创建成功，请上传支付凭证'
		};
		} catch (error) {
			console.error('【Purchase】createOrder 异常:', error.message);
			console.error('【Purchase】异常堆栈:', error.stack);
			throw error;
		}
	}

	/**
	 * 上传支付凭证
	 */
	async uploadProof() {
		// 数据校验
		let rules = {
			purchaseId: 'must|string',
			base64Data: 'must|string',
			fileExt: 'string',
		};

		let input = this.validateData(rules);

		const cloud = cloudBase.getCloud();
		const db = cloud.database();

		// 验证订单是否存在
		const orderRes = await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.get();

		if (!orderRes.data || orderRes.data.length === 0) {
			throw new Error('订单不存在');
		}

		// 将 base64 转换为 Buffer
		const buffer = Buffer.from(input.base64Data, 'base64');

		// 生成文件路径：purchase_proof/年/月/日/用户id_随机字符串.扩展名
		const fileExt = input.fileExt || 'jpg';
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const randomStr = Math.random().toString(36).substring(2, 18).toUpperCase();
		const cloudPath = `purchase_proof/${year}/${month}/${day}/${this._userId}_${randomStr}.${fileExt}`;

		// 上传到云存储
		const uploadRes = await cloud.uploadFile({
			cloudPath: cloudPath,
			fileContent: buffer,
		});

		console.log('上传结果:', uploadRes);

		if (!uploadRes.fileID) {
			throw new Error('文件上传失败');
		}

		// 更新订单记录
		await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.update({
				data: {
					PURCHASE_PROOF_URL: uploadRes.fileID,
					PURCHASE_STATUS: 1, // 待确认
					PURCHASE_UPDATE_TIME: Date.now(),
				}
			});

		return {
			fileID: uploadRes.fileID,
			message: '凭证上传成功，请等待工作人员确认'
		};
	}

	/**
	 * 获取订单详情
	 */
	async getOrderDetail() {
		let rules = {
			purchaseId: 'must|string',
		};

		let input = this.validateData(rules);

		const cloud = cloudBase.getCloud();
		const db = cloud.database();

		const orderRes = await db.collection('ax_purchase_history')
			.where({ PURCHASE_ID: input.purchaseId })
			.get();

		if (!orderRes.data || orderRes.data.length === 0) {
			throw new Error('订单不存在');
		}

		return orderRes.data[0];
	}

	/**
	 * 获取我的订单列表
	 */
	async getMyOrders() {
		let rules = {
			page: 'int',
			size: 'int',
		};

		let input = this.validateData(rules);
		const page = input.page || 1;
		const size = input.size || 10;

		const cloud = cloudBase.getCloud();
		const db = cloud.database();

		const orderRes = await db.collection('ax_purchase_history')
			.where({ PURCHASE_USER_ID: this._userId })
			.orderBy('PURCHASE_CREATE_TIME', 'desc')
			.skip((page - 1) * size)
			.limit(size)
			.get();

		return {
			list: orderRes.data || [],
			page,
			size,
		};
	}
}

module.exports = PurchaseController;
