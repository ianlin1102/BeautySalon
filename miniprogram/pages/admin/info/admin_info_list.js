const AdminBiz = require('../../../biz/admin_biz.js');
const pageHelper = require('../../../helper/page_helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');

Page({

	data: {
		isLoad: false,
		viewMode: 'courses', // 'courses' | 'detail'

		search: '',
		sortMenus: [],
		sortItems: [],
		dataList: null,

		// 课程卡片模式
		courseCards: [], // [{meetId, title, instructorName, count}]

		// 课程详情模式
		currentMeetId: '',
		currentMeetTitle: '',
		groupedData: [],

		// 补录弹窗
		showBackfillModal: false,
		backfillStep: 1,
		backfillGroup: null,
		backfillSearch: '',
		backfillUserResult: null,
		backfillSelectedUser: null,
		backfillCards: [],
		backfillSelectedCardId: '',
		backfillSearchError: '',
		backfillSearching: false,
	},

	onLoad: function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		if (options.meetId) {
			// 课程详情模式
			this._getSearchMenu();
			let title = decodeURIComponent(options.title || '预约详情');
			this.setData({
				isLoad: true,
				viewMode: 'detail',
				currentMeetId: options.meetId,
				currentMeetTitle: title,
				_params: { meetId: options.meetId, size: 500 }
			});
			wx.setNavigationBarTitle({ title });
		} else {
			// 课程卡片模式：不需要搜索菜单
			this.setData({
				isLoad: true,
				viewMode: 'courses',
				_params: { size: 500 }
			});
		}
	},

	_getSearchMenu: function () {
		let sortMenus = [
			{ label: '全部', type: '', value: '' },
			{ label: '未过期', type: 'expired', value: '0' },
			{ label: '已过期', type: 'expired', value: '1' },
			{ label: '预约成功', type: 'status', value: '1' },
			{ label: '用户取消', type: 'status', value: '10' },
			{ label: '系统取消', type: 'status', value: '99' },
			{ label: '已签到', type: 'isCheckin', value: '1' },
			{ label: '未签到', type: 'isCheckin', value: '0' },
		];
		this.setData({ sortItems: [], sortMenus });
	},

	/** 从预约列表中提取课程卡片（去重+统计数量） */
	_buildCourseCards: function (list) {
		if (!list || !list.length) {
			this.setData({ courseCards: [] });
			return;
		}

		let map = {};
		for (let item of list) {
			let meetId = item.JOIN_MEET_ID;
			if (!meetId) continue;
			if (!map[meetId]) {
				map[meetId] = {
					meetId,
					title: item.JOIN_MEET_TITLE || '未知课程',
					instructorName: item.JOIN_INSTRUCTOR_NAME || '',
					count: 0
				};
			}
			map[meetId].count++;
		}

		let courseCards = Object.values(map);
		courseCards.sort((a, b) => a.title.localeCompare(b.title));
		this.setData({ courseCards });
	},

	/** 按时段分组（详情模式） */
	_groupByTimeSlot: function () {
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list) {
			this.setData({ groupedData: [] });
			return;
		}

		let list = dataList.list;
		let groupMap = {};
		for (let i = 0; i < list.length; i++) {
			let item = list[i];
			item._dataIdx = i; // 存储原始索引，供操作按钮使用
			let key = item.JOIN_MEET_DAY + '_' + item.JOIN_MEET_TIME_START + '_' + item.JOIN_MEET_TIME_MARK;
			if (!groupMap[key]) {
				groupMap[key] = {
					day: item.JOIN_MEET_DAY,
					timeStart: item.JOIN_MEET_TIME_START,
					timeEnd: item.JOIN_MEET_TIME_END,
					timeMark: item.JOIN_MEET_TIME_MARK,
					meetId: item.JOIN_MEET_ID,
					meetTitle: item.JOIN_MEET_TITLE,
					items: []
				};
			}
			groupMap[key].items.push(item);
		}

		let groupedData = Object.values(groupMap);
		groupedData.sort((a, b) => {
			if (a.day !== b.day) return a.day.localeCompare(b.day);
			return a.timeStart.localeCompare(b.timeStart);
		});

		this.setData({ groupedData });
	},

	bindCommListCmpt: function (e) {
		pageHelper.commListListener(this, e);

		if (this.data.dataList && this.data.dataList.list) {
			if (this.data.viewMode === 'courses') {
				this._buildCourseCards(this.data.dataList.list);
			} else {
				this._groupByTimeSlot();
			}
		}
	},

	/** 点击课程卡片，进入详情 */
	bindCourseTap: function (e) {
		let meetId = pageHelper.dataset(e, 'meetId');
		let title = pageHelper.dataset(e, 'title');
		wx.navigateTo({
			url: '/pages/admin/info/admin_info_list?meetId=' + encodeURIComponent(meetId) + '&title=' + encodeURIComponent(title)
		});
	},

	bindCopyTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.dataList.list[idx];

		let str = '预约活动：' + item.JOIN_MEET_TITLE + '\n';
		str += '预约时间：' + item.JOIN_MEET_DAY + ' ' + item.JOIN_MEET_TIME_START + '~' + item.JOIN_MEET_TIME_END + '\n';

		if (item.JOIN_FORMS) {
			for (let i = 0; i < item.JOIN_FORMS.length; i++) {
				str += item.JOIN_FORMS[i].title + '：' + item.JOIN_FORMS[i].val + '\n';
			}
		}

		wx.setClipboardData({
			data: str,
			success: function () {
				pageHelper.showSuccToast('复制成功');
			}
		});
	},

	bindCheckinTap: async function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let flag = pageHelper.dataset(e, 'flag');
		let item = this.data.dataList.list[idx];

		let params = {
			joinId: item._id,
			flag: Number(flag)
		};

		let callback = async () => {
			try {
				let opts = {
					title: flag == 1 ? '签到中' : '取消签到中'
				};
				await cloudHelper.callCloudSumbit('admin/join_checkin', params, opts).then(res => {
					this.setData({
						['dataList.list[' + idx + '].JOIN_IS_CHECKIN']: Number(flag)
					});
					this._groupByTimeSlot();
					pageHelper.showSuccToast(flag == 1 ? '签到成功' : '已取消签到');
				});
			} catch (err) {
				console.error(err);
			}
		};

		if (flag == 1) {
			callback();
		} else {
			pageHelper.showConfirm('确认取消签到?', callback);
		}
	},

	bindStatusTap: async function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let status = pageHelper.dataset(e, 'status');
		let item = this.data.dataList.list[idx];

		let params = {
			joinId: item._id,
			status: Number(status)
		};

		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				await cloudHelper.callCloudSumbit('admin/join_status', params, opts).then(res => {
					this.setData({
						['dataList.list[' + idx + '].JOIN_STATUS']: Number(status),
						['dataList.list[' + idx + '].JOIN_REASON']: ''
					});
					this._groupByTimeSlot();
					pageHelper.showSuccToast('操作成功');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认恢复预约?', callback);
	},

	bindCancelTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.dataList.list[idx];

		let callback = async () => {
			let params = { joinId: item._id, status: 99 };
			try {
				let opts = { title: '取消中' };
				await cloudHelper.callCloudSumbit('admin/join_status', params, opts).then(res => {
					this.setData({
						['dataList.list[' + idx + '].JOIN_STATUS']: 99
					});
					this._groupByTimeSlot();
					pageHelper.showSuccToast('已取消');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认取消该预约?', callback);
	},

	bindDetailTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.dataList.list[idx];
		wx.navigateTo({
			url: '/pages/admin/info/detail/admin_info_detail?joinId=' + encodeURIComponent(item._id)
		});
	},

	bindDelTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.dataList.list[idx];

		let callback = async () => {
			let params = { joinId: item._id };
			try {
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/join_del', params, opts).then(res => {
					let dataList = this.data.dataList;
					dataList.list.splice(idx, 1);
					dataList.total--;
					this.setData({ dataList });
					this._groupByTimeSlot();
					pageHelper.showSuccToast('已删除');
				});
			} catch (err) {
				console.error(err);
			}
		};

		pageHelper.showConfirm('确认删除该记录?', callback);
	},

	// ============ 补录相关 ============

	bindBackfillTap: function (e) {
		let groupIdx = pageHelper.dataset(e, 'groupIdx');
		let group = this.data.groupedData[groupIdx];
		if (!group) return;

		this.setData({
			showBackfillModal: true,
			backfillStep: 1,
			backfillGroup: group,
			backfillSearch: '',
			backfillUserResult: null,
			backfillSelectedUser: null,
			backfillCards: [],
			backfillSelectedCardId: '',
			backfillSearchError: '',
			backfillSearching: false
		});
	},

	bindCloseBackfill: function () {
		this.setData({ showBackfillModal: false });
	},

	bindBackfillSearchInput: function (e) {
		this.setData({ backfillSearch: e.detail.value });
	},

	bindBackfillSearchConfirm: async function () {
		let keyword = this.data.backfillSearch.trim();
		if (!keyword) {
			this.setData({ backfillSearchError: '请输入搜索关键字' });
			return;
		}

		this.setData({
			backfillSearching: true,
			backfillSearchError: '',
			backfillUserResult: null
		});

		try {
			let params = { keyword };
			let opts = { title: 'bar' };
			let result = await cloudHelper.callCloudData('admin/user_search', params, opts);

			if (result && result.user) {
				this.setData({
					backfillUserResult: result,
					backfillSearching: false
				});
			} else {
				this.setData({
					backfillSearchError: '未找到该用户',
					backfillSearching: false
				});
			}
		} catch (err) {
			console.error(err);
			this.setData({
				backfillSearchError: '搜索失败: ' + (err.message || '未知错误'),
				backfillSearching: false
			});
		}
	},

	bindBackfillNext: async function () {
		if (!this.data.backfillUserResult) {
			pageHelper.showModal('请先搜索并选择用户');
			return;
		}

		let userResult = this.data.backfillUserResult;
		let cards = [];
		if (userResult.cards && userResult.cards.list) {
			cards = userResult.cards.list.filter(c => c.USER_CARD_STATUS == 1);
		}

		this.setData({
			backfillStep: 2,
			backfillSelectedUser: userResult,
			backfillCards: cards,
			backfillSelectedCardId: ''
		});
	},

	bindBackfillBack: function () {
		this.setData({ backfillStep: 1 });
	},

	bindBackfillCardChange: function (e) {
		this.setData({ backfillSelectedCardId: e.detail.value });
	},

	bindBackfillSubmit: async function () {
		let group = this.data.backfillGroup;
		let userResult = this.data.backfillSelectedUser;
		if (!group || !userResult) return;

		let params = {
			meetId: group.meetId,
			timeMark: group.timeMark,
			userId: userResult.userId,
			cardId: this.data.backfillSelectedCardId || ''
		};

		let cardDesc = '';
		if (params.cardId) {
			let card = this.data.backfillCards.find(c => c._id === params.cardId);
			if (card) cardDesc = '，扣 ' + card.USER_CARD_CARD_NAME;
		} else {
			cardDesc = '（免费）';
		}

		let confirmMsg = '确认补录 ' + (userResult.user.USER_NAME || '该用户') + ' 到 ' + group.day + ' ' + group.timeStart + cardDesc + '？';

		pageHelper.showConfirm(confirmMsg, async () => {
			try {
				let opts = { title: '补录中' };
				await cloudHelper.callCloudSumbit('admin/join_backfill', params, opts);
				pageHelper.showSuccToast('补录成功');
				this.setData({ showBackfillModal: false });
				this.selectComponent('#cmpt-comm-list').reload();
			} catch (err) {
				console.error(err);
				pageHelper.showModal('补录失败: ' + (err.message || '未知错误'));
			}
		});
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	onShow: function () {},

	onPullDownRefresh: async function () {
		let cbFun = () => { wx.stopPullDownRefresh(); };
		this.selectComponent('#cmpt-comm-list').reload(cbFun);
	},

	onReachBottom: function () {}

});
