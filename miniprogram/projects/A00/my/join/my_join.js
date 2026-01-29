let behavior = require('../../../../behavior/my_join_bh.js');
let PassortBiz = require('../../../../biz/passport_biz.js');
let skin = require('../../skin/skin.js');

Page({
	behaviors: [behavior],

	onReady: function () {
		PassortBiz.initPage({
			skin,
			that: this,
			isLoadSkin: true,
		});

		// 覆盖 behavior 中的 getSearchMenu
		this._initSearchMenu(skin);
	},

	/**
	 * 搜索菜单设置
	 * _items 传入格式: [[{label, type, value}, ...]]
	 * 组件内部会包装成: [{ show: false, items: [...] }]
	 */
	_initSearchMenu: function (skin) {
		wx.setNavigationBarTitle({
			title: '我的' + skin.MEET_NAME
		});

		// sortItems 传给组件的 _items，格式是数组的数组
		let sortItem1 = [{
			label: '排序',
			type: '',
			value: ''
		}, {
			label: '按时间倒序',
			type: 'timedesc',
			value: ''
		}, {
			label: '按时间正序',
			type: 'timeasc',
			value: ''
		}];

		let sortItems = [sortItem1];

		let sortMenus = [{
			label: '全部',
			type: '',
			value: ''
		}, {
			label: '今日',
			type: 'today',
			value: ''
		}, {
			label: '明日',
			type: 'tomorrow',
			value: ''
		}, {
			label: '已预约',
			type: 'succ',
			value: ''
		}, {
			label: '已取消',
			type: 'cancel',
			value: ''
		}];

		this.setData({
			sortItems,
			sortMenus
		});
	}
})
