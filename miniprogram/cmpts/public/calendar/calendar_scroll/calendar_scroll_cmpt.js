/**
 * 横向滚动日历组件 - 显示未来4个月
 */
const timeHelper = require('../../../../helper/time_helper.js');

Component({
	options: {
		addGlobalClass: true
	},

	properties: {
		hasDays: { // 有数据的日期数组
			type: Array,
			value: []
		},
		selectedDay: { // 选中的日期
			type: String,
			value: ''
		}
	},

	data: {
		scrollDays: [], // 所有可滚动的日期
		currentMonth: '', // 当前月份显示
		todayFull: '', // 今天的完整日期
		selectedDayData: null, // 选中日期的完整信息
		calendarYear: 0, // 弹窗日历的年份
		calendarMonth: 0 // 弹窗日历的月份
	},

	lifetimes: {
		attached() {
			console.log('🎯 calendar_scroll 组件 attached');
			this._init();
		}
	},

	observers: {
		'hasDays': function(hasDays) {
			console.log('👀 hasDays 数据变化:', hasDays, '长度:', hasDays ? hasDays.length : 0);
		}
	},

	methods: {
		_init() {
			console.log('🚀 calendar_scroll 组件 _init 开始');
			const today = new Date();
			const todayFull = this._formatDate(today);
			console.log('📆 today 对象:', today);
			console.log('📆 todayFull:', todayFull);

			// 默认选中今天
			const selectedDay = this.data.selectedDay || todayFull;

			// 生成未来4个月的日期
			const scrollDays = this._generateFutureMonths(4);

			console.log('📆 生成的 scrollDays 长度:', scrollDays.length);
			if (scrollDays.length > 0) {
				console.log('📆 第一个日期:', scrollDays[0]);
				console.log('📆 最后一个日期:', scrollDays[scrollDays.length - 1]);
			} else {
				console.error('❌ scrollDays 为空!');
			}
			console.log('📆 今天日期:', todayFull);
			console.log('📆 选中日期:', selectedDay);

			// 设置弹窗日历的年月
			const calendarYear = today.getFullYear();
			const calendarMonth = today.getMonth() + 1;

			this.setData({
				scrollDays,
				todayFull,
				selectedDayData: selectedDay,
				calendarYear,
				calendarMonth
			});

			// 滚动到今天的位置
			this._scrollToDay(selectedDay);
		},

		/**
		 * 生成未来N个月的所有日期
		 */
		_generateFutureMonths(monthCount) {
			console.log('📅 _generateFutureMonths 开始, monthCount:', monthCount);
			const today = new Date();
			const todayTime = today.getTime();
			const todayFormatted = this._formatDate(today);
			const days = [];

			console.log('📅 today:', today);
			console.log('📅 todayFormatted:', todayFormatted);

			for (let monthOffset = 0; monthOffset < monthCount; monthOffset++) {
				const currentDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
				const year = currentDate.getFullYear();
				const month = currentDate.getMonth();

				console.log(`📅 处理月份 ${monthOffset}: ${year}-${month + 1}`);

				// 获取该月的天数
				const daysInMonth = new Date(year, month + 1, 0).getDate();
				console.log(`📅 该月天数: ${daysInMonth}`);

				for (let day = 1; day <= daysInMonth; day++) {
					const date = new Date(year, month, day);
					const fullDay = this._formatDate(date);
					const weekDay = date.getDay(); // 0-6

					// 只添加今天及未来的日期
					if (fullDay >= todayFormatted) {
						// 计算距离今天的天数
						const daysDiff = Math.floor((date.getTime() - todayTime) / (1000 * 60 * 60 * 24));
						const showMonth = daysDiff > 14; // 超过两周显示月份

						days.push({
							full: fullDay,
							day: day,
							month: month + 1,
							year: year,
							weekDay: ['日', '一', '二', '三', '四', '五', '六'][weekDay],
							weekDayNum: weekDay,
							isToday: fullDay === this._formatDate(today),
							monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
							showMonth: showMonth, // 是否显示月份
							daysDiff: daysDiff // 距离今天的天数
						});
					}
				}
			}

			return days;
		},

		/**
		 * 格式化日期为 YYYY-MM-DD
		 */
		_formatDate(date) {
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, '0');
			const d = String(date.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		},

		/**
		 * 点击某一天
		 */
		bindDayTap(e) {
			const day = e.currentTarget.dataset.day;
			const dayData = e.currentTarget.dataset.item;

			// 检查是否已过期
			const now = this._formatDate(new Date());
			if (day < now) {
				wx.showToast({
					title: '已过期',
					icon: 'none',
					duration: 1000
				});
				return;
			}

			this.setData({
				selectedDayData: day
			});

			// 触发父组件事件
			this.triggerEvent('click', {
				day: day
			});
		},

		/**
		 * 滚动到今天
		 */
		bindTodayTap() {
			const today = this._formatDate(new Date());
			this.setData({
				selectedDayData: today
			});
			this._scrollToDay(today);

			// 触发父组件事件
			this.triggerEvent('click', {
				day: today
			});
		},

		/**
		 * 滚动到指定日期
		 */
		_scrollToDay(day) {
			// 找到该日期的索引
			const index = this.data.scrollDays.findIndex(item => item.full === day);
			if (index > -1) {
				// 滚动到该位置（每个日期项宽度约96rpx + gap 12rpx = 108rpx）
				const scrollLeft = Math.max(0, index * 108 - 200); // 稍微偏左一点让选中的更居中
				this.setData({
					scrollIntoView: `day-${index}`
				});
			}
		},

		/**
		 * 切换完整日历弹窗
		 */
		bindToggleCalendar() {
			this.setData({
				showCalendar: !this.data.showCalendar
			});
		},

		/**
		 * 完整日历点击
		 */
		bindFullCalendarClick(e) {
			const day = e.detail.day;

			// 更新选中日期对应的年月
			const dateParts = day.split('-');
			const calendarYear = parseInt(dateParts[0]);
			const calendarMonth = parseInt(dateParts[1]);

			this.setData({
				selectedDayData: day,
				showCalendar: false,
				calendarYear,
				calendarMonth
			});
			this._scrollToDay(day);

			// 触发父组件事件
			this.triggerEvent('click', {
				day: day
			});
		}
	}
})
