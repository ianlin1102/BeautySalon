const cacheHelper = require('../helper/cache_helper.js');
const pageHelper = require('../helper/page_helper.js');
const cloudHelper = require('../helper/cloud_helper.js');
const timeHelper = require('../helper/time_helper.js');
const PassortBiz = require('../biz/passport_biz.js');
const setting = require('../setting/setting.js');

module.exports = Behavior({
	data: {
		myTodayList: null,
		joinDisplayInfo: null
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) {
			if (setting.IS_SUB) wx.hideHomeButton();
		},

		_loadTodayList: async function () {
			const CACHE_KEY = 'MY_JOIN_LIST';
			const CACHE_TIME = 60 * 30; // 30分钟
			const CACHE_TIMESTAMP_KEY = 'MY_JOIN_LIST_TIMESTAMP';

			try {
				// 1. 先尝试从缓存读取并显示
				let cachedData = cacheHelper.get(CACHE_KEY);
				let cacheTimestamp = cacheHelper.get(CACHE_TIMESTAMP_KEY);
				let now = Date.now();

				// 如果有缓存,先处理并显示缓存内容
				if (cachedData && Array.isArray(cachedData)) {
					this._processTodayList(cachedData);

					// 如果缓存还在有效期内(30分钟),直接返回
					if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
						return;
					}
				} else if (cachedData && !Array.isArray(cachedData)) {
					// 缓存数据格式错误，清除缓存
					console.warn('缓存数据格式错误，清除缓存', cachedData);
					cacheHelper.remove(CACHE_KEY);
					cacheHelper.remove(CACHE_TIMESTAMP_KEY);
				}

				// 2. 从云端获取最新数据(缓存过期或无缓存时)
				let params = {
					search: '',
					sortType: '',
					sortVal: '',
					orderBy: {},
					page: 1,
					size: 100,
					isTotal: false
				}
				let opts = {
					title: 'bar'
				}
				await cloudHelper.callCloudSumbit('my/my_join_list', params, opts).then(res => {
					let allJoins = res.data.list || [];

					// 3. 对比数据是否有变化
					let hasChanged = false;
					if (!cachedData || cachedData.length !== allJoins.length) {
						hasChanged = true;
					} else {
						// 简单对比:检查ID列表是否一致
						let cachedIds = cachedData.map(item => item._id).sort().join(',');
						let newIds = allJoins.map(item => item._id).sort().join(',');
						if (cachedIds !== newIds) {
							hasChanged = true;
						}
					}

					// 4. 如果数据有变化,更新界面和缓存
					if (hasChanged || !cachedData) {
						this._processTodayList(allJoins);

						if (allJoins.length > 0) {
							cacheHelper.set(CACHE_KEY, allJoins, CACHE_TIME);
							cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
						}
					} else {
						// 数据没变化,只更新时间戳
						cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
					}
				});
			} catch (err) {
				console.log(err);
				// 如果有缓存,继续使用缓存
				if (!this.data.joinDisplayInfo) {
					this.setData({
						joinDisplayInfo: '暂无预约'
					});
				}
			}
		},

		// 抽取处理预约列表的逻辑为独立方法
		_processTodayList: function(allJoins) {
			// 数据类型检查：确保 allJoins 是数组
			if (!Array.isArray(allJoins)) {
				console.error('_processTodayList: allJoins 不是数组', allJoins);
				this.setData({
					todayJoinCnt: 0,
					joinDisplayInfo: '暂无预约'
				});
				return;
			}

			let now = new Date();
			let nowDateStr = timeHelper.time('Y-M-D');
			let nowTimeStr = timeHelper.time('Y-M-D h:m');

			// 过滤出未过期的预约（状态为成功且时间未过期）
			let futureJoins = allJoins.filter(join => {
				if (join.JOIN_STATUS !== 1) return false; // 只看成功的预约
				if (!join.JOIN_MEET_DAY || !join.JOIN_MEET_TIME_END) return false; // 检查必要字段

				try {
					let joinDateTime = join.JOIN_MEET_DAY + ' ' + join.JOIN_MEET_TIME_END;
					return joinDateTime > nowTimeStr;
				} catch (e) {
					console.error('时间比较错误:', e, join);
					return false;
				}
			});

			// 按日期排序，最近的在前
			futureJoins.sort((a, b) => {
				let dateTimeA = a.JOIN_MEET_DAY + ' ' + a.JOIN_MEET_TIME_START;
				let dateTimeB = b.JOIN_MEET_DAY + ' ' + b.JOIN_MEET_TIME_START;
				return dateTimeA.localeCompare(dateTimeB);
			});

			// 构造显示信息
			let joinDisplayInfo = '';
			if (futureJoins.length === 0) {
				joinDisplayInfo = '暂无预约';
			} else if (futureJoins.length === 1) {
				let join = futureJoins[0];
				let dayName = this._getDayName(join.JOIN_MEET_DAY);
				let title = join.JOIN_MEET_TITLE || '未知项目';
				joinDisplayInfo = `${dayName}有预约：${title}`;
			} else {
				let nextJoin = futureJoins[0];
				let dayName = this._getDayName(nextJoin.JOIN_MEET_DAY);
				let title = nextJoin.JOIN_MEET_TITLE || '未知项目';
				joinDisplayInfo = `未来有${futureJoins.length}个预约，最近：${dayName} ${title}`;
			}

			this.setData({
				myTodayList: futureJoins.filter(join => join.JOIN_MEET_DAY === nowDateStr), // 今天的预约
				myFutureJoins: futureJoins,
				joinDisplayInfo: joinDisplayInfo
			});
		},

		// 获取日期的友好显示名称
		_getDayName: function(dateStr) {
			if (!dateStr) return '未知日期';
			
			let today = timeHelper.time('Y-M-D');
			let tomorrow = timeHelper.time('Y-M-D', timeHelper.time() + 86400000);
			
			if (dateStr === today) {
				return '今天';
			} else if (dateStr === tomorrow) {
				return '明天';
			} else {
				try {
					// 转换为月-日格式
					let parts = dateStr.split('-');
					if (parts.length === 3) {
						let month = parseInt(parts[1]);
						let day = parseInt(parts[2]);
						if (isNaN(month) || isNaN(day)) {
							return dateStr; // 如果解析失败，返回原始字符串
						}
						return `${month}月${day}日`;
					} else {
						return dateStr; // 如果格式不正确，返回原始字符串
					}
				} catch (e) {
					console.error('日期解析错误:', e, dateStr);
					return dateStr;
				}
			}
		},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () {},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: async function () {
			await this._loadTodayList();
			this._loadUser();
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

		_loadUser: async function (e) {
			try {
				console.log('开始刷新用户信息...');
				let opts = {
					title: 'bar'
				}
				let user = await cloudHelper.callCloudData('passport/my_detail', {}, opts);
				
				if (user) {
					console.log('用户信息更新:', {
						name: user.USER_NAME,
						mobile: user.USER_MOBILE,
						city: user.USER_CITY
					});
				}
				
				// 设置用户数据，即使为空也要设置，这样页面可以正确显示注册提示
				this.setData({
					user: user || null
				});
				
				console.log('用户信息加载结果:', user ? `已登录 - ${user.USER_NAME}` : '未登录');
			} catch (err) {
				console.log('加载用户信息失败:', err);
				// 出错时也要设置为null，确保页面显示注册提示
				this.setData({
					user: null
				});
			}
		},

		/**
		 * 页面相关事件处理函数--监听用户下拉动作
		 */
		onPullDownRefresh: async function () {
			// 清除缓存，强制重新加载
			cacheHelper.remove('MY_JOIN_LIST');
			cacheHelper.remove('MY_JOIN_LIST_TIMESTAMP');

			await this._loadTodayList();
			await this._loadUser();
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
		onShareAppMessage: function () {},

		url: function (e) {
			pageHelper.url(e, this);
		},

		setTap: function (e, skin) {
			let itemList = ['清除缓存', '后台管理'];
			wx.showActionSheet({
				itemList,
				success: async res => {
					let idx = res.tapIndex;
					if (idx == 0) {
						cacheHelper.clear();
						pageHelper.showNoneToast('清除缓存成功');
					}

					if (idx == 1) {
						pageHelper.setSkin(skin);
						if (setting.IS_SUB) {
							PassortBiz.adminLogin('admin', '123456', this);
						} else {
							wx.reLaunch({
								url: '/pages/admin/index/login/admin_login',
							});
						}

					}

				},
				fail: function (res) {}
			})
		}
	}
})