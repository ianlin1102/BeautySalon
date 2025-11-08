/**
 * Notes: 关于我们后台管理
 * Date: 2025-11-06
 */

const BaseAdminService = require('./base_admin_service.js');
const AboutModel = require('../../model/about_model.js');

class AdminAboutService extends BaseAdminService {

	/** 获取关于我们信息 */
	async getAboutDetail() {
		let fields = '*';

		// 使用固定ID 'about' 存储单条记录
		let where = {
			ABOUT_ID: 'about'
		};
		let about = await AboutModel.getOne(where, fields);

		// 如果不存在，返回空对象
		if (!about) {
			return {
				ABOUT_TITLE: '',
				ABOUT_CONTENT: [],
				ABOUT_PIC: []
			};
		}

		return about;
	}

	/** 更新关于我们信息 */
	async editAbout(adminId, {
		title = '',
		content = [],
		pic = []
	}) {
		console.log('========== editAbout 开始 ==========');
		console.log('adminId:', adminId);
		console.log('title:', title);
		console.log('content:', content);
		console.log('pic:', pic);

		// 检查记录是否存在
		let where = {
			ABOUT_ID: 'about'
		};
		let existing = await AboutModel.getOne(where);
		console.log('existing 记录:', existing);

		if (existing) {
			// 更新现有记录 - 不包含 ABOUT_ID（不可修改的字段）
			let data = {
				ABOUT_ADMIN_ID: adminId,
				ABOUT_TITLE: title,
				ABOUT_CONTENT: content,
				ABOUT_PIC: pic
			};
			console.log('准备更新的 data:', data);
			console.log('data 所有 keys:', Object.keys(data));
			console.log('existing._id:', existing._id);

			try {
				await AboutModel.edit(existing._id, data);
				console.log('更新成功');
				return { id: existing._id };
			} catch (e) {
				console.error('更新失败:', e);
				throw e;
			}
		} else {
			// 创建新记录 - 包含 ABOUT_ID
			let data = {
				ABOUT_ADMIN_ID: adminId,
				ABOUT_ID: 'about',
				ABOUT_TITLE: title,
				ABOUT_CONTENT: content,
				ABOUT_PIC: pic
			};
			console.log('准备插入的 data:', data);
			let id = await AboutModel.insert(data);
			console.log('插入成功, id:', id);
			return { id };
		}
	}

	/**
	 * 更新富文本内容
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateAboutContent({
		content // 富文本数组
	}) {
		// 查找记录
		let where = {
			ABOUT_ID: 'about'
		};
		let existing = await AboutModel.getOne(where);

		if (existing) {
			await AboutModel.edit(existing._id, {
				ABOUT_CONTENT: content
			});
		}

		// 返回内容中的图片URL
		let urls = [];
		if (content) {
			for (let item of content) {
				if (item.type === 'img' && item.val) {
					urls.push(item.val);
				}
			}
		}
		return urls;
	}

	/**
	 * 更新图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateAboutPic({
		imgList // 图片数组
	}) {
		// 查找记录
		let where = {
			ABOUT_ID: 'about'
		};
		let existing = await AboutModel.getOne(where);

		if (existing) {
			await AboutModel.edit(existing._id, {
				ABOUT_PIC: imgList
			});
		}

		// 返回图片URL数组
		return imgList || [];
	}
}

module.exports = AdminAboutService;
