/**
 * 卡项搜索页面
 */

const AdminCardBiz = require('../../biz/admin_card_biz.js');
const pageHelper = require('../../helper/page_helper.js');

Page({
	data: {
		searchType: 'uniqueId', // 'uniqueId' 或 'phone'
		uniqueId: '',
		phone: '',
		searchResult: null,
		searching: false,
		hasSearched: false
	},

	onLoad: function (options) {
		// 如果有参数传入，自动填充
		if (options.uniqueId) {
			this.setData({
				searchType: 'uniqueId',
				uniqueId: options.uniqueId
			});
			// 可以自动搜索
			this.searchByUniqueId();
		} else if (options.phone) {
			this.setData({
				searchType: 'phone',
				phone: options.phone
			});
		}
	},

	// 切换搜索类型
	switchSearchType(e) {
		let type = e.currentTarget.dataset.type;
		this.setData({
			searchType: type,
			searchResult: null,
			hasSearched: false
		});
	},

	// 输入识别码
	onUniqueIdInput(e) {
		this.setData({
			uniqueId: e.detail.value.toUpperCase()
		});
	},

	// 输入手机号
	onPhoneInput(e) {
		this.setData({
			phone: e.detail.value
		});
	},

	// 通过识别码搜索
	async searchByUniqueId() {
		if (!this.data.uniqueId || this.data.uniqueId.trim() === '') {
			wx.showToast({
				title: '请输入识别码',
				icon: 'none'
			});
			return;
		}

		this.setData({ searching: true });

		try {
			let result = await AdminCardBiz.searchByUniqueId(this.data.uniqueId);

			this.setData({
				searchResult: result,
				hasSearched: true,
				searching: false
			});

			if (!result) {
				wx.showToast({
					title: '未找到该卡项',
					icon: 'none'
				});
			} else {
				wx.showToast({
					title: '搜索成功',
					icon: 'success'
				});
			}
		} catch (e) {
			console.error('搜索失败:', e);
			this.setData({
				searching: false,
				hasSearched: true
			});
			wx.showToast({
				title: '搜索失败',
				icon: 'none'
			});
		}
	},

	// 通过手机号搜索
	async searchByPhone() {
		if (!this.data.phone || this.data.phone.trim() === '') {
			wx.showToast({
				title: '请输入手机号',
				icon: 'none'
			});
			return;
		}

		if (this.data.phone.length !== 11) {
			wx.showToast({
				title: '请输入正确的手机号',
				icon: 'none'
			});
			return;
		}

		this.setData({ searching: true });

		try {
			let result = await AdminCardBiz.searchByPhone(this.data.phone);

			this.setData({
				searchResult: result,
				hasSearched: true,
				searching: false
			});

			if (!result) {
				wx.showToast({
					title: '未找到该用户',
					icon: 'none'
				});
			} else {
				wx.showToast({
					title: '搜索成功',
					icon: 'success'
				});
			}
		} catch (e) {
			console.error('搜索失败:', e);
			this.setData({
				searching: false,
				hasSearched: true
			});
			wx.showToast({
				title: '搜索失败',
				icon: 'none'
			});
		}
	},

	// 复制识别码
	copyUniqueId(e) {
		let uniqueId = e.currentTarget.dataset.id;
		wx.setClipboardData({
			data: uniqueId,
			success: () => {
				wx.showToast({
					title: '识别码已复制',
					icon: 'success'
				});
			}
		});
	},

	// 调整卡项（扣减或增加）
	async adjustCard(e) {
		let type = e.currentTarget.dataset.type; // 'deduct' 或 'add'

		if (!this.data.searchResult || !this.data.searchResult.userCard) {
			return;
		}

		let card = this.data.searchResult.userCard;

		// 检查卡项状态（增加时不检查余额）
		if (card.USER_CARD_STATUS !== 1) {
			wx.showToast({
				title: '该卡项不可用',
				icon: 'none'
			});
			return;
		}

		// 如果是扣减，检查剩余次数/余额
		if (type === 'deduct') {
			if (card.USER_CARD_TYPE === 1 && card.USER_CARD_REMAIN_TIMES <= 0) {
				wx.showToast({
					title: '次数不足',
					icon: 'none'
				});
				return;
			}

			if (card.USER_CARD_TYPE === 2 && card.USER_CARD_REMAIN_AMOUNT <= 0) {
				wx.showToast({
					title: '余额不足',
					icon: 'none'
				});
				return;
			}
		}

		// 根据卡项类型显示不同的输入界面
		if (card.USER_CARD_TYPE === 1) {
			// 次数卡
			this.showAdjustTimesDialog(card, type);
		} else {
			// 余额卡
			this.showAdjustAmountDialog(card, type);
		}
	},

	// 显示调整次数对话框
	showAdjustTimesDialog(card, type) {
		let isDeduct = type === 'deduct';
		let title = `${isDeduct ? '扣减' : '增加'}次数 (剩余${card.USER_CARD_REMAIN_TIMES}次)`;

		wx.showModal({
			title: title,
			editable: true,
			placeholderText: '请输入次数 (整数, 1-9999)',
			success: async (res) => {
				if (res.confirm) {
					// 检查是否输入
					if (!res.content || res.content.trim() === '') {
						wx.showToast({
							title: '请输入次数',
							icon: 'none',
							duration: 2000
						});
						// 立即重新打开输入框
						setTimeout(() => {
							this.showAdjustTimesDialog(card, type);
						}, 100);
						return;
					}

					let input = res.content.trim();

					// 检查是否包含小数点
					if (input.includes('.')) {
						wx.showToast({
							title: '不允许输入小数',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustTimesDialog(card, type);
						}, 100);
						return;
					}

					// 检查是否为纯数字
					if (!/^\d+$/.test(input)) {
						wx.showToast({
							title: '只能输入数字',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustTimesDialog(card, type);
						}, 100);
						return;
					}

					let times = parseInt(input);

					// 检查是否为有效正整数
					if (isNaN(times) || times <= 0) {
						wx.showToast({
							title: '请输入大于0的整数',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustTimesDialog(card, type);
						}, 100);
						return;
					}

					// 检查上限（不超过4位数）
					if (times > 9999) {
						wx.showToast({
							title: '单次最多9999次',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustTimesDialog(card, type);
						}, 100);
						return;
					}

					// 扣减时检查是否超过剩余次数
					if (isDeduct && times > card.USER_CARD_REMAIN_TIMES) {
						wx.showToast({
							title: `次数不足(剩余${card.USER_CARD_REMAIN_TIMES}次)`,
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustTimesDialog(card, type);
						}, 100);
						return;
					}

					// 显示原因输入
					this.showReasonDialog(card._id, isDeduct ? -times : times, 0);
				}
			}
		});
	},

	// 显示调整金额对话框
	showAdjustAmountDialog(card, type) {
		let isDeduct = type === 'deduct';
		let title = `${isDeduct ? '扣减' : '增加'}金额 (余额$${card.USER_CARD_REMAIN_AMOUNT})`;

		wx.showModal({
			title: title,
			editable: true,
			placeholderText: '请输入金额 (整数, 1-9999)',
			success: async (res) => {
				if (res.confirm) {
					// 检查是否输入
					if (!res.content || res.content.trim() === '') {
						wx.showToast({
							title: '请输入金额',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustAmountDialog(card, type);
						}, 100);
						return;
					}

					let input = res.content.trim();

					// 检查是否包含小数点
					if (input.includes('.')) {
						wx.showToast({
							title: '不允许输入小数',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustAmountDialog(card, type);
						}, 100);
						return;
					}

					// 检查是否为纯数字
					if (!/^\d+$/.test(input)) {
						wx.showToast({
							title: '只能输入数字',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustAmountDialog(card, type);
						}, 100);
						return;
					}

					let amount = parseInt(input);

					// 检查是否为有效正整数
					if (isNaN(amount) || amount <= 0) {
						wx.showToast({
							title: '请输入大于0的整数',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustAmountDialog(card, type);
						}, 100);
						return;
					}

					// 检查上限（不超过4位数）
					if (amount > 9999) {
						wx.showToast({
							title: '单次最多9999',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustAmountDialog(card, type);
						}, 100);
						return;
					}

					// 扣减时检查是否超过余额
					if (isDeduct && amount > card.USER_CARD_REMAIN_AMOUNT) {
						wx.showToast({
							title: `余额不足(剩余$${card.USER_CARD_REMAIN_AMOUNT})`,
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showAdjustAmountDialog(card, type);
						}, 100);
						return;
					}

					// 显示原因输入
					this.showReasonDialog(card._id, 0, isDeduct ? -amount : amount);
				}
			}
		});
	},

	// 显示原因输入对话框
	showReasonDialog(userCardId, changeTimes, changeAmount) {
		let isDeduct = changeTimes < 0 || changeAmount < 0;
		let title = isDeduct ? '扣减原因（必填）' : '增加原因（必填）';
		let placeholder = isDeduct ? '如: 完成美容护理 (最少2字)' : '如: 操作失误补偿 (最少2字)';

		wx.showModal({
			title: title,
			editable: true,
			placeholderText: placeholder,
			success: async (res) => {
				if (res.confirm) {
					// 检查是否输入原因
					if (!res.content || res.content.trim() === '') {
						wx.showToast({
							title: '请输入原因',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showReasonDialog(userCardId, changeTimes, changeAmount);
						}, 100);
						return;
					}

					// 检查原因长度（至少2个字符）
					if (res.content.trim().length < 2) {
						wx.showToast({
							title: '原因至少2个字',
							icon: 'none',
							duration: 2000
						});
						setTimeout(() => {
							this.showReasonDialog(userCardId, changeTimes, changeAmount);
						}, 100);
						return;
					}

					await this.executeAdjust(userCardId, changeTimes, changeAmount, res.content.trim());
				}
			}
		});
	},

	// 执行调整操作
	async executeAdjust(userCardId, changeTimes, changeAmount, reason) {
		let isDeduct = changeTimes < 0 || changeAmount < 0;
		let actionText = isDeduct ? '扣减' : '增加';

		wx.showLoading({
			title: `${actionText}中...`,
			mask: true
		});

		try {
			let result = await AdminCardBiz.adjustUserCard({
				userCardId,
				changeTimes,
				changeAmount,
				reason
			});

			wx.hideLoading();

			wx.showToast({
				title: `${actionText}成功`,
				icon: 'success'
			});

			// 刷新搜索结果
			if (this.data.searchType === 'uniqueId') {
				await this.searchByUniqueId();
			} else {
				await this.searchByPhone();
			}
		} catch (e) {
			wx.hideLoading();
			console.error(`${actionText}失败:`, e);
			wx.showModal({
				title: `${actionText}失败`,
				content: e.message || e.errMsg || '未知错误',
				showCancel: false
			});
		}
	},

	// 从列表中调整卡项（扣减或增加）
	adjustCardFromList(e) {
		let index = e.currentTarget.dataset.index;
		let type = e.currentTarget.dataset.type;

		if (!this.data.searchResult || !this.data.searchResult.cards || !this.data.searchResult.cards.list) {
			return;
		}

		let card = this.data.searchResult.cards.list[index];

		// 检查卡项状态
		if (card.USER_CARD_STATUS !== 1) {
			wx.showToast({
				title: '该卡项不可用',
				icon: 'none'
			});
			return;
		}

		// 如果是扣减，检查剩余次数/余额
		if (type === 'deduct') {
			if (card.USER_CARD_TYPE === 1 && card.USER_CARD_REMAIN_TIMES <= 0) {
				wx.showToast({
					title: '次数不足',
					icon: 'none'
				});
				return;
			}

			if (card.USER_CARD_TYPE === 2 && card.USER_CARD_REMAIN_AMOUNT <= 0) {
				wx.showToast({
					title: '余额不足',
					icon: 'none'
				});
				return;
			}
		}

		// 根据卡项类型显示不同的输入界面
		if (card.USER_CARD_TYPE === 1) {
			// 次数卡
			this.showAdjustTimesDialog(card, type);
		} else {
			// 余额卡
			this.showAdjustAmountDialog(card, type);
		}
	},

	// 从列表中查看使用记录
	viewRecordsFromList(e) {
		let index = e.currentTarget.dataset.index;

		if (!this.data.searchResult || !this.data.searchResult.cards || !this.data.searchResult.cards.list) {
			return;
		}

		let card = this.data.searchResult.cards.list[index];
		let user = this.data.searchResult.user;

		let params = {
			userId: card.USER_CARD_USER_ID,
			userCardId: card._id,
			userName: user ? user.USER_NAME : '',
			userMobile: user ? user.USER_MOBILE : '',
			cardName: card.USER_CARD_CARD_NAME,
			uniqueId: card.USER_CARD_UNIQUE_ID
		};

		// 跳转到记录页面
		let url = '/pages/test/card_records?';
		for (let key in params) {
			if (params[key]) {
				url += `${key}=${encodeURIComponent(params[key])}&`;
			}
		}

		wx.navigateTo({
			url: url
		});
	},

	// 查看使用记录
	viewRecords() {
		if (!this.data.searchResult) {
			return;
		}

		let params = {};

		// 识别码搜索 - 显示单个卡项的记录
		if (this.data.searchType === 'uniqueId' && this.data.searchResult.userCard) {
			let card = this.data.searchResult.userCard;
			let user = this.data.searchResult.user;

			params = {
				userId: card.USER_CARD_USER_ID,
				userCardId: card._id,
				userName: user ? user.USER_NAME : '',
				userMobile: user ? user.USER_MOBILE : '',
				cardName: card.USER_CARD_CARD_NAME,
				uniqueId: card.USER_CARD_UNIQUE_ID
			};
		}
		// 手机号搜索 - 显示用户的所有记录
		else if (this.data.searchType === 'phone' && this.data.searchResult.user) {
			let user = this.data.searchResult.user;

			params = {
				userId: this.data.searchResult.userId,
				userName: user.USER_NAME,
				userMobile: user.USER_MOBILE
			};
		} else {
			wx.showToast({
				title: '数据错误',
				icon: 'none'
			});
			return;
		}

		// 跳转到记录页面
		let url = '/pages/test/card_records?';
		for (let key in params) {
			if (params[key]) {
				url += `${key}=${encodeURIComponent(params[key])}&`;
			}
		}

		wx.navigateTo({
			url: url
		});
	},

	// 返回上一页
	goBack() {
		wx.navigateBack({
			delta: 1,
			fail: () => {
				wx.redirectTo({
					url: '/pages/test/card_test'
				});
			}
		});
	},

	// 跳转到卡项商城
	goCardStore() {
		wx.navigateTo({
			url: '/pages/test/card_store'
		});
	},

	// 跳转到卡项管理
	goCardTest() {
		wx.navigateTo({
			url: '/pages/test/card_test'
		});
	},

	/**
	 * 新功能：查看使用记录（Pull up sheet）
	 */
	async showRecordsSheet(e) {
		let index = e.currentTarget.dataset.index;
		let card = this.data.searchResult.cards.list[index];
		// 关键：使用 searchResult.userId（这是 USER_MINI_OPENID）
		let userId = this.data.searchResult.userId;

		if (!userId) {
			wx.showToast({
				title: '用户信息丢失',
				icon: 'none'
			});
			console.error('userId 不存在于 searchResult 中:', this.data.searchResult);
			return;
		}

		wx.showLoading({ title: '加载中...' });

		try {
			const cloudHelper = require('../../helper/cloud_helper.js');
			let params = {
				userId: userId,  // 使用 openid（USER_MINI_OPENID）
				userCardId: card._id,
				page: 1,
				size: 50
			};

			let result = await cloudHelper.callCloudData('admin/user_card_records', params);

			this.setData({
				showRecordsModal: true,
				recordsList: result.list || [],
				currentCard: card
			});
		} catch (err) {
			console.error('加载记录失败:', err);
			wx.showToast({
				title: err.message || '加载失败',
				icon: 'none'
			});
		} finally {
			wx.hideLoading();
		}
	},

	hideRecordsModal() {
		this.setData({
			showRecordsModal: false,
			recordsList: [],
			currentCard: null
		});
	},

	preventClose() {
		// 阻止冒泡，防止点击弹窗内容时关闭
	},

	preventTouchMove() {
		// 阻止触摸移动事件，防止滚动穿透
		return false;
	},

	/**
	 * 新功能：删除卡项（双重确认）
	 */
	deleteCardFromList(e) {
		let index = e.currentTarget.dataset.index;
		let card = this.data.searchResult.cards.list[index];

		// 第一重确认
		wx.showModal({
			title: '删除确认',
			content: `确定要删除卡项"${card.USER_CARD_CARD_NAME}"吗？\n\n识别码: ${card.USER_CARD_UNIQUE_ID}\n剩余: ${card.USER_CARD_TYPE === 1 ? card.USER_CARD_REMAIN_TIMES + '次' : '$' + card.USER_CARD_REMAIN_AMOUNT}`,
			confirmText: '确认删除',
			cancelText: '取消',
			confirmColor: '#ff0000',
			success: (res) => {
				if (res.confirm) {
					// 第二重确认
					wx.showModal({
						title: '⚠️ 最终确认',
						content: '删除后无法恢复，请再次确认是否删除？',
						confirmText: '确认删除',
						cancelText: '我再想想',
						confirmColor: '#ff0000',
						success: async (res2) => {
							if (res2.confirm) {
								await this.performDeleteCard(card._id, index);
							}
						}
					});
				}
			}
		});
	},

	async performDeleteCard(userCardId, index) {
		wx.showLoading({ title: '删除中...' });

		try {
			const cloudHelper = require('../../helper/cloud_helper.js');
			await cloudHelper.callCloudSumbit('admin/user_card_delete', {
				userCardId: userCardId
			});

			// 更新列表
			let cards = this.data.searchResult.cards;
			cards.list.splice(index, 1);
			cards.total = cards.list.length;

			// 重新计算汇总
			let totalTimes = 0;
			let totalAmount = 0;
			cards.list.forEach(card => {
				if (card.USER_CARD_TYPE === 1) {
					totalTimes += card.USER_CARD_REMAIN_TIMES || 0;
				} else {
					totalAmount += card.USER_CARD_REMAIN_AMOUNT || 0;
				}
			});

			this.setData({
				'searchResult.cards': cards,
				'searchResult.totalTimes': totalTimes,
				'searchResult.totalAmount': totalAmount
			});

			wx.showToast({
				title: '删除成功',
				icon: 'success'
			});
		} catch (err) {
			console.error('删除失败:', err);
			wx.showToast({
				title: err.message || '删除失败',
				icon: 'none'
			});
		} finally {
			wx.hideLoading();
		}
	},

	/**
	 * 新功能：添加卡项
	 */
	async showAddCardModal() {
		wx.showLoading({ title: '加载卡项...' });

		try {
			const cloudHelper = require('../../helper/cloud_helper.js');
			// 使用 admin API 获取完整的卡项数据
			let result = await cloudHelper.callCloudData('admin/card_list', {
				page: 1,
				size: 100,
				// 只获取上架状态的卡项
				whereEx: {
					CARD_STATUS: 1
				}
			});

			console.log('可用卡项列表:', result.list);

			// 过滤出状态正常的卡项
			let availableCards = (result.list || []).filter(card => card.CARD_STATUS === 1);

			this.setData({
				showAddCardModal: true,
				availableCards: availableCards,
				selectedCard: null,
				customValue: '',
				customValidityDays: ''
			});
		} catch (err) {
			console.error('加载卡项失败:', err);
			wx.showToast({
				title: '加载失败',
				icon: 'none'
			});
		} finally {
			wx.hideLoading();
		}
	},

	hideAddCardModal() {
		this.setData({
			showAddCardModal: false,
			availableCards: [],
			selectedCard: null,
			customValue: '',
			customValidityDays: ''
		});
	},

	onCardSelect(e) {
		let index = e.detail.value;
		let selectedCard = this.data.availableCards[index];
		this.setData({
			selectedCard: selectedCard,
			customValue: '',  // 重置自定义值
			customValidityDays: ''
		});
	},

	onCustomValueInput(e) {
		this.setData({
			customValue: e.detail.value
		});
	},

	onCustomValidityInput(e) {
		this.setData({
			customValidityDays: e.detail.value
		});
	},

	async confirmAddCard() {
		if (!this.data.selectedCard) {
			wx.showToast({
				title: '请选择卡项',
				icon: 'none'
			});
			return;
		}

		let card = this.data.selectedCard;
		// 关键：使用 searchResult.userId（这是 USER_MINI_OPENID）
		let userId = this.data.searchResult.userId;

		if (!userId) {
			wx.showToast({
				title: '用户信息错误',
				icon: 'none'
			});
			console.error('userId 不存在于 searchResult 中:', this.data.searchResult);
			return;
		}

		// 计算最终值
		let finalTimes = 0;
		let finalAmount = 0;

		if (card.CARD_TYPE === 1) {
			// 次数卡
			finalTimes = this.data.customValue ? parseInt(this.data.customValue) : card.CARD_TIMES;
		} else {
			// 余额卡
			finalAmount = this.data.customValue ? parseFloat(this.data.customValue) : card.CARD_AMOUNT;
		}

		// 处理有效期：空或0视为永久有效
		let finalValidityDays = 0;
		if (this.data.customValidityDays && this.data.customValidityDays !== '' && this.data.customValidityDays !== '0') {
			finalValidityDays = parseInt(this.data.customValidityDays);
		} else if (!this.data.customValidityDays || this.data.customValidityDays === '') {
			// 如果用户没有输入，使用卡项默认值
			finalValidityDays = card.CARD_VALIDITY_DAYS || 0;
		}

		wx.showLoading({ title: '添加中...' });

		try {
			const cloudHelper = require('../../helper/cloud_helper.js');
			let params = {
				userId: userId,  // 使用 openid（USER_MINI_OPENID）
				cardId: card._id,
				cardName: card.CARD_NAME,  // 必需参数
				type: card.CARD_TYPE,      // 必需参数
				reason: '管理员添加',       // 必需参数
				paymentMethod: '后台添加'   // 可选参数
			};

			// 添加次数或金额
			if (card.CARD_TYPE === 1) {
				params.times = finalTimes;
			} else {
				params.amount = finalAmount;
			}

			// 添加有效期（如果大于0）
			if (finalValidityDays > 0) {
				params.validityDays = finalValidityDays;
			}

			console.log('添加卡项参数:', params);

			await cloudHelper.callCloudSumbit('admin/user_card_add', params);

			wx.showToast({
				title: '添加成功',
				icon: 'success'
			});

			// 关闭弹窗
			this.hideAddCardModal();

			// 刷新搜索结果
			setTimeout(() => {
				this.searchByPhone();
			}, 1500);
		} catch (err) {
			console.error('添加失败:', err);
			wx.showToast({
				title: err.message || '添加失败',
				icon: 'none',
				duration: 3000
			});
		} finally {
			wx.hideLoading();
		}
	}
});
