const pageHelper = require('../../../helper/page_helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');

Page({
	data: {
		isLoad: false,
		sections: [],
		language: 'en',
	},

	onLoad: async function () {
		await this._loadTerms();
	},

	// 切换语言
	bindLanguageToggle: function () {
		this.setData({
			language: this.data.language === 'zh' ? 'en' : 'zh'
		});
	},

	_loadTerms: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/get', { type: 'card_terms' }, { title: 'bar' });
			this.setData({
				isLoad: true,
				sections: res.sections || []
			});
		} catch (err) {
			pageHelper.showModal('加载条款失败');
		}
	},
});
