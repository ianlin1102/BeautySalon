const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const AdminMeetBiz = require('../biz/admin_meet_biz.js');
const MeetBiz = require('../biz/meet_biz.js');
const setting = require('../setting/setting.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,


		tabCur: 0,
		mainCur: 0,
		verticalNavTop: 0,

		showMind: true,
		showTime: false,
	},
	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: function (options) {
			if (!pageHelper.getOptions(this, options)) return;

			this._loadDetail();
		},

		_loadDetail: async function () {
			let id = this.data.id;
			if (!id) return;

			let params = {
				id,
			};
			let opt = {
				title: 'bar'
			};
			let meet = await cloudHelper.callCloudData('meet/view', params, opt);
			if (!meet) {
				this.setData({
					isLoad: null
				})
				return;
			}

			// 检查用户在这个活动中的预约状态
			try {
				let joinParams = {
					search: '',
					sortType: '',
					sortVal: '',
					orderBy: {},
					page: 1,
					size: 100,
					isTotal: false
				};
				let myJoins = await cloudHelper.callCloudData('my/my_join_list', joinParams, {title: ''});
				
				// 查找用户在当前活动中的预约
				let currentMeetJoins = [];
				if (myJoins && myJoins.list) {
					currentMeetJoins = myJoins.list.filter(join => 
						join.JOIN_MEET_ID === id && join.JOIN_STATUS === 1
					);
				}


				// 标记已预约的时间段
				if (meet.MEET_DAYS_SET) {
					for (let daySet of meet.MEET_DAYS_SET) {
						if (daySet.times) {
							for (let timeSlot of daySet.times) {
								// 检查这个时间段是否已被用户预约
								// 由于JOIN_MEET_TIME_MARK字段不存在，使用日期和时间来匹配
								let dayFormatted = daySet.day; // 格式: 2025-10-22
								let isJoined = currentMeetJoins.some(join => {
									// 从格式化的日期中提取原始日期 (去掉年月日和星期信息)
									let joinDay = join.JOIN_MEET_DAY; // 格式: "2025年10月22日 (周三)"
									let joinDateMatch = joinDay.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
									if (joinDateMatch) {
										let year = joinDateMatch[1];
										let month = joinDateMatch[2].padStart(2, '0');
										let day = joinDateMatch[3].padStart(2, '0');
										let joinDayFormatted = `${year}-${month}-${day}`;
										
										// 检查日期和开始时间是否匹配
										return joinDayFormatted === dayFormatted && 
											   join.JOIN_MEET_TIME_START === timeSlot.start;
									}
									return false;
								});
								
								if (isJoined) {
									timeSlot.userJoined = true;
								}
							}
						}
					}
				}

				// 重新设置数据以触发页面更新
				this.setData({
					isLoad: true,
					meet,
					userJoins: currentMeetJoins,
					canNullTime: setting.MEET_CAN_NULL_TIME
				});
				
			} catch (e) {
				console.error('加载用户预约状态失败:', e);
				// 即使预约状态检查失败，也要显示基本数据
				this.setData({
					isLoad: true,
					meet, 
					canNullTime: setting.MEET_CAN_NULL_TIME
				});
			}

		},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () {

		},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: function () {

		},

		/**
		 * 生命周期函数--监听页面隐藏
		 */
		onHide: function () {

		},

		/**
		 * 生命周期函数--监听页面卸载
		 */
		onUnload: function () {

		},

		/**
		 * 页面相关事件处理函数--监听用户下拉动作
		 */
		onPullDownRefresh: async function () {
			await this._loadDetail();
			wx.stopPullDownRefresh();
		},

		/**
		 * 页面上拉触底事件的处理函数
		 */
		onReachBottom: function () {

		},

		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},

		bindJoinTap: async function (e) {
			let dayIdx = pageHelper.dataset(e, 'dayidx');
			let timeIdx = pageHelper.dataset(e, 'timeidx');

			let time = this.data.meet.MEET_DAYS_SET[dayIdx].times[timeIdx];


			if (time.error) {
				if (time.error.includes('预约'))
					return pageHelper.showModal('该时段' + time.error + '，换一个时段试试吧！');
				else
					return pageHelper.showModal('该时段预约' + time.error + '，换一个时段试试吧！');
			}

			let meetId = this.data.id;
			let timeMark = time.mark;

			let callback = async () => {
				try {
					let opts = {
						title: '请稍候',
					}
					let params = {
						meetId,
						timeMark
					}
					await cloudHelper.callCloudSumbit('meet/before_join', params, opts).then(res => {
						wx.navigateTo({
							url: `../join/meet_join?id=${meetId}&timeMark=${timeMark}`,
						})
					});
				} catch (ex) {
					console.log(ex);
				}
			}
			MeetBiz.subscribeMessageMeet(callback);

		},

		url: function (e) {
			pageHelper.url(e, this);
		},

		onPageScroll: function (e) {
			console.log(111)
			if (e.scrollTop > 100) {
				this.setData({
					topShow: true
				});
			} else {
				this.setData({
					topShow: false
				});
			}
		},

		bindTopTap: function () {
			wx.pageScrollTo({
				scrollTop: 0
			})
		},

		bindVerticalMainScroll: function (e) {
			if (!this.data.isLoad) return;

			let list = this.data.meet.MEET_DAYS_SET;
			let tabHeight = 0;

			for (let i = 0; i < list.length; i++) {
				let view = wx.createSelectorQuery().in(this).select("#main-" + i);
				view.fields({
					size: true
				}, data => {
					list[i].top = tabHeight;
					tabHeight = tabHeight + data.height;
					list[i].bottom = tabHeight;
				}).exec();
			}

			let scrollTop = e.detail.scrollTop + 20; // + i*0.5; //TODO
			for (let i = 0; i < list.length; i++) {

				if (scrollTop > list[i].top && scrollTop < list[i].bottom) {

					this.setData({
						verticalNavTop: (i - 1) * 50,
						tabCur: i
					})
					return false;
				}
			}
		},

		bindTabSelectTap: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			this.setData({
				tabCur: idx,
				mainCur: idx,
				verticalNavTop: (idx - 1) * 50
			})
		},

		bindShowMindTap: function (e) {
			this.setData({
				showMind: true,
				showTime: false
			});
		},

		bindShowTimeTap: function (e) {
			this.setData({
				showMind: false,
				showTime: true
			});
		}
	}
})