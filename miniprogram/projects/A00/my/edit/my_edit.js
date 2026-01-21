let behavior = require('../../../../behavior/my_edit_bh.js');
let PassortBiz = require('../../../../biz/passport_biz.js');
let skin = require('../../skin/skin.js');

Page({
	behaviors: [behavior],

	// 确保国家代码数据在页面级别也可用
	data: {
		countryCodeIndex: 0,
		countryCodes: [
			{ code: '+1', label: '+1 (美国)', minLen: 10, maxLen: 10 },
			{ code: '+86', label: '+86 (中国)', minLen: 11, maxLen: 11 }
		]
	},

	onReady: function () {
		PassortBiz.initPage({
			skin,
			that: this
		});
	},
})