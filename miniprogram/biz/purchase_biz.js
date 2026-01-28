/**
 * Notes: 购买业务逻辑
 */

const BaseBiz = require('./base_biz.js');
const cloudHelper = require('../helper/cloud_helper.js');
const dataHelper = require('../helper/data_helper.js');
const PassportBiz = require('./passport_biz.js');

class PurchaseBiz extends BaseBiz {

	/**
	 * 创建购买订单
	 * @param {string} cardId - 卡项ID
	 * @param {string} paymentMethod - 支付方式
	 * @returns {Object} { purchaseId, message }
	 */
	static async createOrder(cardId, paymentMethod = 'zelle') {
		let params = {
			cardId,
			paymentMethod,
		};
		let opts = { title: '创建订单中..' };
		let result = await cloudHelper.callCloudSumbit('purchase/create', params, opts);
		if (!result || !result.data) {
			throw new Error('创建订单失败');
		}
		return result.data;
	}

	/**
	 * 上传支付凭证图片
	 * 小程序端直接使用 wx.cloud.uploadFile 上传文件，不走 base64
	 * 然后调用云函数更新订单记录
	 * @param {string} purchaseId - 订单ID
	 * @param {string} tempFilePath - wx.chooseMedia 返回的临时文件路径
	 * @returns {Object} { fileID, message }
	 */
	static async uploadProof(purchaseId, tempFilePath) {
		wx.showLoading({ title: '上传凭证中..', mask: true });

		try {
			// 1. 上传图片到云存储（路径格式与 Web 端一致: purchase_proof/年/月/日/用户id_随机字符串.扩展名）
			let ext = tempFilePath.match(/\.[^.]+?$/);
			ext = ext ? ext[0] : '.jpg';
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			const userId = PassportBiz.getToken() || 'unknown';
			const rd = dataHelper.genRandomNum(100000, 999999);
			const cloudPath = `purchase_proof/${year}/${month}/${day}/${userId}_${rd}${ext}`;

			const uploadRes = await wx.cloud.uploadFile({
				cloudPath: cloudPath,
				filePath: tempFilePath,
			});

			if (!uploadRes.fileID) {
				throw new Error('图片上传失败');
			}

			// 2. 调用云函数更新订单记录
			let params = {
				purchaseId,
				fileID: uploadRes.fileID,
			};
			let result = await cloudHelper.callCloudSumbit('purchase/upload_proof_mini', params, { hint: false });

			wx.hideLoading();
			return {
				fileID: uploadRes.fileID,
				message: result && result.data ? result.data.message : '凭证上传成功'
			};
		} catch (err) {
			wx.hideLoading();
			throw err;
		}
	}
}

module.exports = PurchaseBiz;
