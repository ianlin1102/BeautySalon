/**
 * 横向滚动日历组件 - 显示未来2个月
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
		},
		mode: { // 显示模式: 'day' 或 'week'
			type: String,
			value: 'week' // 默认按周模式
		}
	},

	data: {
		scrollDays: [], // 所有可滚动的日期（按天模式）
		scrollWeeks: [], // 所有可滚动的周（按周模式）
		currentMonth: '', // 当前月份显示
		todayFull: '', // 今天的完整日期
		selectedDayData: null, // 选中日期的完整信息
		calendarYear: 0, // 弹窗日历的年份
		calendarMonth: 0 // 弹窗日历的月份
	},

	lifetimes: {
		attached() {
			this._init();
		}
	},

	observers: {
		'hasDays': function(hasDays) {
			console.log('====== hasDays 变化 ======');
			console.log('hasDays:', hasDays);
			console.log('hasDays 长度:', hasDays ? hasDays.length : 0);

			// 当hasDays变化时，重新生成周数据（仅在week模式下）
			if (this.data.mode === 'week' && this.data.scrollWeeks.length > 0) {
				console.log('重新生成周数据，标记哪些周有预约');
				const scrollWeeks = this._generateFutureWeeks(2);
				this.setData({
					scrollWeeks
				});
				console.log('更新后的周数据:', scrollWeeks);
			}
		}
	},

	methods: {
		_init() {
			const today = new Date();
			const todayFull = this._formatDate(today);

			// 设置弹窗日历的年月
			const calendarYear = today.getFullYear();
			const calendarMonth = today.getMonth() + 1;

			if (this.data.mode === 'week') {
				// 按周模式
				const scrollWeeks = this._generateFutureWeeks(2);
				// 找到包含今天的周
				const currentWeek = scrollWeeks.find(week =>
					week.startDate <= todayFull && week.endDate >= todayFull
				);
				const selectedDay = currentWeek ? currentWeek.startDate : todayFull;

				this.setData({
					scrollWeeks,
					todayFull,
					selectedDayData: selectedDay,
					calendarYear,
					calendarMonth
				}, () => {
					// 滚动到当前周的位置 - 在setData完成后执行
					if (currentWeek) {
						this._scrollToWeek(currentWeek.range);
					}
				});
			} else {
				// 按天模式
				const selectedDay = this.data.selectedDay || todayFull;
				const scrollDays = this._generateFutureMonths(2);

				this.setData({
					scrollDays,
					todayFull,
					selectedDayData: selectedDay,
					calendarYear,
					calendarMonth
				});

				// 滚动到今天的位置
				this._scrollToDay(selectedDay);
			}
		},

		/**
		 * 生成未来N个月的所有日期
		 */
		_generateFutureMonths(monthCount) {
			const today = new Date();
			const todayTime = today.getTime();
			const todayFormatted = this._formatDate(today);
			const days = [];

			for (let monthOffset = 0; monthOffset < monthCount; monthOffset++) {
				const currentDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
				const year = currentDate.getFullYear();
				const month = currentDate.getMonth();

				// 获取该月的天数
				const daysInMonth = new Date(year, month + 1, 0).getDate();

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
		 * 生成未来N个月的所有周
		 */
		_generateFutureWeeks(monthCount) {
			const today = new Date();
			const todayFormatted = this._formatDate(today);
			const weeks = [];

			// 找到当前周的周一（作为开始）
			const currentDay = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
			const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // 周日需要回退6天
			let weekMonday = new Date(today);
			weekMonday.setDate(today.getDate() + daysToMonday);

			// 从本周周一开始，生成未来的周
			const endDate = new Date(today.getFullYear(), today.getMonth() + monthCount, 1);

			while (weekMonday < endDate) {
				const weekSunday = new Date(weekMonday);
				weekSunday.setDate(weekMonday.getDate() + 6); // 周日

				const startFormatted = this._formatDate(weekMonday);
				const endFormatted = this._formatDate(weekSunday);
				const range = `${startFormatted}~${endFormatted}`;

				// 判断这周是否包含今天
				const isCurrentWeek = startFormatted <= todayFormatted && endFormatted >= todayFormatted;

				// 获取月份信息
				const startMonth = weekMonday.getMonth() + 1;
				const endMonth = weekSunday.getMonth() + 1;
				const startDay = weekMonday.getDate();
				const endDay = weekSunday.getDate();

				// 判断这周是否跨月
				const isCrossMonth = startMonth !== endMonth;

				// 检查这周是否有预约数据
				let hasData = false;
				let matchedDays = []; // 记录这周哪些天有数据
				for (let d = new Date(weekMonday); d <= weekSunday; d.setDate(d.getDate() + 1)) {
					const dayStr = this._formatDate(d);
					if (this.data.hasDays && this.data.hasDays.includes(dayStr)) {
						hasData = true;
						matchedDays.push(dayStr);
					}
				}

				if (matchedDays.length > 0) {
					console.log(`周 ${range} 有数据，匹配的天:`, matchedDays);
				}

				weeks.push({
					range: range,
					startDate: startFormatted,
					endDate: endFormatted,
					startDay: startDay,
					endDay: endDay,
					startMonth: startMonth,
					endMonth: endMonth,
					isCrossMonth: isCrossMonth,
					isCurrentWeek: isCurrentWeek,
					hasData: hasData,
					// 周的显示格式: "1/6 - 1/12" 或 "1/30 - 2/5" (跨月)
					displayText: `${startMonth}/${startDay} - ${endMonth}/${endDay}`
				});

				// 下一周
				weekMonday.setDate(weekMonday.getDate() + 7);
			}

			console.log('生成的周数据:', weeks);
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
		 * 滚动到今天/本周
		 */
		bindTodayTap() {
			const today = this._formatDate(new Date());

			if (this.data.mode === 'week') {
				// 找到包含今天的周
				const currentWeek = this.data.scrollWeeks.find(week =>
					week.startDate <= today && week.endDate >= today
				);
				if (currentWeek) {
					this.setData({
						selectedDayData: currentWeek.startDate
					});
					this._scrollToWeek(currentWeek.range);

					// 触发父组件事件 - 传递整周的日期范围
					this.triggerEvent('click', {
						day: currentWeek.startDate,
						weekRange: currentWeek.range,
						startDate: currentWeek.startDate,
						endDate: currentWeek.endDate,
						isWeekMode: true
					});
				}
			} else {
				// 按天模式
				this.setData({
					selectedDayData: today
				});
				this._scrollToDay(today);

				// 触发父组件事件
				this.triggerEvent('click', {
					day: today
				});
			}
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
		 * 滚动到指定周
		 */
		_scrollToWeek(weekRange) {
			if (!weekRange) return;
			// 找到该周的索引
			const index = this.data.scrollWeeks.findIndex(item => item.range === weekRange);
			if (index > -1) {
				this.setData({
					scrollIntoView: `week-${index}`
				});
			}
		},

		/**
		 * 点击某一周
		 */
		bindWeekTap(e) {
			const weekData = e.currentTarget.dataset.item;
			const startDate = weekData.startDate;

			console.log('====== 点击周 ======');
			console.log('周数据:', weekData);
			console.log('周范围:', weekData.range);
			console.log('开始日期 (周一):', weekData.startDate);
			console.log('结束日期 (周日):', weekData.endDate);

			this.setData({
				selectedDayData: startDate
			});

			// 触发父组件事件 - 传递整周的日期范围
			this.triggerEvent('click', {
				day: startDate, // 用于显示选中状态
				weekRange: weekData.range,
				startDate: weekData.startDate,
				endDate: weekData.endDate,
				isWeekMode: true // 标识这是周模式
			});
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

			if (this.data.mode === 'week') {
				// 周模式：找到包含该日期的周
				const selectedWeek = this.data.scrollWeeks.find(week =>
					week.startDate <= day && week.endDate >= day
				);

				if (selectedWeek) {
					this.setData({
						selectedDayData: selectedWeek.startDate, // 设置为周一的日期
						showCalendar: false,
						calendarYear,
						calendarMonth
					});
					this._scrollToWeek(selectedWeek.range);

					// 触发父组件事件 - 传递整周的信息
					this.triggerEvent('click', {
						day: selectedWeek.startDate,
						weekRange: selectedWeek.range,
						startDate: selectedWeek.startDate,
						endDate: selectedWeek.endDate,
						isWeekMode: true
					});
				}
			} else {
				// 天模式：直接选中该天
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
	}
})
