const pageHelper = require('../helper/page_helper.js');
const cloudHelper = require('../helper/cloud_helper.js');
const timeHelper = require('../helper/time_helper.js');
const qrcodeLib = require('../lib/tools/qrcode_lib.js');
const MeetBiz = require('../biz/meet_biz.js');
const cancelHelper = require('../helper/cancel_helper.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		isShowHome: false,

		canCancel: true, // 是否允许取消
		cancelReason: '', // 不允许取消的原因
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: function (options) {
			if (!pageHelper.getOptions(this, options)) return;
			this._loadDetail();

			if (options && options.flag == 'home') {
				this.setData({
					isShowHome: true
				});
			}
		},

		_loadDetail: async function (e) {
			let id = this.data.id;
			if (!id) return;

			let params = {
				joinId: id
			}
			let opts = {
				title: 'bar'
			}
			try {
				let join = await cloudHelper.callCloudData('my/my_join_detail', params, opts);
				if (!join) {
					this.setData({
						isLoad: null
					})
					return;
				}

				let qrImageData = qrcodeLib.drawImg('meet=' + join.JOIN_CODE, {
					typeNumber: 1,
					errorCorrectLevel: 'L',
					size: 100
				});

				// 检查是否允许取消
				let canCancel = true;
				let cancelReason = '';

				// 只有状态为1(预约成功)或0(待审核)且未签到的情况下才可能取消
				if ((join.JOIN_STATUS == 1 || join.JOIN_STATUS == 0) && join.JOIN_IS_CHECKIN == 0) {
					let cancelSet = join.meet?.MEET_CANCEL_SET || {};
					let checkResult = cancelHelper.checkCanCancel(cancelSet, join.JOIN_MEET_DAY, join.JOIN_MEET_TIME_START);
					canCancel = checkResult.canCancel;
					cancelReason = checkResult.reason;
				}

				this.setData({
					isLoad: true,
					join,
					qrImageData,
					canCancel,
					cancelReason
				});
			} catch (err) {
				console.error(err);
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
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},

		bindCancelTap: async function (e) {
			// 检查是否允许取消
			if (!this.data.canCancel) {
				return pageHelper.showModal(this.data.cancelReason || '已超过取消时间限制');
			}

			let callback = async () => {
				try {
					let params = {
						joinId: this.data.id
					}
					let opts = {
						title: '取消中'
					}

					await cloudHelper.callCloudSumbit('my/my_join_cancel', params, opts).then(res => {
						let join = this.data.join;
						join.JOIN_STATUS = 10;
						this.setData({
							join
						});
						pageHelper.showNoneToast('已取消');
					});
				} catch (err) {
					console.log(err);
				}
			}

			pageHelper.showConfirm('确认取消该预约?', callback);
		},

		url: function (e) {
			pageHelper.url(e, this);
		},

		bindNoticeTap: function (e) {
			let callback = () => {
				pageHelper.showSuccToast('开启成功');
			}
			MeetBiz.subscribeMessageMeet(callback);
		},

		bindCalendarTap: function (e) {
			let join = this.data.join;
			let title = join.JOIN_MEET_TITLE;

			let startTime = timeHelper.time2Timestamp(join.JOIN_MEET_DAY + ' ' + join.JOIN_MEET_TIME_START + ':00') / 1000;
			let endTime = timeHelper.time2Timestamp(join.JOIN_MEET_DAY + ' ' + join.JOIN_MEET_TIME_END + ':00') / 1000;

			MeetBiz.addMeetPhoneCalendar(title, startTime, endTime);
		}
	},

})