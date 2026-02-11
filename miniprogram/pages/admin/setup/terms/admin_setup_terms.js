const AdminBiz = require('../../../../biz/admin_biz.js');
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

// 默认条款模板
const DEFAULT_TEMPLATES = {
	user_terms: [
		{
			isHeader: true,
			header_zh: '《Dplus 用户协议与一般免责声明（德州适用）》',
			header_en: 'Dplus User Agreement & General Disclaimer (Texas Law Applies)',
			intro_zh: '本协议适用于位于美国德克萨斯州的 Dplus 舞社及其运营的线上平台（以下简称"Dplus"或"本平台"）。在注册、登录或使用本平台前，请您务必认真阅读并理解本协议的全部条款。一经您点击"同意"或实际使用本平台，即视为您自愿、明确并无条件接受本协议之全部约定。',
			intro_en: 'This Agreement applies to Dplus Dance Studio and its digital platforms operated in the State of Texas ("Dplus" or "the Platform"). By registering, accessing, or using the Platform, you acknowledge that you have read, understood, and voluntarily agreed to be bound by all terms herein.'
		},
		{
			title_zh: '1. 法律适用与管辖',
			title_en: '1. Governing Law & Jurisdiction',
			content_zh: '本协议受美国德克萨斯州法律管辖并依其解释。因本协议产生或与本协议有关的任何争议，应提交德州有管辖权的法院专属解决。',
			content_en: 'This Agreement shall be governed by and construed in accordance with the laws of the State of Texas. Any dispute shall be submitted exclusively to courts of competent jurisdiction in Texas.'
		},
		{
			title_zh: '2. 服务性质声明',
			title_en: '2. Nature of Services',
			content_zh: '本平台仅提供舞蹈课程信息、预约、卡项购买等技术与信息服务，不构成任何形式的医疗、健康或专业建议。',
			content_en: 'The Platform provides informational and technical services only and does not offer medical, health, or professional advice.'
		},
		{
			title_zh: '3. 用户自主风险承担',
			title_en: '3. Assumption of Risk',
			content_zh: '用户确认其系在完全自愿的情况下使用本平台，并自行评估其身体、心理及其他条件是否适合参与舞蹈及体能活动。\n因用户自身原因、健康状况、判断失误或操作不当所造成的任何损害，均由用户本人自行承担。',
			content_en: 'Users acknowledge that participation in dance and physical activities involves inherent risks. You voluntarily assume all risks related to your use of the Platform and participation in any activities.'
		},
		{
			title_zh: '4. 责任限制与免责',
			title_en: '4. Limitation of Liability',
			content_zh: '在适用法律允许的最大范围内，Dplus 对因用户使用本平台或参与线下活动所产生的任何直接、间接、附带、特殊或惩罚性损失不承担责任。',
			content_en: 'To the maximum extent permitted by law, Dplus shall not be liable for any direct, indirect, incidental, consequential, or punitive damages.'
		},
		{
			title_zh: '5. 信息真实性责任',
			title_en: '5. User Representations',
			content_zh: '用户应保证所提供的所有信息真实、准确、完整。如因信息不实导致任何后果，责任由用户自行承担。',
			content_en: 'You represent that all information you provide is accurate and truthful. You bear sole responsibility for any consequences arising from inaccurate or incomplete information.'
		}
	],
	card_terms: [
		{
			isHeader: true,
			header_zh: '《Dplus 卡项购买免责与权利放弃声明》',
			header_en: 'Dplus Card Purchase Waiver & Release',
			intro_zh: '本人在充分理解所有条款的前提下，自愿向 Dplus 舞社购买相关卡项，并特此确认：',
			intro_en: 'By purchasing any class card, membership, or package from Dplus, you acknowledge and agree:'
		},
		{
			title_zh: '1. 不可撤销购买',
			title_en: '1. Final Sale',
			content_zh: '本人确认卡项一经购买即为最终决定，除法律强制规定外，不予退款、不予延期、不予转让。',
			content_en: 'All purchases are final. No refunds, extensions, or transfers shall be granted except as required by law.'
		},
		{
			title_zh: '2. 规则确认与接受',
			title_en: '2. Acceptance of Terms',
			content_zh: '本人已充分知悉并理解卡项的适用范围、有效期限、使用限制及全部规则，并无异议。',
			content_en: 'You have reviewed and accepted all rules regarding validity period, usage limitations, and class applicability.'
		},
		{
			title_zh: '3. 自愿风险承担',
			title_en: '3. Personal Responsibility',
			content_zh: '因本人个人身体、时间安排、主观意愿变化等原因无法使用卡项的，相关损失由本人自行承担。',
			content_en: 'You assume all risk for non-use due to personal reasons, including health, schedule, or change of intent.'
		},
		{
			title_zh: '4. 责任豁免',
			title_en: '4. Release of Liability',
			content_zh: '在法律允许的最大范围内，本人放弃就卡项使用或未使用所引发的任何纠纷向 Dplus 主张责任的权利。',
			content_en: 'To the fullest extent permitted by law, you release Dplus from any claims arising from your purchase or use of the card.'
		}
	],
	booking_terms: [
		{
			isHeader: true,
			header_zh: '《Dplus 课程预约与线下参与免责及风险承担声明》',
			header_en: 'Dplus Class Participation Waiver & Assumption of Risk',
			intro_zh: '本人自愿预约并参加 Dplus 舞社课程或相关活动，并特此确认：',
			intro_en: 'By enrolling in or attending any Dplus class or activity, you agree:'
		},
		{
			title_zh: '1. 健康声明',
			title_en: '1. Health Representation',
			content_zh: '本人确认自身身体状况适合参与舞蹈及体能训练，不存在任何已知的运动禁忌症。',
			content_en: 'You represent that you are physically fit and have no condition preventing participation.'
		},
		{
			title_zh: '2. 风险自担',
			title_en: '2. Assumption of Risk',
			content_zh: '本人知晓舞蹈活动存在固有风险，包括但不限于拉伤、扭伤、跌倒等，并自愿承担全部风险。',
			content_en: 'You acknowledge that dance and physical activities involve inherent risks and voluntarily assume all such risks.'
		},
		{
			title_zh: '3. 行为责任',
			title_en: '3. Personal Conduct',
			content_zh: '如因本人未遵守教师指示或安全规范而产生损害，责任由本人自行承担。',
			content_en: 'You are responsible for following all instructions and safety rules.'
		},
		{
			title_zh: '4. 全面免责',
			title_en: '4. Release of Claims',
			content_zh: '在法律允许的最大范围内，本人放弃对 Dplus 及其员工、教练、代表的一切索赔权利。',
			content_en: 'To the fullest extent permitted by law, you release Dplus, its staff, and instructors from all liability.'
		}
	]
};

Page({
	data: {
		isLoad: false,
		isAdmin: false,
		currentTab: 'card_terms',
		sections: [],
		currentVersion: 0,
		// 缓存各类型的数据
		cachedData: {
			card_terms: null,
			booking_terms: null,
			user_terms: null
		}
	},

	onLoad: async function(options) {
		if (!AdminBiz.isAdmin(this)) return;
		this.setData({ isAdmin: true });
		await this._loadDetail();
	},

	onPullDownRefresh: async function() {
		// 清除缓存，重新加载
		this.setData({
			cachedData: {
				card_terms: null,
				booking_terms: null,
				user_terms: null
			}
		});
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	_loadDetail: async function() {
		if (!AdminBiz.isAdmin(this)) return;

		let currentTab = this.data.currentTab;

		// 检查缓存
		if (this.data.cachedData[currentTab]) {
			let cached = this.data.cachedData[currentTab];
			this.setData({
				isLoad: true,
				sections: cached.sections,
				currentVersion: cached.version || 0
			});
			return;
		}

		try {
			let opts = { title: 'bar' };
			let res = await cloudHelper.callCloudData('admin/terms_get', { type: currentTab }, opts);

			let sections = (res && res.sections && res.sections.length > 0)
				? this._migrateSections(res.sections)
				: DEFAULT_TEMPLATES[currentTab];

			let version = (res && res.version) || 0;

			// 更新缓存
			let cachedData = this.data.cachedData;
			cachedData[currentTab] = { sections: sections, version: version };

			this.setData({
				isLoad: true,
				sections: sections,
				currentVersion: version,
				cachedData: cachedData
			});
		} catch (err) {
			console.error('加载失败:', err);
			this.setData({
				isLoad: true,
				sections: DEFAULT_TEMPLATES[currentTab],
				currentVersion: 0
			});
		}
	},

	// 切换 Tab
	bindTabChange: async function(e) {
		let tab = e.currentTarget.dataset.tab;
		if (tab === this.data.currentTab) return;

		this.setData({ currentTab: tab, isLoad: false });
		await this._loadDetail();
	},

	// 修改小节标题（中文）
	bindTitleZhInput: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		sections[idx].title_zh = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 修改小节标题（英文）
	bindTitleEnInput: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		sections[idx].title_en = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 修改小节内容（中文）
	bindContentZhInput: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		sections[idx].content_zh = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 修改小节内容（英文）
	bindContentEnInput: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		sections[idx].content_en = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 修改 Header 标题（中文）
	bindHeaderZhInput: function(e) {
		let sections = this.data.sections;
		sections[0].header_zh = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 修改 Header 标题（英文）
	bindHeaderEnInput: function(e) {
		let sections = this.data.sections;
		sections[0].header_en = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 修改 Header 简介（中文）
	bindIntroZhInput: function(e) {
		let sections = this.data.sections;
		sections[0].intro_zh = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 修改 Header 简介（英文）
	bindIntroEnInput: function(e) {
		let sections = this.data.sections;
		sections[0].intro_en = e.detail.value;
		this.setData({ sections });
		this._clearCache();
	},

	// 添加小节
	bindAddSection: function() {
		let sections = this.data.sections;
		let num = sections.filter(s => !s.isHeader).length + 1;
		sections.push({
			title_zh: num + '. 新增条款',
			title_en: num + '. New Section',
			content_zh: '请输入中文条款内容',
			content_en: 'Enter English terms content'
		});
		this.setData({ sections });
		this._clearCache();
	},

	// 删除小节
	bindDelSection: function(e) {
		let idx = e.currentTarget.dataset.idx;
		let sections = this.data.sections;
		if (sections.length <= 1) {
			pageHelper.showModal('至少保留一个条款');
			return;
		}
		sections.splice(idx, 1);
		this.setData({ sections });
		this._clearCache();
	},

	// 恢复默认
	bindResetDefault: function() {
		let currentTab = this.data.currentTab;
		let tabName = {
			card_terms: '卡项条款',
			booking_terms: '预约条款',
			user_terms: '用户条款'
		}[currentTab];

		pageHelper.showConfirm(`确认恢复${tabName}为默认内容？当前编辑内容将丢失`, () => {
			this.setData({
				sections: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES[currentTab]))
			});
			this._clearCache();
		});
	},

	// 将旧格式 (title/content) 迁移为双语格式 (title_zh/title_en/content_zh/content_en)
	_migrateSections: function(sections) {
		return sections.map(item => {
			if (item.isHeader) return item;
			if (item.title && !item.title_zh) {
				item.title_zh = item.title;
			}
			if (item.content && !item.content_zh) {
				item.content_zh = item.content;
			}
			if (!item.title_en) item.title_en = '';
			if (!item.content_en) item.content_en = '';
			return item;
		});
	},

	// 清除当前 Tab 的缓存
	_clearCache: function() {
		let cachedData = this.data.cachedData;
		cachedData[this.data.currentTab] = null;
		this.setData({ cachedData });
	},

	// 提交保存
	bindFormSubmit: async function() {
		if (!AdminBiz.isAdmin(this)) return;

		let currentTab = this.data.currentTab;
		let sections = this.data.sections;

		// 校验
		for (let i = 0; i < sections.length; i++) {
			if (sections[i].isHeader) {
				if (!sections[i].header_zh || !sections[i].header_zh.trim()) {
					pageHelper.showModal('标题（中文）不能为空');
					return;
				}
				if (!sections[i].header_en || !sections[i].header_en.trim()) {
					pageHelper.showModal('标题（English）不能为空');
					return;
				}
				continue;
			}
			let titleZh = sections[i].title_zh || sections[i].title || '';
			let titleEn = sections[i].title_en || '';
			let contentZh = sections[i].content_zh || sections[i].content || '';
			let contentEn = sections[i].content_en || '';
			if (!titleZh.trim()) {
				pageHelper.showModal('第 ' + i + ' 个条款中文标题不能为空');
				return;
			}
			if (!titleEn.trim()) {
				pageHelper.showModal('第 ' + i + ' 个条款英文标题不能为空');
				return;
			}
			if (!contentZh.trim()) {
				pageHelper.showModal('第 ' + i + ' 个条款中文内容不能为空');
				return;
			}
			if (!contentEn.trim()) {
				pageHelper.showModal('第 ' + i + ' 个条款英文内容不能为空');
				return;
			}
		}

		let tabName = {
			card_terms: '卡项条款',
			booking_terms: '预约条款',
			user_terms: '用户条款'
		}[currentTab];

		// 用户条款保存时提示版本会更新
		if (currentTab === 'user_terms') {
			let confirmed = await new Promise(resolve => {
				pageHelper.showConfirm('保存用户条款后，版本号将自动+1，所有用户需要重新同意才能继续预约/购买。确认保存？', () => {
					resolve(true);
				}, () => {
					resolve(false);
				});
			});
			if (!confirmed) return;
		}

		try {
			let opts = { title: '保存中' };
			let res = await cloudHelper.callCloudSumbit('admin/terms_save', {
				type: currentTab,
				sections: sections
			}, opts);

			// 更新版本号（用户条款）
			if (currentTab === 'user_terms' && res && res.version) {
				this.setData({ currentVersion: res.version });
			}

			// 更新缓存
			let cachedData = this.data.cachedData;
			cachedData[currentTab] = {
				sections: sections,
				version: currentTab === 'user_terms' ? (res?.version || this.data.currentVersion + 1) : undefined
			};
			this.setData({ cachedData });

			pageHelper.showSuccToast(`${tabName}保存成功`);
		} catch (err) {
			console.error('保存失败:', err);
			pageHelper.showModal('保存失败，请重试');
		}
	}
});
