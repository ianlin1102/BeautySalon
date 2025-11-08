const timeHelper = require('../../../../helper/time_helper.js');
const calendarLib = require('../calendar_lib.js');

Component({
	options: {
		addGlobalClass: true
	},

	properties: {
		hasDays: {
			type: Array,
			value: [],
		}
	},

	data: {
		currentMonth: '',
		weekDays: [],
		selectedDay: '',
		showCalendar: false,
		// 传递给完整日历的数据
		year: 0,
		month: 0,
		oneDoDay: ''
	},

	lifetimes: {
		attached() {
			console.log('周日历组件加载');
			this._init();
		}
	},

	methods: {
		_init: function() {
			const today = timeHelper.time('Y-M-D');
			this.setData({
				selectedDay: today,
				oneDoDay: today
			});
			this._generateWeekDays(today);
			this._updateMonthDisplay(today);
		},

		// 生成一周的日期
		_generateWeekDays: function(centerDay) {
			const date = new Date(centerDay.replace(/-/g, '/'));
			const weekDays = [];
			const today = timeHelper.time('Y-M-D');

			// 生成前后3天，共7天
			for (let i = -3; i <= 3; i++) {
				const d = new Date(date);
				d.setDate(date.getDate() + i);

				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, '0');
				const day = String(d.getDate()).padStart(2, '0');
				const fullDay = `${y}-${m}-${day}`;

				weekDays.push({
					full: fullDay,
					day: d.getDate(),
					weekDay: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
					isToday: fullDay === today,
					isSelected: fullDay === centerDay
				});
			}

			this.setData({
				weekDays: weekDays
			});

			console.log('生成周日期', weekDays);
		},

		// 更新月份显示
		_updateMonthDisplay: function(day) {
			const date = new Date(day.replace(/-/g, '/'));
			const year = date.getFullYear();
			const month = date.getMonth() + 1;

			this.setData({
				currentMonth: `${year}年${month}月`,
				year: year,
				month: month
			});
		},

		// 点击日期
		bindDayTap: function(e) {
			const day = e.currentTarget.dataset.day;
			this.setData({
				selectedDay: day,
				oneDoDay: day
			});
			this._generateWeekDays(day);
			this._updateMonthDisplay(day);

			// 通知父组件
			this.triggerEvent('click', { day: day });
		},

		// 上一周
		bindPrevWeek: function() {
			const current = new Date(this.data.selectedDay.replace(/-/g, '/'));
			current.setDate(current.getDate() - 7);

			const y = current.getFullYear();
			const m = String(current.getMonth() + 1).padStart(2, '0');
			const d = String(current.getDate()).padStart(2, '0');
			const newDay = `${y}-${m}-${d}`;

			this.setData({
				selectedDay: newDay,
				oneDoDay: newDay
			});
			this._generateWeekDays(newDay);
			this._updateMonthDisplay(newDay);
			this.triggerEvent('click', { day: newDay });
		},

		// 下一周
		bindNextWeek: function() {
			const current = new Date(this.data.selectedDay.replace(/-/g, '/'));
			current.setDate(current.getDate() + 7);

			const y = current.getFullYear();
			const m = String(current.getMonth() + 1).padStart(2, '0');
			const d = String(current.getDate()).padStart(2, '0');
			const newDay = `${y}-${m}-${d}`;

			this.setData({
				selectedDay: newDay,
				oneDoDay: newDay
			});
			this._generateWeekDays(newDay);
			this._updateMonthDisplay(newDay);
			this.triggerEvent('click', { day: newDay });
		},

		// 回到今天
		bindTodayTap: function() {
			const today = timeHelper.time('Y-M-D');
			this.setData({
				selectedDay: today,
				oneDoDay: today
			});
			this._generateWeekDays(today);
			this._updateMonthDisplay(today);
			this.triggerEvent('click', { day: today });
		},

		// 切换日历显示
		bindToggleCalendar: function() {
			this.setData({
				showCalendar: !this.data.showCalendar
			});
		},

		// 完整日历选择日期
		bindFullCalendarClick: function(e) {
			const day = e.detail.day;
			this.setData({
				selectedDay: day,
				oneDoDay: day,
				showCalendar: false
			});
			this._generateWeekDays(day);
			this._updateMonthDisplay(day);
			this.triggerEvent('click', { day: day });
		},

		// 阻止冒泡
		stopPropagation: function() {}
	}
})
