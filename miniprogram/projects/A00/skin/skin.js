module.exports = {
	PID: 'A00', //美业

	NAV_COLOR: '#ffffff',
	NAV_BG: '#333333',

	MEET_NAME: '预约',

	MENU_ITEM: ['首页', '预约日历', '我的'], // 第1,4,5菜单

	NEWS_CATE: '1=小店动态|rightpic,2=美容小课堂|leftbig',
	CARD_CATE: '1=次数卡|leftbig,2=余额卡|leftbig',
	MEET_TYPE: '1=Hip-Hop|leftbig2,2=K-Pop|leftbig,3=Jazz Funk|leftbig2,4=古典舞|leftbig,99=其他(自定义)|leftbig',

	// 舞蹈分类颜色配置
	MEET_TYPE_COLORS: {
		'1': '#FF6B6B',     // Hip-Hop - 活力红
		'2': '#4ECDC4',     // K-Pop - 青春蓝绿
		'3': '#FFD93D',     // Jazz Funk - 明亮黄
		'4': '#A8E6CF',     // 古典舞 - 典雅绿
		'99': '#95A5A6'     // 其他 - 灰色
	},

	DEFAULT_FORMS: [{
			type: 'line',
			title: '姓名',
			desc: '请填写您的姓名',
			must: true,
			len: 50,
			onlySet: {
				mode: 'all',
				cnt: -1
			},
			selectOptions: ['', ''],
			mobileTruth: true,
			checkBoxLimit: 2,
		},
		{
			type: 'line',
			title: '手机',
			desc: '请填写您的手机号码',
			must: true,
			len: 50,
			onlySet: {
				mode: 'all',
				cnt: -1
			},
			selectOptions: ['', ''],
			mobileTruth: true,
			checkBoxLimit: 2,
		}
	]
}