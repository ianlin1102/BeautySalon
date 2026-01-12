/**
 * 卡项系统测试页面
 */

const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({
	data: {
		testResults: [],
		isAdmin: false,
		userId: '',
		phone: '',
		createdCardId: '', // 创建的卡项ID
		createdUserCardId: '', // 创建的用户卡项ID
		lastUniqueId: '', // 最后生成的唯一识别码
		testCardWithValidity: '', // 带有效期的测试卡项ID
	},

	onLoad: function (options) {
		// 获取当前用户信息
		this.checkAdmin();
	},

	// 检查是否是管理员
	async checkAdmin() {
		try {
			let res = await cloudHelper.callCloudData('admin/home', {});
			this.setData({
				isAdmin: true
			});
			this.addLog('管理员身份验证成功', 'success');
		} catch (e) {
			this.setData({
				isAdmin: false
			});
			this.addLog('非管理员用户，部分功能不可用', 'warning');
		}
	},

	// 添加日志
	addLog(message, type = 'info') {
		let color = '#333';
		if (type === 'success') color = '#07c160';
		if (type === 'error') color = '#fa5151';
		if (type === 'warning') color = '#ff976a';

		this.data.testResults.unshift({
			time: new Date().toLocaleTimeString(),
			message: message,
			color: color
		});

		this.setData({
			testResults: this.data.testResults
		});
	},

	// 清空日志
	clearLog() {
		this.setData({
			testResults: []
		});
	},

	// 返回上一页
	goBack() {
		wx.navigateBack({
			delta: 1,
			fail: () => {
				// 如果无法返回，跳转到首页
				wx.switchTab({
					url: '/projects/A00/default/index/default_index'
				});
			}
		});
	},

	// 跳转到首页
	goHome() {
		wx.switchTab({
			url: '/projects/A00/default/index/default_index'
		});
	},

	// 跳转到卡项搜索页面
	goCardSearch() {
		wx.navigateTo({
			url: '/pages/card/search/card_search'
		});
	},

	// 跳转到卡项商城页面
	goCardStore() {
		wx.switchTab({
			url: '/pages/card/store/card_store'
		});
	},

	// ========== 卡项商品管理测试 ==========

	// 测试1：创建次数卡
	async testCreateTimesCard() {
		this.addLog('开始测试：创建次数卡...', 'info');
		try {
			let params = {
				type: 1,
				name: '10次美容护理卡',
				desc: '包含10次面部护理服务，有效期1年，适合经常光顾的顾客',
				price: 200,
				times: 10,
				amount: 0,
				order: 100,
				paymentZelle: 'test@example.com',
				paymentInstructions: '转账后请截图发送至微信，我们会在24小时内为您充值'
			};

			let result = await cloudHelper.callCloudSumbit('admin/card_insert', params);

			if (!result || !result.data || !result.data.id) {
				this.addLog('创建失败：返回数据无效', 'error');
				return;
			}

			this.setData({
				createdCardId: result.data.id
			});
			this.addLog(`创建次数卡成功！卡项ID: ${result.data.id}`, 'success');
		} catch (e) {
			this.addLog(`创建次数卡失败: ${e.message || e.errMsg}`, 'error');
		}
	},

	// 测试2：创建余额卡
	async testCreateBalanceCard() {
		this.addLog('开始测试：创建余额卡...', 'info');
		try {
			let params = {
				type: 2,
				name: '$500充值卡',
				desc: '充值$500到账户余额，可用于任意服务消费，永久有效',
				price: 500,
				times: 0,
				amount: 500,
				order: 200,
				paymentZelle: 'test@example.com',
				paymentInstructions: '通过Zelle转账，备注姓名和手机号'
			};

			let result = await cloudHelper.callCloudSumbit('admin/card_insert', params);
			this.addLog(`创建余额卡成功！卡项ID: ${result.data.id}`, 'success');
		} catch (e) {
			this.addLog(`创建余额卡失败: ${e.message || e.errMsg}`, 'error');
		}
	},

	// 测试3：获取卡项列表
	async testGetCardList() {
		this.addLog('开始测试：获取卡项列表...', 'info');
		try {
			let params = {
				page: 1,
				size: 20,
				isTotal: true
			};

			let data = await cloudHelper.callCloudData('admin/card_list', params);
			this.addLog(`获取卡项列表成功！共${data.total}个卡项`, 'success');
			if (data.list && data.list.length > 0) {
				this.addLog(`   第一个卡项: ${data.list[0].CARD_NAME}`, 'info');
			}
		} catch (e) {
			this.addLog(`获取卡项列表失败: ${e.message || e.errMsg}`, 'error');
		}
	},

	// ========== 用户卡项管理测试 ==========

	// 手机号输入
	onPhoneInput(e) {
		this.setData({
			phone: e.detail.value
		});
	},

	// 测试4：搜索用户
	async testSearchUser() {
		if (!this.data.phone) {
			this.addLog('请先输入手机号', 'error');
			return;
		}

		this.addLog(`开始测试：搜索用户 ${this.data.phone}...`, 'info');
		try {
			let params = {
				phone: this.data.phone
			};

			let data = await cloudHelper.callCloudData('admin/user_card_search', params);

			if (!data || !data.user) {
				this.addLog('未找到用户信息', 'error');
				return;
			}

			this.setData({
				userId: data.userId
			});

			this.addLog(`找到用户: ${data.user.USER_NAME || '未设置姓名'}`, 'success');
			this.addLog(`   手机号: ${data.user.USER_MOBILE}`, 'info');
			this.addLog(`   用户OpenID: ${data.userId}`, 'info');
			this.addLog(`   总余额: $${data.totalBalance || data.totalAmount || 0}`, 'info');
			this.addLog(`   总次数: ${data.totalTimes}次`, 'info');
			this.addLog(`   卡项数量: ${data.cards.total}`, 'info');
		} catch (e) {
			this.addLog(`搜索用户失败: ${e.message || e.errMsg}`, 'error');
		}
	},

	// 测试5：给用户充值次数卡
	async testAddUserTimesCard() {
		if (!this.data.userId) {
			this.addLog('请先搜索用户', 'error');
			return;
		}

		this.addLog('开始测试：给用户充值次数卡...', 'info');
		try {
			let params = {
				userId: this.data.userId,
				cardId: this.data.createdCardId || '',
				cardName: '10次美容护理卡',
				type: 1,
				times: 10,
				amount: 0,
				reason: '测试充值 - 客户通过Zelle支付$200购买10次卡',
				paymentMethod: 'Zelle'
			};

			let result = await cloudHelper.callCloudSumbit('admin/user_card_add', params);
			this.setData({
				createdUserCardId: result.data.userCardId
			});
			this.addLog(`充值次数卡成功！用户卡项ID: ${result.data.userCardId}`, 'success');
		} catch (e) {
			this.addLog(`充值次数卡失败: ${e.message || e.errMsg}`, 'error');
		}
	},

	// 测试6：给用户充值余额
	async testAddUserBalanceCard() {
		if (!this.data.userId) {
			this.addLog('请先搜索用户', 'error');
			return;
		}

		this.addLog('开始测试：给用户充值余额...', 'info');
		try {
			let params = {
				userId: this.data.userId,
				cardName: '余额充值',
				type: 2,
				times: 0,
				amount: 500,
				reason: '测试充值 - 客户通过Zelle转账$500充值',
				paymentMethod: 'Zelle'
			};

			let result = await cloudHelper.callCloudSumbit('admin/user_card_add', params);
			this.addLog(`充值余额成功！用户卡项ID: ${result.data.userCardId}`, 'success');
		} catch (e) {
			this.addLog(`充值余额失败: ${e.message || e.errMsg}`, 'error');
		}
	},

});
