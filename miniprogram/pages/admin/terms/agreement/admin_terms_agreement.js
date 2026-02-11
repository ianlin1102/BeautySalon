const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
	data: {
		isAdmin: false,
		isLoad: false,
		_params: {},
		search: '',
		versionFilter: 0,
		expandedId: '', // 当前展开详情的记录ID
		detailData: null,
	},

	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		this.setData({ isLoad: true });
	},

	// 搜索
	bindSearchInput: function (e) {
		this.setData({ search: e.detail.value });
	},

	bindSearchTap: function () {
		this.setData({
			_params: {
				search: this.data.search,
				version: this.data.versionFilter,
			}
		});
	},

	// 点击记录查看详情
	bindItemTap: async function (e) {
		let id = e.currentTarget.dataset.id;

		if (this.data.expandedId === id) {
			// 收起
			this.setData({ expandedId: '', detailData: null });
			return;
		}

		// 加载详情
		try {
			let res = await cloudHelper.callCloudData('admin/terms_agreement_detail', { id }, { title: 'bar' });
			if (res) {
				res = this._processDetail(res);
			}
			this.setData({
				expandedId: id,
				detailData: res
			});
		} catch (err) {
			pageHelper.showModal('获取详情失败');
		}
	},

	// 处理详情数据，计算显示字段
	_processDetail: function (detail) {
		let d = detail;
		let dev = d.AGREE_DEVICE_INFO || {};

		// IP: AGREE_IP → AGREE_ADD_IP → '未知'
		d._ip = d.AGREE_IP || d.AGREE_ADD_IP || '未知';

		// 来源平台
		let platformMap = { miniprogram: '微信小程序', web: 'Web 网页' };
		d._platform = platformMap[dev.platform] || dev.platform || '未知';

		// 操作系统
		d._system = dev.system || '未知';

		// 设备: brand + model，若空则用 userAgent 摘要
		let deviceParts = [dev.brand, dev.model].filter(Boolean);
		if (deviceParts.length > 0) {
			d._device = deviceParts.join(' ');
		} else if (dev.userAgent) {
			// 从 userAgent 提取浏览器/系统摘要
			let ua = dev.userAgent;
			let match = ua.match(/\(([^)]{0,60})\)/);
			d._device = match ? match[1] : ua.substring(0, 60);
		} else {
			d._device = '未知';
		}

		// 屏幕分辨率
		d._screen = (dev.screenWidth && dev.screenHeight)
			? dev.screenWidth + ' × ' + dev.screenHeight
			: '';

		// 语言
		d._language = dev.language || '';

		// 网络
		d._network = dev.networkType || '';

		// UserAgent 完整 (仅 web 有)
		d._userAgent = dev.userAgent || '';

		// 勾选状态
		d._checkbox = d.AGREE_CHECKBOX ? '✓ 已确认' : '✗ 未确认';

		// 格式化时间
		d._timeFormatted = this._formatTime(d.AGREE_TIME);

		// 标识信息
		let typeMap = { wechat: '微信', google: 'Google', username: 'Web账号' };
		d._uniqueType = typeMap[d.AGREE_UNIQUE_TYPE] || d.AGREE_UNIQUE_TYPE || '未知';
		d._uniqueId = d.AGREE_UNIQUE_ID || d.AGREE_USER_ID || '未知';
		d._userId = d.AGREE_USER_ID || '未知';

		return d;
	},

	// 时间戳格式化
	_formatTime: function (timestamp) {
		if (!timestamp) return '未知';
		let d = new Date(timestamp);
		if (isNaN(d.getTime())) return String(timestamp);
		let pad = n => String(n).padStart(2, '0');
		return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
			+ ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
	},

	// 导出 PDF（复制链接到剪贴板）
	bindExportPdf: function (e) {
		let id = e.currentTarget.dataset.id;
		let token = '';
		try {
			let authInfo = wx.getStorageSync('auth_info');
			if (authInfo && authInfo.user) {
				token = authInfo.user.id || authInfo.user._id || '';
			}
		} catch (err) { }

		let url = 'https://cloud1-6gnd02he13c1ff2e-1380655578.ap-shanghai.app.tcloudbase.com/#/terms/print/' + id + '?token=' + token;

		wx.setClipboardData({
			data: url,
			success: function () {
				wx.showModal({
					title: 'Export PDF',
					content: '链接已复制到剪贴板。请在浏览器中打开此链接，然后使用"打印"功能保存为 PDF。\n\nLink copied. Open in browser and use Print to save as PDF.',
					showCancel: false,
					confirmText: '知道了'
				});
			}
		});
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	bindCommListCmpt: function (e) {
		pageHelper.commListListener(this, e);
	},
});
