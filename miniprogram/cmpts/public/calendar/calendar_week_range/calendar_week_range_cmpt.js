/**
 * 周范围滚动日历组件 - 按周显示未来3个月
 * 显示周一到周日的日期范围，而不是单独的天
 */
const timeHelper = require('../../../../helper/time_helper.js');

Component({
	options: {
		addGlobalClass: true
	},

	properties: {
		hasWeeks: { // 有数据的周范围数组 格式: ['2025-01-06~2025-01-12', ...]
			type: Array,
			value: []
		},
		selectedWeek: { // 选中的周范围
			type: String,
			value: ''
		}
	},

	data: {
		scrollWeeks: [], // 所有可滚动的周
		currentMonth: '', // 当前月份显示
		todayFull: '', // 今天的完整日期
		selectedWeekData: null, // 选中周的完整信息
		calendarYear: 0, // 弹窗日历的年份
		calendarMonth: 0 // 弹窗日历的月份
	},

	lifetimes: {
		attached() {
			this._init();
		}
	},

	observers: {
		'hasWeeks': function(hasWeeks) {
			// 当有数据的周发生变化时，可以在这里做处理
		}
	},

	methods: {
		_init() {
			const today = new Date();
			const todayFull = this._formatDate(today);

			// 生成未来3个月的周范围
			const scrollWeeks = this._generateFutureWeeks(3);

			// 找到包含今天的周，默认选中
			const currentWeek = scrollWeeks.find(week =>
				week.startDate <= todayFull && week.endDate >= todayFull
			);
			const selectedWeek = this.data.selectedWeek || (currentWeek ? currentWeek.range : scrollWeeks[0].range);

			// 设置弹窗日历的年月
			const calendarYear = today.getFullYear();
			const calendarMonth = today.getMonth() + 1;

			this.setData({
				scrollWeeks,
				todayFull,
				selectedWeekData: selectedWeek,
				calendarYear,
				calendarMonth
			});

			// 滚动到当前周的位置
			this._scrollToWeek(selectedWeek);
		},

		/**
		 * 生成未来N个月的所有周
		 */
		_generateFutureWeeks(monthCount) {
			const today = new Date();
			const todayFormatted = this._formatDate(today);
			const weeks = [];

			// 找到当前周的周一（0=周日，1=周一）
			const currentDay = today.getDay();
			const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // 周日需要回退6天
			const currentWeekMonday = new Date(today);
			currentWeekMonday.setDate(today.getDate() + daysToMonday);

			// 从本周开始，生成未来的周
			let weekStart = new Date(currentWeekMonday);
			const endDate = new Date(today.getFullYear(), today.getMonth() + monthCount, 1);

			while (weekStart < endDate) {
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 6); // 周日

				const startFormatted = this._formatDate(weekStart);
				const endFormatted = this._formatDate(weekEnd);
				const range = `${startFormatted}~${endFormatted}`;

				// 判断这周是否包含今天
				const isCurrentWeek = startFormatted <= todayFormatted && endFormatted >= todayFormatted;

				// 获取月份信息
				const startMonth = weekStart.getMonth() + 1;
				const endMonth = weekEnd.getMonth() + 1;
				const startYear = weekStart.getFullYear();
				const endYear = weekEnd.getFullYear();

				// 判断这周是否跨月
				const isCrossMonth = startMonth !== endMonth || startYear !== endYear;

				// 显示的月份文字
				let monthDisplay = '';
				if (isCrossMonth) {
					if (startYear !== endYear) {
						monthDisplay = `${startYear}年${startMonth}月-${endYear}年${endMonth}月`;
					} else {
						monthDisplay = `${startMonth}月-${endMonth}月`;
					}
				} else {
					monthDisplay = `${startMonth}月`;
				}

				weeks.push({
					range: range, // 2025-01-06~2025-01-12
					startDate: startFormatted,
					endDate: endFormatted,
					startDay: weekStart.getDate(),
					endDay: weekEnd.getDate(),
					startMonth: startMonth,
					endMonth: endMonth,
					startYear: startYear,
					endYear: endYear,
					isCrossMonth: isCrossMonth,
					isCurrentWeek: isCurrentWeek,
					monthDisplay: monthDisplay,
					// 周的显示格式: "1/6 - 1/12" 或 "1/30 - 2/5" (跨月)
					displayText: `${startMonth}/${weekStart.getDate()} - ${endMonth}/${weekEnd.getDate()}`
				});

				// 下一周
				weekStart.setDate(weekStart.getDate() + 7);
			}

			return weeks;
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
		 * 点击某一周
		 */
		bindWeekTap(e) {
			const weekRange = e.currentTarget.dataset.week;
			const weekData = e.currentTarget.dataset.item;

			this.setData({
				selectedWeekData: weekRange
			});

			// 触发父组件事件，传递周的开始和结束日期
			this.triggerEvent('click', {
				weekRange: weekRange,
				startDate: weekData.startDate,
				endDate: weekData.endDate
			});
		},

		/**
		 * 滚动到本周
		 */
		bindTodayTap() {
			const today = this._formatDate(new Date());
			// 找到包含今天的周
			const currentWeek = this.data.scrollWeeks.find(week =>
				week.startDate <= today && week.endDate >= today
			);

			if (currentWeek) {
				this.setData({
					selectedWeekData: currentWeek.range
				});
				this._scrollToWeek(currentWeek.range);

				// 触发父组件事件
				this.triggerEvent('click', {
					weekRange: currentWeek.range,
					startDate: currentWeek.startDate,
					endDate: currentWeek.endDate
				});
			}
		},

		/**
		 * 滚动到指定周
		 */
		_scrollToWeek(weekRange) {
			// 找到该周的索引
			const index = this.data.scrollWeeks.findIndex(item => item.range === weekRange);
			if (index > -1) {
				// 滚动到该位置（每个周项宽度约150rpx + gap 16rpx = 166rpx）
				this.setData({
					scrollIntoView: `week-${index}`
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
		 * 完整日历点击 - 选择某天后计算所属的周
		 */
		bindFullCalendarClick(e) {
			const day = e.detail.day;

			// 找到包含这一天的周
			const selectedWeek = this.data.scrollWeeks.find(week =>
				week.startDate <= day && week.endDate >= day
			);

			if (selectedWeek) {
				// 更新选中周对应的年月
				const dateParts = day.split('-');
				const calendarYear = parseInt(dateParts[0]);
				const calendarMonth = parseInt(dateParts[1]);

				this.setData({
					selectedWeekData: selectedWeek.range,
					showCalendar: false,
					calendarYear,
					calendarMonth
				});
				this._scrollToWeek(selectedWeek.range);

				// 触发父组件事件
				this.triggerEvent('click', {
					weekRange: selectedWeek.range,
					startDate: selectedWeek.startDate,
					endDate: selectedWeek.endDate
				});
			}
		}
	}
})
