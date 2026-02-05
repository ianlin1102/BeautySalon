const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const setting = require('../setting/setting.js');
const MeetBiz = require('../biz/meet_biz.js');
const cancelHelper = require('../helper/cancel_helper.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		forms: [{
			mark: 'PCERZITIQH',
			val: [2, 1],
			title: 't111',
			type: 'line'
		}, {
			mark: 'SDFHUJWMLF',
			val: [false],
			title: 't111',
			type: 'line'
		}, {
			mark: 'KWTHSZLIVF1',
			val: '555',
			title: '电话1',
			type: 'line'
		}, {
			mark: 'ccc',
			val: ['广东省', '深圳市', ''],
			title: '地区1',
			type: 'mobile'
		}, {
			mark: 'ALETOSCFPZ',
			val: '777',
			title: '女朋友',
			type: 'idcard'
		}],

		// 卡项相关
		needCard: false,
		costSet: null,
		userCards: [],
		userCardsDisplay: [],
		selectedCardId: '',
		selectedCardIndex: -1,

		// 预约条款
		agreedTerms: false,
		termsText: '',
		bookingTermsSections: [],
		showTermsModal: false,

		// 用户条款
		showUserTermsModal: false,
		userTermsSections: [],
		userTermsVersion: 0,
		needAgreeUserTerms: false,
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: async function (options) {
			if (!pageHelper.getOptions(this, options)) return;
			if (!pageHelper.getOptions(this, options, 'timeMark')) return;

			this._loadDetail();

		},

		_loadDetail: async function () {
			let id = this.data.id;
			if (!id) return;

			let timeMark = this.data.timeMark;
			if (!timeMark) return;

			let params = {
				meetId: id,
				timeMark
			};
			let opt = {
				title: 'bar'
			};
			let meet = await cloudHelper.callCloudData('meet/detail_for_join', params, opt);
			if (!meet) {
				this.setData({
					isLoad: null
				})
				return;
			}

			// 生成取消规则描述
			let cancelRuleDesc = '';
			if (meet.MEET_CANCEL_SET) {
				cancelRuleDesc = cancelHelper.getCancelRuleDesc(meet.MEET_CANCEL_SET);
			}


		// 检查是否需要卡项
		let costSet = meet.MEET_COST_SET || { isEnabled: false };
		let needCard = costSet.isEnabled && costSet.costType !== 'free';
		let userCards = [];
		let userCardsDisplay = [];
		let costDesc = '';

		console.log('=== 卡项检查 ===');
		console.log('MEET_COST_SET:', costSet);
		console.log('needCard:', needCard);

		if (needCard) {
			// 加载用户的卡项
			try {
				let cardParams = {
					status: 1 // 只加载有效卡项
				};
				let cardResult = await cloudHelper.callCloudData('card/my_cards', cardParams, { title: '' });

				if (cardResult && cardResult.list) {
					// 根据costType筛选合适的卡项
					userCards = cardResult.list.filter(card => {
						if (costSet.costType === 'times') {
							return card.USER_CARD_TYPE === 1 && card.USER_CARD_REMAIN_TIMES >= costSet.timesCost;
						} else if (costSet.costType === 'balance') {
							return card.USER_CARD_TYPE === 2 && card.USER_CARD_REMAIN_AMOUNT >= costSet.balanceCost;
						} else if (costSet.costType === 'both') {
							return (card.USER_CARD_TYPE === 1 && card.USER_CARD_REMAIN_TIMES >= costSet.timesCost) ||
								   (card.USER_CARD_TYPE === 2 && card.USER_CARD_REMAIN_AMOUNT >= costSet.balanceCost);
						}
						return false;
					});

					// 生成用于 picker 显示的字符串数组
					userCardsDisplay = userCards.map(card => {
						let displayText = card.USER_CARD_CARD_NAME;
						if (card.USER_CARD_TYPE === 1) {
							displayText += ' (剩余' + card.USER_CARD_REMAIN_TIMES + '次)';
						} else {
							displayText += ' (剩余' + card.USER_CARD_REMAIN_AMOUNT + '元)';
						}
						return displayText;
					});
				}

				// 生成消费说明
				if (costSet.costType === 'times') {
					costDesc = '需要消耗 ' + costSet.timesCost + ' 次';
				} else if (costSet.costType === 'balance') {
					costDesc = '需要消耗 ' + costSet.balanceCost + ' 元';
				} else if (costSet.costType === 'both') {
					costDesc = '需要消耗 ' + costSet.timesCost + ' 次 或 ' + costSet.balanceCost + ' 元';
				}

			} catch (err) {
				console.error('加载卡项失败:', err);
			}
		}

		// 生成免责条款文本
		let termsText = '';
		let cancelSet = meet.MEET_CANCEL_SET || {};
		console.log('=== 生成免责条款 ===');
		console.log('cancelSet:', cancelSet);
		if (cancelSet.isLimit) {
			if (cancelSet.days === -1) {
				termsText = '本预约提交后不可取消，请您谨慎选择预约时间。如因个人原因未能按时参加，将无法获得任何补偿。';
			} else {
				let timeParts = [];
				if (cancelSet.days > 0) timeParts.push(cancelSet.days + '天');
				if (cancelSet.hours > 0) timeParts.push(cancelSet.hours + '小时');
				if (cancelSet.minutes > 0) timeParts.push(cancelSet.minutes + '分钟');
				let timeDesc = timeParts.join('');
				termsText = '本预约需在开始前' + timeDesc + '取消，超过该时间将无法取消。请您合理安排时间，如因个人原因超时未取消，将无法获得任何补偿。';
			}
		} else {
			termsText = '本预约可在开始前随时取消。请您按时参加预约，如需取消请提前操作。';
		}
		console.log('生成的 termsText:', termsText);

		this.setData({
			isLoad: true,
			meet,
			cancelRuleDesc,
			needCard,
			costSet,
			userCards,
			userCardsDisplay,
			costDesc,
			termsText
		});
		console.log('setData 完成, 当前 termsText:', this.data.termsText);

	},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () {},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: function () {

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
			await this._loadDetail();
			wx.stopPullDownRefresh();
		},



		url: function (e) {
			pageHelper.url(e, this);
		},

		onPageScroll: function (e) {
			// 回页首按钮
			pageHelper.showTopBtn(e, this);

		},

		bindCheckTap: async function (e) {
			this.selectComponent("#form-show").checkForms();
		},
	// 卡项选择
	bindCardChange: function (e) {
		let index = parseInt(e.detail.value);
		let cardId = this.data.userCards[index]._id;
		this.setData({
			selectedCardIndex: index,
			selectedCardId: cardId
		});
	},

	// 同意预约条款
	bindAgreeTerms: function (e) {
		this.setData({
			agreedTerms: e.detail.value.length > 0
		});
	},

	// 查看预约条款详情
	bindViewBookingTerms: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/get', { type: 'booking_terms' }, { title: 'bar' });
			this.setData({
				showTermsModal: true,
				bookingTermsSections: res.sections || []
			});
		} catch (err) {
			console.error('获取条款失败:', err);
			pageHelper.showModal('获取条款失败，请重试');
		}
	},

	// 关闭条款弹窗
	bindCloseTermsModal: function () {
		this.setData({ showTermsModal: false });
	},

	// 检查用户条款状态（严格模式 - 阻止继续）
	_checkUserTermsStrict: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/check_user_terms', {}, { title: 'none' });

			// 检查 needAgree 或 userAgreed 不为 1
			if (res.needAgree || res.userAgreed !== 1) {
				return new Promise((resolve) => {
					wx.showModal({
						title: '需要同意用户条款',
						content: '您需要先同意用户服务条款才能继续操作',
						cancelText: '我再看看',
						confirmText: '前往同意',
						success: (result) => {
							if (result.confirm) {
								wx.navigateTo({ url: '/pages/terms/user/terms_user' });
							}
							resolve(false);
						}
					});
				});
			}
			return true;
		} catch (err) {
			console.error('检查用户条款失败:', err);
			return true; // 失败时默认通过
		}
	},

	// 检查用户条款状态（旧版本 - 内嵌弹窗）
	_checkUserTerms: async function () {
		try {
			let res = await cloudHelper.callCloudData('terms/check_user_terms', {}, { title: 'none' });
			if (res.needAgree) {
				// 需要同意用户条款，获取条款内容
				let termsRes = await cloudHelper.callCloudData('terms/get', { type: 'user_terms' }, { title: 'none' });
				this.setData({
					needAgreeUserTerms: true,
					showUserTermsModal: true,
					userTermsSections: termsRes.sections || [],
					userTermsVersion: res.currentVersion
				});
				return false;
			}
			return true;
		} catch (err) {
			console.error('检查用户条款失败:', err);
			return true; // 失败时默认通过
		}
	},

	// 同意用户条款
	bindAgreeUserTerms: async function () {
		try {
			await cloudHelper.callCloudSumbit('terms/agree_user_terms', {
				version: this.data.userTermsVersion
			}, { title: '提交中' });

			// 记录用户条款同意信息（用于审计）
			this._userTermsInfo = {
				version: this.data.userTermsVersion,
				time: Date.now()
			};

			this.setData({
				showUserTermsModal: false,
				needAgreeUserTerms: false
			});

			// 同意后继续提交
			this._doSubmit();
		} catch (err) {
			console.error('同意条款失败:', err);
			pageHelper.showModal('操作失败，请重试');
		}
	},

	// 拒绝用户条款
	bindRefuseUserTerms: function () {
		this.setData({ showUserTermsModal: false });
	},

		bindSubmitCmpt: async function (e) {
			let forms = e.detail;
			this._pendingForms = forms; // 保存表单数据

		// 最高优先级：检查用户条款
		let userTermsStrictOk = await this._checkUserTermsStrict();
		if (!userTermsStrictOk) return;

		// 检查是否同意预约条款
		if (!this.data.agreedTerms) {
			return pageHelper.showModal('请阅读并同意预约须知');
		}

		// 如果需要卡项，检查是否已选择
		if (this.data.needCard) {
			// 检查是否有可用卡项
			if (this.data.userCards.length === 0) {
				return pageHelper.showModal('您暂无可用的卡项，请先购买卡项或联系我们充值后再预约');
			}
			if (!this.data.selectedCardId) {
				return pageHelper.showModal('请选择使用的卡项');
			}
			// 再次确认卡项余额是否充足
			let selectedCard = this.data.userCards[this.data.selectedCardIndex];
			let costSet = this.data.costSet;
			if (selectedCard.USER_CARD_TYPE === 1 && selectedCard.USER_CARD_REMAIN_TIMES < costSet.timesCost) {
				return pageHelper.showModal('该卡项次数不足');
			}
			if (selectedCard.USER_CARD_TYPE === 2 && selectedCard.USER_CARD_REMAIN_AMOUNT < costSet.balanceCost) {
				return pageHelper.showModal('该卡项余额不足');
			}
		}

		// 检查用户条款状态
		let userTermsOk = await this._checkUserTerms();
		if (!userTermsOk) return;

		// 继续提交
		this._doSubmit();
		},

		// 实际提交逻辑
		_doSubmit: async function () {
			let forms = this._pendingForms;

			let callback = async () => {
				try {
					let opts = {
						title: '提交中'
					}
					let params = {
						meetId: this.data.id,
						timeMark: this.data.timeMark,
						forms,
						cardId: this.data.selectedCardId || '', // 传递卡项ID
						// 条款同意信息（用于审计追踪）
						bookingTermsAgreed: this.data.agreedTerms || false,
						bookingTermsTime: Date.now(),
						userTermsVersion: this._userTermsInfo ? this._userTermsInfo.version : 0,
						userTermsTime: this._userTermsInfo ? this._userTermsInfo.time : 0,
					}
					await cloudHelper.callCloudSumbit('meet/join', params, opts).then(res => {
						let content = '预约成功！'

						let joinId = res.data.joinId;
						wx.showModal({
							title: '温馨提示',
							showCancel: false,
							content,
							success() {
								let ck = () => {
									wx.reLaunch({
										url: pageHelper.fmtURLByPID('/pages/my/join_detail/my_join_detail?flag=home&id=' + joinId),
									})
								}
								ck();
							}
						})
					})
				} catch (err) {
					console.log(err);
				};
			}

			// 消息订阅
			await MeetBiz.subscribeMessageMeet(callback);

		}
	}
})