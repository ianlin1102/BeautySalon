const pageHelper = require('../../../helper/page_helper');
const cloudHelper = require('../../../helper/cloud_helper');

// 默认声明内容
const DEFAULT_SECTIONS = [
	{
		title: '一、购买须知',
		content: '1. 购买本卡项即表示您已充分了解并同意本免责声明的全部内容。\n2. 卡项一经售出，概不退换。请在购买前仔细核对卡项类型、次数/金额、有效期等信息。\n3. 卡项仅限本人使用，不得转让、出售或赠予他人。'
	},
	{
		title: '二、使用规则',
		content: '1. 卡项使用时需提前预约，预约时间以实际可预约时段为准。\n2. 如需取消预约，请至少提前24小时通知，否则将扣除相应次数或金额。\n3. 卡项在有效期内未使用完毕，过期自动作废，不予退款或延期。'
	},
	{
		title: '三、免责条款',
		content: '1. 因不可抗力（如自然灾害、政府行为等）导致无法提供服务的，本机构不承担任何责任。\n2. 用户因个人原因无法使用卡项的（如身体状况、时间安排等），本机构不承担责任。\n3. 本机构保留对卡项规则的最终解释权。'
	},
	{
		title: '四、其他说明',
		content: '1. 本免责声明的修改、更新及最终解释权归本机构所有。\n2. 如对本声明有任何疑问，请联系客服咨询。'
	}
];

Page({
	data: {
		isLoad: false,
		title: '卡项购买免责声明',
		sections: []
	},

	onLoad: async function(options) {
		await this._loadDisclaimer();
	},

	_loadDisclaimer: async function() {
		try {
			let res = await cloudHelper.callCloudData('setup/disclaimer_get', {});
			if (res && res.sections && res.sections.length > 0) {
				this.setData({
					isLoad: true,
					title: res.title || '卡项购买免责声明',
					sections: res.sections
				});
			} else {
				// 使用默认内容
				this.setData({
					isLoad: true,
					sections: DEFAULT_SECTIONS
				});
			}
		} catch (err) {
			console.log('加载声明内容失败，使用默认内容:', err);
			// 使用默认内容
			this.setData({
				isLoad: true,
				sections: DEFAULT_SECTIONS
			});
		}
	},

	/**
	 * 用户点击"我已阅读并同意"
	 */
	bindAgreeTap: function() {
		// 获取当前页面栈
		const pages = getCurrentPages();

		// 获取上一个页面（卡项详情页）
		if (pages.length >= 2) {
			const prevPage = pages[pages.length - 2];

			// 设置上一个页面的同意状态为true
			prevPage.setData({
				agreedDisclaimer: true
			});
		}

		// 返回上一页
		wx.navigateBack({
			delta: 1
		});
	},

	/**
	 * 用户点击"返回"
	 */
	bindCancelTap: function() {
		wx.navigateBack({
			delta: 1
		});
	}
});
