const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const timeHelper = require('../helper/time_helper.js');
const cacheHelper = require('../helper/cache_helper.js');
const setting = require('../setting/setting.js');

// ========== 配置选项 ==========
// true  = 使用后端一次性查询整周（快速，需要重启云函数使修改生效）
// false = 使用前端循环查询每天然后合并（稳定，但需要7次API调用）
const USE_BACKEND_WEEK_QUERY = true;
// ================================

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		list: [],

		day: '',
		hasDays: [],
		selectedDate: '', // 当前选中的日期（用于高亮匹配的卡片）
		selectedStartDate: '', // 选中周的开始日期
		selectedEndDate: '', // 选中周的结束日期

		// 课程信息弹窗
		showCourseInfoModal: false,
		courseInfoTitle: '',
		courseInfoContent: ''
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) {
			if (setting.IS_SUB) wx.hideHomeButton();
		},

		/**
		 * 加载整周的数据（周一到周日）
		 */
		_loadWeekData: async function (startDate, endDate) {
			console.log('====== _loadWeekData 开始 ======');
			console.log('查询周范围:', startDate, '到', endDate);
			console.log('查询方式:', USE_BACKEND_WEEK_QUERY ? '后端一次性查询' : '前端循环查询');

			const CACHE_KEY_PREFIX = 'MEET_LIST_WEEK_';
			const CACHE_TIME = 60 * 30; // 30分钟
			const CACHE_TIMESTAMP_KEY_PREFIX = 'MEET_LIST_WEEK_TIMESTAMP_';

			let cacheKey = CACHE_KEY_PREFIX + startDate + '_' + endDate;
			let timestampKey = CACHE_TIMESTAMP_KEY_PREFIX + startDate + '_' + endDate;

			try {
				// 1. 先尝试从缓存读取
				let cachedData = cacheHelper.get(cacheKey);
				let cacheTimestamp = cacheHelper.get(timestampKey);
				let now = Date.now();

				if (cachedData) {
					this.setData({
						list: cachedData,
						isLoad: true
					});

					if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
						console.log('使用缓存的周数据');
						return;
					}
				}

				this.setData({ list: null });

				// ========== 方案选择 ==========
				let weekMeetList = [];

				if (USE_BACKEND_WEEK_QUERY) {
					// 方案A: 后端一次性查询整周
					weekMeetList = await this._loadWeekDataFromBackend(startDate, endDate);
				} else {
					// 方案B: 前端循环查询每天然后合并
					weekMeetList = await this._loadWeekDataFromFrontend(startDate, endDate);
				}

				console.log('====== 最终周数据 ======');
				console.log('预约项目数:', weekMeetList.length);

				// 更新界面和缓存
				this.setData({
					list: weekMeetList,
					isLoad: true
				});

				if (weekMeetList.length > 0) {
					cacheHelper.set(cacheKey, weekMeetList, CACHE_TIME);
					cacheHelper.set(timestampKey, now, CACHE_TIME);
				}

			} catch (err) {
				console.error('加载周数据失败:', err);
				this.setData({
					list: [],
					isLoad: true
				});
			}
		},

		/**
		 * 方案A: 使用后端API一次性查询整周数据（快速）
		 */
		_loadWeekDataFromBackend: async function(startDate, endDate) {
			console.log('【后端查询】调用 meet/list_by_week API');

			let params = {
				startDate: startDate,
				endDate: endDate
			};
			let opts = { title: 'bar' };

			let res = await cloudHelper.callCloudSumbit('meet/list_by_week', params, opts);
			let weekData = res.data || [];

			console.log('【后端查询】返回', weekData.length, '个预约项目');

			// 展开数据：将每个预约的多个时间段展开成独立卡片
			let weekMeetList = [];
			for (let meet of weekData) {
				if (meet.times && meet.times.length > 0) {
					for (let time of meet.times) {
						// 使用时间段中的day字段，如果没有则从daysWithData推断
						let day = time.day || meet.daysWithData[0];

						// 格式化日期显示（避免时区问题）
						let dateParts = day.split('-');
						let month = parseInt(dateParts[1]);
						let dayNum = parseInt(dateParts[2]);
						let dateObj = new Date(parseInt(dateParts[0]), month - 1, dayNum);
						let weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
						let weekDay = weekDays[dateObj.getDay()];

						// 调试：检查课程信息
						if (meet.courseInfo) {
							console.log('【课程信息】发现课程信息:', meet.title, meet.courseInfo);
						}
						weekMeetList.push({
							_id: `${meet._id}_${day}_${time.start}`,
							meetId: meet._id,
							title: meet.title,
							pic: meet.pic,
							day: day,
							dayText: `${month}月${dayNum}日`,
							weekDay: weekDay,
							time: time,
							timeStart: time.start,
							timeEnd: time.end,
							duration: time.duration || '90分钟',
							// 分类信息
							typeId: meet.typeId || '',
							typeName: meet.typeName || '',
							// 导师信息
							instructorId: meet.instructorId || "",
							instructorName: meet.instructorName || "尚未决定",
							instructorAvatar: meet.instructorPic || meet.pic,
							// 课程信息
							courseInfo: meet.courseInfo || '',
							// 预约人数信息
							bookedCount: time.cnt || 0,
							maxCount: time.limit || 20,
							// 其他信息
							tag: meet.tag || '',
							type: meet.type || 'Group Class'
						});
					}
				}
			}

			console.log('【后端查询】展开后卡片数:', weekMeetList.length);
			return weekMeetList;
		},

		/**
		 * 方案B: 前端循环查询每天，然后合并（稳定）
		 */
		_loadWeekDataFromFrontend: async function(startDate, endDate) {
			console.log('【前端合并】开始循环查询每一天');

			// 2. 生成这周的每一天日期数组
			let days = [];
			// 手动解析日期以避免时区问题
			let startParts = startDate.split('-');
			let endParts = endDate.split('-');
			let currentDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
			let endDateObj = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));

			while (currentDate <= endDateObj) {
				let year = currentDate.getFullYear();
				let month = String(currentDate.getMonth() + 1).padStart(2, '0');
				let day = String(currentDate.getDate()).padStart(2, '0');
				let dayStr = `${year}-${month}-${day}`;
				days.push(dayStr);
				currentDate.setDate(currentDate.getDate() + 1);
			}

			console.log('【前端合并】需要查询的天数:', days.length, '天');
			console.log('【前端合并】日期列表:', days);

			// 3. 对每一天分别查询
			let allDayResults = []; // 存储所有天的结果
			for (let i = 0; i < days.length; i++) {
				let day = days[i];
				console.log(`【前端合并】查询第 ${i + 1} 天: ${day}`);

				let params = { day: day };
				let opts = { title: 'bar' };

				try {
					let res = await cloudHelper.callCloudSumbit('meet/list_by_day', params, opts);
					let dayData = res.data || [];
					console.log(`【前端合并】${day} 返回 ${dayData.length} 条预约`);

					// 为每条数据添加日期标记
					dayData.forEach(item => {
						item.fromDay = day;
					});

					allDayResults.push({
						day: day,
						data: dayData
					});
				} catch (err) {
					console.error(`【前端合并】查询 ${day} 失败:`, err);
				}
			}

			console.log('【前端合并】所有天查询完成，查询了', allDayResults.length, '天');

			// 4. 展开数据：每个时间段独立成为一条卡片数据
			let weekMeetList = [];

			for (let j = 0; j < allDayResults.length; j++) {
				let dayResult = allDayResults[j];
				let day = dayResult.day;
				let dayData = dayResult.data;

				for (let k = 0; k < dayData.length; k++) {
					let meet = dayData[k];

					// 为每个时间段创建独立的卡片数据
					if (meet.times && meet.times.length > 0) {
						for (let t = 0; t < meet.times.length; t++) {
							let time = meet.times[t];

							// 格式化日期显示（避免时区问题）
							let dateParts = day.split('-');
							let month = parseInt(dateParts[1]);
							let dayNum = parseInt(dateParts[2]);
							let dateObj = new Date(parseInt(dateParts[0]), month - 1, dayNum);
							let weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
							let weekDay = weekDays[dateObj.getDay()];

							weekMeetList.push({
								_id: `${meet._id}_${day}_${time.start}`, // 唯一ID
								meetId: meet._id, // 原始预约项目ID
								title: meet.title,
								pic: meet.pic,
								day: day,
								dayText: `${month}月${dayNum}日`,
								weekDay: weekDay,
								time: time,
								timeStart: time.start,
								timeEnd: time.end,
								duration: time.duration || '90分钟',
								// 分类信息
								typeId: meet.typeId || '',
								typeName: meet.typeName || '',
								// 导师信息
								instructorId: meet.instructorId || "",
								instructorName: meet.instructorName || "尚未决定",
								instructorAvatar: meet.instructorPic || meet.pic,
								// 课程信息
								courseInfo: meet.courseInfo || '',
								// 预约人数信息
								bookedCount: time.cnt || 0,
								maxCount: time.limit || 20,
								// 其他信息
								tag: meet.tag || '',
								type: meet.type || 'Group Class'
							});
						}
					}
				}
			}

			console.log('【前端展开】展开完成，卡片数:', weekMeetList.length);

			return weekMeetList;
		},

		_loadList: async function () {
			const CACHE_KEY_PREFIX = 'MEET_LIST_';
			const CACHE_TIME = 60 * 30; // 30分钟
			const CACHE_TIMESTAMP_KEY_PREFIX = 'MEET_LIST_TIMESTAMP_';

			let day = this.data.day;
			let cacheKey = CACHE_KEY_PREFIX + day; // 按日期缓存
			let timestampKey = CACHE_TIMESTAMP_KEY_PREFIX + day;

			console.log('====== _loadList 开始 ======');
			console.log('查询日期 day:', day);

			try {
				// 1. 先尝试从缓存读取并显示
				let cachedData = cacheHelper.get(cacheKey);
				let cacheTimestamp = cacheHelper.get(timestampKey);
				let now = Date.now();

				// 如果有缓存,先显示缓存内容(避免白屏)
				if (cachedData) {
					this.setData({
						list: cachedData,
						isLoad: true
					});

					// 如果缓存还在有效期内(30分钟),直接返回
					if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
						console.log('使用缓存数据');
						return;
					}
				}

				// 2. 从云端获取最新数据(缓存过期或无缓存时)
				let params = {
					day: day
				}
				let opts = {
					title: this.data.isLoad ? 'bar' : 'bar'
				}

				if (!cachedData) {
					this.setData({ list: null });
				}

				console.log('调用云函数 meet/list_by_day，参数:', params);

				await cloudHelper.callCloudSumbit('meet/list_by_day', params, opts).then(res => {
					console.log('====== 云函数返回结果 ======');
					console.log('返回的数据:', res.data);
					console.log('数据长度:', res.data ? res.data.length : 0);

					let list = res.data || [];

					// 3. 对比数据是否有变化
					let hasChanged = false;
					if (!cachedData || cachedData.length !== list.length) {
						hasChanged = true;
					} else {
						// 简单对比:检查ID列表是否一致
						let cachedIds = cachedData.map(item => item._id).sort().join(',');
						let newIds = list.map(item => item._id).sort().join(',');
						if (cachedIds !== newIds) {
							hasChanged = true;
						}
					}

					// 4. 如果数据有变化,更新界面和缓存
					if (hasChanged || !cachedData) {
						console.log('更新界面，显示', list.length, '条预约');
						this.setData({
							list: list,
							isLoad: true
						});

						if (list.length > 0) {
							cacheHelper.set(cacheKey, list, CACHE_TIME);
							cacheHelper.set(timestampKey, now, CACHE_TIME);
						}
					} else {
						// 数据没变化,只更新时间戳
						cacheHelper.set(timestampKey, now, CACHE_TIME);
					}
				});
			} catch (err) {
				console.error('加载预约列表失败:', err);
				// 如果有缓存,继续使用缓存;否则设置空数组
				if (!this.data.list) {
					this.setData({
						list: [],
						isLoad: true
					});
				}
			}
		},

		_loadHasList: async function () {
			console.log('====== _loadHasList 开始（获取有预约的天列表）======');

			const CACHE_KEY = 'MEET_HAS_DAYS';
			const CACHE_TIME = 60 * 30; // 30分钟
			const CACHE_TIMESTAMP_KEY = 'MEET_HAS_DAYS_TIMESTAMP';

			try {
				// 1. 先尝试从缓存读取并显示
				let cachedData = cacheHelper.get(CACHE_KEY);
				let cacheTimestamp = cacheHelper.get(CACHE_TIMESTAMP_KEY);
				let now = Date.now();

				// 如果有缓存,先显示缓存内容
				if (cachedData) {
					this.setData({
						hasDays: cachedData
					});

					// 如果缓存还在有效期内(30分钟),直接返回
					if (cacheTimestamp && (now - cacheTimestamp < CACHE_TIME * 1000)) {
						console.log('使用缓存的hasDays数据:', cachedData.length, '天');
						return;
					}
				}

				// 2. 从云端获取最新数据(缓存过期或无缓存时)
				let params = {
					day: timeHelper.time('Y-M-D')
				}
				let opts = {
					title: 'bar'
				}

				console.log('调用 meet/list_has_day 获取有预约的天');

				await cloudHelper.callCloudSumbit('meet/list_has_day', params, opts).then(res => {
					let hasDays = res.data || [];

					console.log('获取到有预约的天:', hasDays.length, '天');
					console.log('详细数据:', hasDays);

					// 3. 对比数据是否有变化
					let hasChanged = false;
					if (!cachedData || cachedData.length !== hasDays.length) {
						hasChanged = true;
					} else {
						// 简单对比:检查日期列表是否一致
						let cachedDays = cachedData.sort().join(',');
						let newDays = hasDays.sort().join(',');
						if (cachedDays !== newDays) {
							hasChanged = true;
						}
					}

					// 4. 如果数据有变化,更新界面和缓存
					if (hasChanged || !cachedData) {
						this.setData({
							hasDays: hasDays
						});

						if (hasDays.length > 0) {
							cacheHelper.set(CACHE_KEY, hasDays, CACHE_TIME);
							cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
						}
					} else {
						// 数据没变化,只更新时间戳
						cacheHelper.set(CACHE_TIMESTAMP_KEY, now, CACHE_TIME);
					}
				});
			} catch (err) {
				console.error('加载可预约日期失败:', err);
				// 如果有缓存,继续使用缓存;否则设置空数组
				if (!this.data.hasDays || this.data.hasDays.length === 0) {
					this.setData({
						hasDays: []
					});
				}
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
		onShow: async function () {
			// 计算当前周的周一和周日
			const today = new Date();
			const currentDay = today.getDay();
			const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
			const weekMonday = new Date(today);
			weekMonday.setDate(today.getDate() + daysToMonday);
			const weekSunday = new Date(weekMonday);
			weekSunday.setDate(weekMonday.getDate() + 6);

			// 手动格式化日期
			const startDate = `${weekMonday.getFullYear()}-${String(weekMonday.getMonth() + 1).padStart(2, '0')}-${String(weekMonday.getDate()).padStart(2, '0')}`;
			const endDate = `${weekSunday.getFullYear()}-${String(weekSunday.getMonth() + 1).padStart(2, '0')}-${String(weekSunday.getDate()).padStart(2, '0')}`;

			console.log('====== onShow 初始化 ======');
			console.log('本周范围:', startDate, '到', endDate);

			this.setData({
				day: startDate, // 设置为周一
				selectedDate: startDate,
				selectedStartDate: startDate,
				selectedEndDate: endDate
			});

			await this._loadHasList();
			// 加载本周的数据
			await this._loadWeekData(startDate, endDate);
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
			// 清除缓存，强制重新加载
			cacheHelper.remove('MEET_HAS_DAYS');
			cacheHelper.remove('MEET_HAS_DAYS_TIMESTAMP');

			// 清除周缓存
			let startDate = this.data.selectedStartDate;
			let endDate = this.data.selectedEndDate;
			if (startDate && endDate) {
				let weekCacheKey = 'MEET_LIST_WEEK_' + startDate + '_' + endDate;
				let weekTimestampKey = 'MEET_LIST_WEEK_TIMESTAMP_' + startDate + '_' + endDate;
				cacheHelper.remove(weekCacheKey);
				cacheHelper.remove(weekTimestampKey);
			}

			// 清除单天缓存（兼容旧逻辑）
			let currentDay = this.data.day;
			if (currentDay) {
				cacheHelper.remove('MEET_LIST_' + currentDay);
				cacheHelper.remove('MEET_LIST_TIMESTAMP_' + currentDay);
			}

			await this._loadHasList();

			// 根据是否有周范围来决定调用哪个加载函数
			if (startDate && endDate) {
				await this._loadWeekData(startDate, endDate);
			} else {
				await this._loadList();
			}

			wx.stopPullDownRefresh();
		},

		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},

		bindClickCmpt: async function (e) {
			console.log('====== 点击日历组件 ======');
			console.log('事件详情:', e.detail);

			if (e.detail.isWeekMode) {
				// 周模式 - 加载整周的数据
				console.log('周模式 - 加载整周数据');
				console.log('周范围:', e.detail.weekRange);
				console.log('开始日期:', e.detail.startDate);
				console.log('结束日期:', e.detail.endDate);

				this.setData({
					day: e.detail.day, // 用于显示选中状态
					selectedDate: e.detail.day, // 存储选中的日期
					selectedStartDate: e.detail.startDate, // 存储选中周的开始日期
					selectedEndDate: e.detail.endDate // 存储选中周的结束日期
				});

				await this._loadWeekData(e.detail.startDate, e.detail.endDate);
			} else {
				// 天模式 - 只加载单天数据
				console.log('天模式 - 加载单天数据');
				let day = e.detail.day;
				this.setData({
					day,
					selectedDate: day, // 存储选中的日期
					selectedStartDate: day,
					selectedEndDate: day
				}, async () => {
					await this._loadList();
				});
			}
		},

		bindMonthChangeCmpt: function (e) {
			console.log(e.detail)
		},

		url: async function (e) {
			pageHelper.url(e, this);
		},

		// 显示课程信息弹窗
		bindShowCourseInfo: function (e) {
			let info = e.currentTarget.dataset.info || '';
			let title = e.currentTarget.dataset.title || '课程信息';
			this.setData({
				showCourseInfoModal: true,
				courseInfoTitle: title,
				courseInfoContent: info
			});
		},

		// 关闭课程信息弹窗
		bindCloseCourseInfo: function () {
			this.setData({
				showCourseInfoModal: false,
				courseInfoTitle: '',
				courseInfoContent: ''
			});
		},

		// 阻止弹窗内容区域点击关闭
		preventClose: function () {
			// 空函数，用于阻止事件冒泡
		},
	}
})
