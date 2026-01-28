const pageHelper = require('../helper/page_helper.js');
const cloudHelper = require('../helper/cloud_helper.js');
const validate = require('../helper/validate.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		// 国家代码选择
		countryCodeIndex: 0,  // 默认选中第一个（美国）
		countryCodes: [
			{ code: '+1', label: '+1 (美国)', minLen: 10, maxLen: 10 },
			{ code: '+86', label: '+86 (中国)', minLen: 11, maxLen: 11 }
		]
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) {
			await this._loadDetail();
		},

		_loadDetail: async function (e) {

			let opts = {
				title: 'bar'
			}
			let user = await cloudHelper.callCloudData('passport/my_detail', {}, opts);
			if (!user) {
				this.setData({
					isLoad: true,
					formName: '',
					formMobile: '',
					formCity: '',
					formWork: '',
					formTrade: ''
				});
				wx.setNavigationBarTitle({
					title: '注册'
				});
				return;
			};

			// 解析手机号：分离国家代码和号码
			let mobile = user.USER_MOBILE || '';
			let countryCodeIndex = 0; // 默认美国 +1

			if (mobile.startsWith('+86')) {
				countryCodeIndex = 1; // 中国
				mobile = mobile.substring(3); // 去掉 +86
			} else if (mobile.startsWith('+1')) {
				countryCodeIndex = 0; // 美国
				mobile = mobile.substring(2); // 去掉 +1
			}
			// 如果号码不以+开头，保持原样（可能是纯数字）

			this.setData({
				isLoad: true,
				formName: user.USER_NAME,
				formMobile: mobile,
				formTrade: user.USER_TRADE,
				formWork: user.USER_WORK,
				formCity: user.USER_CITY,
				countryCodeIndex: countryCodeIndex
			})
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

		// 选择国家代码
		onCountryCodeChange: function (e) {
			this.setData({
				countryCodeIndex: parseInt(e.detail.value)
			});
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

		bindGetPhoneNumber: async function (e) {
			if (e.detail.errMsg == "getPhoneNumber:ok") {

				let cloudID = e.detail.cloudID;
				let params = {
					cloudID
				};
				let opt = {
					title: '手机验证中'
				};
				await cloudHelper.callCloudSumbit('passport/phone', params, opt).then(res => {
					let phone = res.data;
					if (!phone || phone.length < 11)
						wx.showToast({
							title: '手机号码获取失败，请重新绑定手机号码',
							icon: 'none',
							duration: 4000
						});
					else {
						let idx = pageHelper.dataset(e, 'idx');
						this._setForm(idx, phone);
					}
				});
			} else
				wx.showToast({
					title: '手机号码获取失败，请重新绑定手机号码',
					icon: 'none'
				});
		},
		bindGetPhoneNumber: async function (e) {
			if (e.detail.errMsg == "getPhoneNumber:ok") {

				let cloudID = e.detail.cloudID;
				let params = {
					cloudID
				};
				let opt = {
					title: '手机验证中'
				};
				await cloudHelper.callCloudSumbit('passport/phone', params, opt).then(res => {
					let phone = res.data;
					if (!phone || phone.length < 11)
						wx.showToast({
							title: '手机号码获取失败，请重新填写手机号码',
							icon: 'none',
							duration: 2000
						});
					else {
						this.setData({
							formMobile: phone
						});
					}
				});
			} else
				wx.showToast({
					title: '手机号码获取失败，请重新填写手机号码',
					icon: 'none'
				});
		},


		bindSubmitTap: async function (e) {
			try {
				let data = this.data;
				let mobile = data.formMobile;

				// 获取当前选中的国家代码配置
				let countryConfig = data.countryCodes[data.countryCodeIndex];
				let countryCode = countryConfig.code;
				let minLen = countryConfig.minLen;
				let maxLen = countryConfig.maxLen;

				// 验证手机号长度
				if (mobile.length < minLen || mobile.length > maxLen) {
					return pageHelper.showModal(`请填写正确的手机号码（${countryCode} 需要 ${minLen} 位）`);
				}

				let CHECK_FORM = {
					name: 'formName|must|string|min:1|max:20|name=姓名',
					mobile: `formMobile|must|min:${minLen}|max:${maxLen}|name=手机`,
					city: 'formCity|string|max:100|name=所在城市',
					work: 'formWork|string|max:100|name=所在单位',
					trade: 'formTrade|string|max:100|name=行业领域',
				};
				// 数据校验
				data = validate.check(data, CHECK_FORM, this);
				if (!data) return;

				// 添加国家代码到提交数据
				data.countryCode = countryCode;

				let opts = {
					title: '提交中'
				}
				await cloudHelper.callCloudSumbit('passport/edit_base', data, opts).then(res => {
					let callback = () => {
						// 获取页面栈，通知上一页刷新数据
						let pages = getCurrentPages();
						let prevPage = pages[pages.length - 2]; // 上一页
						
						if (prevPage) {
							// 如果上一页有刷新用户信息的方法，调用它
							if (prevPage._loadUser && typeof prevPage._loadUser === 'function') {
								console.log('通知上一页刷新用户信息');
								prevPage._loadUser();
							}
							// 如果上一页有刷新积分信息的方法，也调用它
							if (prevPage.getPointsInfo && typeof prevPage.getPointsInfo === 'function') {
								console.log('通知上一页刷新积分信息');
								prevPage.getPointsInfo();
							}
						}
						
						wx.navigateBack();
					}
					pageHelper.showSuccToast('提交成功', 1500, callback);
				});
			} catch (err) {
				console.error(err);
			}
		}
	}
})