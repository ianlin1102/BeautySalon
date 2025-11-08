const timeHelper = require('../../../../helper/time_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Component({
	options: {
		addGlobalClass: true
	},
	properties: {
		hasDays: { // 有数据的日期
			type: Array,
			value: [],
		},
		selectedDay: { // 选中的日期
			type: String,
			value: '',
			observer: function(newVal, oldVal) {
				if (newVal && newVal !== oldVal) {
					this._generateWeekDays();
				}
			}
		}
	},

	data: {
		weekDays: [], // 本周日期数组
		showFullCalendar: false, // 是否展开完整日历
		currentMonth: '',
		currentYear: 0,
		currentMonthNum: 0,
	},

	lifetimes: {
		attached() {
			console.log('横向日历组件已加载');
			this._init();
		},
		ready() {
			console.log('横向日历组件准备完成', {
				selectedDay: this.data.selectedDay,
				hasDays: this.data.hasDays,
				weekDays: this.data.weekDays
			});
		}
	},

	methods: {
		// 格式化日期为 YYYY-MM-DD
		_formatDate: function(date) {
			const year = date.getFullYear();
			const month = (date.getMonth() + 1).toString().padStart(2, '0');
			const day = date.getDate().toString().padStart(2, '0');
			return `${year}-${month}-${day}`;
		},

		_init: function () {
			const today = new Date();
			const year = today.getFullYear();
			const month = today.getMonth() + 1;

			this.setData({
				currentYear: year,
				currentMonthNum: month,
				currentMonth: `${year}年${month}月`
			});

			this._generateWeekDays();
		},

		// 生成一周的日期
		_generateWeekDays: function () {
			const selectedDay = this.data.selectedDay || timeHelper.time('Y-M-D');
			const selectedDate = new Date(selectedDay.replace(/-/g, '/'));

			console.log('生成一周日期', {
				selectedDay,
				selectedDate
			});

			const weekDays = [];
			const today = timeHelper.time('Y-M-D');

			// 更新月份显示
			const year = selectedDate.getFullYear();
			const month = selectedDate.getMonth() + 1;

			// 生成前后各3天，共7天
			for (let i = -3; i <= 3; i++) {
				const date = new Date(selectedDate);
				date.setDate(selectedDate.getDate() + i);

				const fullDay = this._formatDate(date);
				const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];

				weekDays.push({
					full: fullDay,
					day: date.getDate(),
					weekDay: weekDay,
					isToday: fullDay === today,
					isSelected: fullDay === selectedDay
				});
			}

			console.log('生成的weekDays', weekDays);

			this.setData({
				weekDays: weekDays,
				currentYear: year,
				currentMonthNum: month,
				currentMonth: `${year}年${month}月`
			});
		},

		// 选择日期
		bindDayTap: function (e) {
			const day = e.currentTarget.dataset.day;

			this.setData({
				selectedDay: day
			}, () => {
				this._generateWeekDays();
				this.triggerEvent('click', { day: day });
			});
		},

		// 切换日历显示模式
		bindToggleCalendar: function () {
			this.setData({
				showFullCalendar: !this.data.showFullCalendar
			});
		},

		// 上一周
		bindPrevWeek: function () {
			const currentDayStr = this.data.selectedDay || timeHelper.time('Y-M-D');
			const currentDay = new Date(currentDayStr.replace(/-/g, '/'));
			currentDay.setDate(currentDay.getDate() - 7);

			const newDay = this._formatDate(currentDay);

			this.setData({
				selectedDay: newDay
			}, () => {
				this._generateWeekDays();
				this.triggerEvent('click', { day: newDay });
			});
		},

		// 下一周
		bindNextWeek: function () {
			const currentDayStr = this.data.selectedDay || timeHelper.time('Y-M-D');
			const currentDay = new Date(currentDayStr.replace(/-/g, '/'));
			currentDay.setDate(currentDay.getDate() + 7);

			const newDay = this._formatDate(currentDay);

			this.setData({
				selectedDay: newDay
			}, () => {
				this._generateWeekDays();
				this.triggerEvent('click', { day: newDay });
			});
		},

		// 回到今天
		bindTodayTap: function () {
			const today = timeHelper.time('Y-M-D');
			this.setData({
				selectedDay: today
			}, () => {
				this._generateWeekDays();
				this.triggerEvent('click', { day: today });
			});
		},

		// 完整日历的日期点击
		bindCalendarDayTap: function (e) {
			const day = e.detail.day;
			this.setData({
				selectedDay: day,
				showFullCalendar: false
			}, () => {
				this._generateWeekDays();
				this.triggerEvent('click', { day: day });
			});
		},

		// 阻止事件冒泡
		stopPropagation: function () {
			// 空函数，用于阻止点击事件冒泡
		}
	}
})
