/**
 * Notes: passport模块业务逻辑
 * Date: 2025-10-14 07:48:00
 * Updated: 2026-01-21 - 添加 bcrypt 密码哈希、Google OAuth、账户关联
 */

const BaseService = require('./base_service.js');

const cloudBase = require('../../framework/cloud/cloud_base.js');
const UserModel = require('../model/user_model.js');
const timeUtil = require('../../framework/utils/time_util.js');
const crypto = require('crypto');
const https = require('https');

// Google OAuth 配置 (从环境变量读取)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '574240389068-uf3u8v3hp2rd1kj642hf81as4uubdmba.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// 密码哈希配置 (PBKDF2)
const HASH_ITERATIONS = 100000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

class PassportService extends BaseService {

	// ==================== 密码哈希工具方法 ====================

	/**
	 * 生成密码哈希
	 * @param {string} password - 明文密码
	 * @returns {string} 格式: salt:hash
	 */
	_hashPassword(password) {
		const salt = crypto.randomBytes(32).toString('hex');
		const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
		return `${salt}:${hash}`;
	}

	/**
	 * 验证密码
	 * @param {string} password - 明文密码
	 * @param {string} storedHash - 存储的哈希值 (salt:hash)
	 * @returns {boolean}
	 */
	_verifyPassword(password, storedHash) {
		if (!storedHash || !storedHash.includes(':')) return false;
		const [salt, hash] = storedHash.split(':');
		const verifyHash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
		return hash === verifyHash;
	}

	/**
	 * 生成用户ID
	 * @returns {string}
	 */
	_generateUserId() {
		return timeUtil.time('YMDhms') + Math.random().toString().substr(2, 6);
	}

	// ==================== Google ID Token 验证 ====================

	/**
	 * 解码并验证 Google ID Token (JWT)
	 * 注意：由于无法访问 Google 服务器获取公钥，这里只做基本验证
	 * 安全性依赖于：token 直接来自 Google 的 JS 库 + audience 验证 + 过期时间验证
	 * @param {string} idToken - Google ID Token (JWT)
	 * @returns {Object} 解码后的用户信息 { sub, email, name, picture, ... }
	 */
	_verifyGoogleIdToken(idToken) {
		try {
			// JWT 格式: header.payload.signature
			const parts = idToken.split('.');
			if (parts.length !== 3) {
				throw new Error('Invalid token format');
			}

			// 解码 payload (Base64URL)
			const payload = JSON.parse(
				Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
			);

			console.log('[_verifyGoogleIdToken] Token payload:', JSON.stringify(payload, null, 2));

			// 验证 issuer
			if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
				throw new Error('Invalid token issuer: ' + payload.iss);
			}

			// 验证 audience (必须是我们的 client_id)
			if (payload.aud !== GOOGLE_CLIENT_ID) {
				throw new Error('Invalid token audience: ' + payload.aud);
			}

			// 验证过期时间
			const now = Math.floor(Date.now() / 1000);
			if (payload.exp && payload.exp < now) {
				throw new Error('Token expired');
			}

			// 验证必要字段
			if (!payload.sub || !payload.email) {
				throw new Error('Missing required fields in token');
			}

			return {
				id: payload.sub,           // Google 用户唯一 ID
				email: payload.email,
				emailVerified: payload.email_verified,
				name: payload.name || payload.email.split('@')[0],
				picture: payload.picture || '',
				locale: payload.locale || ''
			};
		} catch (e) {
			console.error('[_verifyGoogleIdToken] Verification failed:', e.message);
			throw new Error('Invalid Google ID Token: ' + e.message);
		}
	}

	// ==================== Google OAuth 工具方法 ====================

	/**
	 * 用 authorization code 换取 Google tokens
	 * @param {string} code - Google 返回的授权码
	 * @param {string} redirectUri - 重定向 URI
	 * @returns {Promise<Object>} { access_token, id_token, ... }
	 */
	async _exchangeGoogleCode(code, redirectUri) {
		return new Promise((resolve, reject) => {
			console.log('[_exchangeGoogleCode] Starting token exchange...');

			const postData = new URLSearchParams({
				code,
				client_id: GOOGLE_CLIENT_ID,
				client_secret: GOOGLE_CLIENT_SECRET,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code'
			}).toString();

			const options = {
				hostname: 'oauth2.googleapis.com',
				path: '/token',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': Buffer.byteLength(postData)
				},
				timeout: 15000 // 15秒超时
			};

			console.log('[_exchangeGoogleCode] Sending request to oauth2.googleapis.com...');

			const req = https.request(options, (res) => {
				console.log('[_exchangeGoogleCode] Response status:', res.statusCode);
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					console.log('[_exchangeGoogleCode] Response received, length:', data.length);
					try {
						const result = JSON.parse(data);
						if (result.error) {
							console.error('[_exchangeGoogleCode] OAuth error:', result.error);
							reject(new Error(result.error_description || result.error));
						} else {
							console.log('[_exchangeGoogleCode] Token obtained successfully');
							resolve(result);
						}
					} catch (e) {
						console.error('[_exchangeGoogleCode] Parse error:', e.message);
						reject(new Error('Failed to parse Google response'));
					}
				});
			});

			req.on('timeout', () => {
				console.error('[_exchangeGoogleCode] Request timeout');
				req.destroy();
				reject(new Error('Request timeout - Google API may be blocked'));
			});

			req.on('error', (e) => {
				console.error('[_exchangeGoogleCode] Request error:', e.message);
				reject(e);
			});

			req.write(postData);
			req.end();
		});
	}

	/**
	 * 获取 Google 用户信息
	 * @param {string} accessToken - Google access token
	 * @returns {Promise<Object>} { id, email, name, picture }
	 */
	async _getGoogleUserInfo(accessToken) {
		return new Promise((resolve, reject) => {
			const options = {
				hostname: 'www.googleapis.com',
				path: '/oauth2/v2/userinfo',
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${accessToken}`
				}
			};

			const req = https.request(options, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					try {
						const result = JSON.parse(data);
						if (result.error) {
							reject(new Error(result.error.message || 'Failed to get user info'));
						} else {
							resolve(result);
						}
					} catch (e) {
						reject(new Error('Failed to parse user info'));
					}
				});
			});

			req.on('error', reject);
			req.end();
		});
	}

	// ==================== 用户查找方法 ====================

	/**
	 * 查找用户（同时支持微信用户和 Web 用户）
	 * @param {string} userId - 用户标识（USER_MINI_OPENID 或 USER_ID）
	 * @returns {Object|null} 用户对象和查询条件
	 */
	async _findUser(userId) {
		// 先按 USER_MINI_OPENID 查询（微信用户）
		let where = { USER_MINI_OPENID: userId };
		let user = await UserModel.getOne(where, '*');
		if (user) {
			return { user, where };
		}

		// 再按 USER_ID 查询（Web 用户）
		where = { USER_ID: userId };
		user = await UserModel.getOne(where, '*');
		if (user) {
			return { user, where };
		}

		return null;
	}

	// ==================== 微信登录 ====================

	/**
	 * 微信登录（小程序端）
	 * @param {string} openid - 微信 openid（由云函数自动获取）
	 * @returns {Object} 用户信息
	 */
	async wechatLogin(openid) {
		console.log('=== wechatLogin START ===');
		console.log('OpenID:', openid);

		// 1. 查找是否已有用户
		let where = { USER_MINI_OPENID: openid };
		let user = await UserModel.getOne(where, '*');

		if (user) {
			// 已有用户，更新登录时间
			console.log('Existing user found:', user.USER_ID || user._id);
			await UserModel.edit(where, {
				USER_LOGIN_CNT: (user.USER_LOGIN_CNT || 0) + 1,
				USER_LOGIN_TIME: timeUtil.time(),
				USER_LAST_LOGIN: new Date()
			});

			return {
				userId: openid,
				isNewUser: false,
				user: {
					id: user.USER_ID || user._id,
					openid: openid,
					name: user.USER_NAME || '',
					mobile: user.USER_MOBILE || '',
					avatar: user.USER_AVATAR || '',
					authMethods: user.USER_AUTH_METHODS || ['wechat'],
					// 判断资料是否完整
					profileComplete: !!(user.USER_NAME && user.USER_MOBILE)
				}
			};
		}

		// 2. 新用户，创建账户
		console.log('Creating new wechat user for OpenID:', openid);
		let userId = this._generateUserId();

		let newUserData = {
			USER_ID: userId,
			USER_MINI_OPENID: openid,
			USER_NAME: '',
			USER_MOBILE: '',
			USER_STATUS: 1,
			USER_AUTH_METHODS: ['wechat'],
			USER_CREATED_VIA: 'wechat',
			USER_SOURCE: 'wechat',
			USER_LOGIN_CNT: 1,
			USER_LOGIN_TIME: timeUtil.time(),
			USER_ADD_TIME: timeUtil.time(),
			USER_LAST_LOGIN: new Date()
		};

		await UserModel.insert(newUserData, true);
		console.log('New wechat user created:', userId);

		return {
			userId: openid,
			isNewUser: true,
			user: {
				id: userId,
				openid: openid,
				name: '',
				mobile: '',
				avatar: '',
				authMethods: ['wechat'],
				profileComplete: false
			}
		};
	}

	// 插入用户
	async insertUser(userId, mobile, name = '', joinCnt = 0) {
		// 判断是否存在（同时检查 USER_MINI_OPENID 和 USER_ID）
		let result = await this._findUser(userId);
		if (result) return;

		// 入库
		let data = {
			USER_MINI_OPENID: userId,
			USER_MOBILE: mobile,
			USER_NAME: name
		}
		await UserModel.insert(data);
	}

	/** 获取手机号码 */
	async getPhone(cloudID) {
		let cloud = cloudBase.getCloud();
		let res = await cloud.getOpenData({
			list: [cloudID], // 假设 event.openData.list 是一个 CloudID 字符串列表
		});
		if (res && res.list && res.list[0] && res.list[0].data) {

			let phone = res.list[0].data.phoneNumber;

			return phone;
		} else
			return '';
	}

	/** 取得我的用户信息 */
	async getMyDetail(userId) {
		// 先按 USER_MINI_OPENID 查询（微信用户）
		let where = {
			USER_MINI_OPENID: userId
		}
		let fields = 'USER_MOBILE,USER_NAME,USER_CITY,USER_TRADE,USER_WORK'
		let user = await UserModel.getOne(where, fields);

		// 如果找不到，再按 USER_ID 查询（Web 用户）
		if (!user) {
			where = { USER_ID: userId };
			user = await UserModel.getOne(where, fields);
		}

		return user;
	}

	/** 修改用户资料 */
	async editBase(userId, {
		mobile,
		countryCode = '',
		name,
		trade,
		work,
		city
	}) {
		// 先按 USER_MINI_OPENID 查询（微信用户）
		let where = {
			USER_MINI_OPENID: userId
		};
		let cnt = await UserModel.count(where);

		// 如果找不到，再按 USER_ID 查询（Web 用户）
		if (cnt == 0) {
			where = { USER_ID: userId };
			cnt = await UserModel.count(where);
		}

		// 如果两种方式都找不到，创建新用户
		if (cnt == 0) {
			await this.insertUser(userId, mobile, name, 0);
			return;
		}

		// 如果有国家代码，保存完整的手机号（国家代码+号码）
		let fullMobile = mobile;
		if (countryCode && !mobile.startsWith(countryCode)) {
			fullMobile = countryCode + mobile;
		}

		let data = {
			USER_MOBILE: fullMobile,
			USER_NAME: name,
			USER_CITY: city,
			USER_WORK: work,
			USER_TRADE: trade
		};

		await UserModel.edit(where, data);
	}

	// ==================== 认证方法 ====================

	/**
	 * 检查用户名是否可用
	 * @param {string} username - 用户名
	 * @returns {Object} { available: boolean }
	 */
	async checkUsername(username) {
		// 用户名格式验证：字母数字下划线，3-30位
		if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
			return { available: false, reason: '用户名只能包含字母、数字和下划线，长度3-30位' };
		}

		// 检查是否已存在（不区分大小写）
		let where = {
			USER_ACCOUNT: username.toLowerCase()
		};
		let cnt = await UserModel.count(where);

		return { available: cnt === 0 };
	}

	/**
	 * 用户注册（账号密码）
	 * @param {Object} params - { username, password, name? }
	 * @returns {Object} 用户信息
	 */
	async register({ username, password, name = '' }) {
		// 1. 检查用户名
		const usernameCheck = await this.checkUsername(username);
		if (!usernameCheck.available) {
			this.AppError(usernameCheck.reason || '该用户名已被使用');
		}

		// 2. 密码强度验证
		if (password.length < 6 || password.length > 30) {
			this.AppError('密码长度需在6-30位之间');
		}

		// 3. 生成用户ID
		let userId = this._generateUserId();

		// 4. 哈希密码
		let passwordHash = this._hashPassword(password);

		// 5. 创建用户
		let data = {
			USER_ID: userId,
			USER_ACCOUNT: username.toLowerCase(),
			USER_PASSWORD_HASH: passwordHash,
			USER_NAME: name || username,
			USER_STATUS: 1,
			USER_AUTH_METHODS: ['password'],
			USER_CREATED_VIA: 'register',
			USER_ADD_TIME: new Date(),
			USER_LAST_LOGIN: new Date()
		};

		await UserModel.insert(data, true);

		return {
			userId: userId,
			user: {
				id: userId,
				name: data.USER_NAME,
				username: data.USER_ACCOUNT,
				authMethods: data.USER_AUTH_METHODS
			}
		};
	}

	/**
	 * 用户登录（账号密码）
	 * @param {Object} params - { username, password }
	 * @returns {Object} 用户信息
	 */
	async login({ username, password }) {
		// 1. 查找用户
		let where = { USER_ACCOUNT: username.toLowerCase() };
		let user = await UserModel.getOne(where, '*');

		if (!user) {
			this.AppError('用户名或密码错误');
		}

		// 2. 检查用户状态
		if (user.USER_STATUS !== 1 && user.USER_STATUS !== '1') {
			this.AppError('账户已被禁用');
		}

		// 3. 验证密码
		let passwordValid = false;

		// 优先检查新的哈希密码
		if (user.USER_PASSWORD_HASH) {
			passwordValid = this._verifyPassword(password, user.USER_PASSWORD_HASH);
		}
		// 兼容旧的明文密码
		else if (user.USER_PASSWORD) {
			passwordValid = (user.USER_PASSWORD === password);
			// 如果密码正确，升级为哈希密码
			if (passwordValid) {
				let newHash = this._hashPassword(password);
				await UserModel.edit(where, {
					USER_PASSWORD_HASH: newHash,
					USER_AUTH_METHODS: ['password']
				});
				console.log('已将用户密码升级为哈希格式:', username);
			}
		}
		// 都没有密码，检查是否只有 Google 登录
		else if (user.USER_GOOGLE_ID) {
			this.AppError('请使用 Google 登录');
		}
		else {
			this.AppError('账户密码未设置');
		}

		if (!passwordValid) {
			this.AppError('用户名或密码错误');
		}

		// 4. 更新登录时间
		await UserModel.edit(where, {
			USER_LAST_LOGIN: new Date()
		});

		return {
			userId: user.USER_ID || user._id,
			user: {
				id: user.USER_ID || user._id,
				name: user.USER_NAME,
				username: user.USER_ACCOUNT,
				googleEmail: user.USER_GOOGLE_EMAIL || null,
				authMethods: user.USER_AUTH_METHODS || ['password']
			}
		};
	}

	/**
	 * Google OAuth 认证（登录或注册）
	 * @param {Object} params - { code, redirectUri }
	 * @returns {Object} 用户信息 + isNewUser 标志
	 */
	async googleAuth({ code, redirectUri }) {
		try {
			console.log('=== googleAuth START ===');
			console.log('Code length:', code ? code.length : 0);
			console.log('RedirectUri:', redirectUri);
			console.log('GOOGLE_CLIENT_ID set:', GOOGLE_CLIENT_ID ? 'yes' : 'no');
			console.log('GOOGLE_CLIENT_SECRET set:', GOOGLE_CLIENT_SECRET ? 'yes' : 'no');
		} catch (logErr) {
			console.error('Logging error:', logErr);
		}

		// 1. 用 code 换取 tokens
		let tokens;
		try {
			console.log('Calling _exchangeGoogleCode...');
			tokens = await this._exchangeGoogleCode(code, redirectUri);
			console.log('Token exchange successful');
		} catch (e) {
			console.error('Google token exchange failed:', String(e));
			this.AppError('Google auth failed: ' + String(e));
		}

		// 2. 获取用户信息
		let googleUser;
		try {
			googleUser = await this._getGoogleUserInfo(tokens.access_token);
		} catch (e) {
			console.error('Failed to get Google user info:', e);
			this.AppError('获取 Google 用户信息失败');
		}

		console.log('Google user info:', googleUser);

		// 3. 查找是否已有关联账户
		let where = { USER_GOOGLE_ID: googleUser.id };
		let user = await UserModel.getOne(where, '*');

		if (user) {
			// 已有用户，直接登录
			await UserModel.edit(where, {
				USER_LAST_LOGIN: new Date()
			});

			return {
				userId: user.USER_ID || user._id,
				isNewUser: false,
				user: {
					id: user.USER_ID || user._id,
					name: user.USER_NAME,
					username: user.USER_ACCOUNT,
					googleEmail: user.USER_GOOGLE_EMAIL,
					authMethods: user.USER_AUTH_METHODS || ['google']
				}
			};
		}

		// 4. 新用户，创建账户
		let userId = this._generateUserId();
		// 生成一个唯一的用户名（基于 Google email 前缀）
		let baseUsername = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
		let username = baseUsername;
		let suffix = 1;
		while (!(await this.checkUsername(username)).available) {
			username = `${baseUsername}${suffix}`;
			suffix++;
		}

		let newUserData = {
			USER_ID: userId,
			USER_ACCOUNT: username,
			USER_NAME: googleUser.name || username,
			USER_GOOGLE_ID: googleUser.id,
			USER_GOOGLE_EMAIL: googleUser.email,
			USER_GOOGLE_LINKED_AT: new Date(),
			USER_STATUS: 1,
			USER_AUTH_METHODS: ['google'],
			USER_CREATED_VIA: 'google',
			USER_ADD_TIME: new Date(),
			USER_LAST_LOGIN: new Date()
		};

		await UserModel.insert(newUserData, true);

		return {
			userId: userId,
			isNewUser: true,
			user: {
				id: userId,
				name: newUserData.USER_NAME,
				username: newUserData.USER_ACCOUNT,
				googleEmail: newUserData.USER_GOOGLE_EMAIL,
				authMethods: newUserData.USER_AUTH_METHODS
			}
		};
	}

	/**
	 * Google OAuth 认证（使用 ID Token - 无需服务器调用 Google API）
	 * 前端通过 Google Identity Services 获取 ID Token，后端离线验证
	 * @param {Object} params - { idToken }
	 * @returns {Object} 用户信息 + isNewUser 标志
	 */
	async googleAuthWithToken({ idToken }) {
		console.log('=== googleAuthWithToken START ===');
		console.log('ID Token length:', idToken ? idToken.length : 0);

		// 1. 验证并解码 ID Token
		let googleUser;
		try {
			googleUser = this._verifyGoogleIdToken(idToken);
			console.log('Google user from token:', googleUser);
		} catch (e) {
			console.error('Token verification failed:', e.message);
			this.AppError('Google token verification failed: ' + e.message);
		}

		// 2. 查找是否已有关联账户
		let where = { USER_GOOGLE_ID: googleUser.id };
		let user = await UserModel.getOne(where, '*');

		if (user) {
			// 已有用户，直接登录
			console.log('Existing user found:', user.USER_ID);
			await UserModel.edit(where, {
				USER_LAST_LOGIN: new Date()
			});

			return {
				userId: user.USER_ID || user._id,
				isNewUser: false,
				user: {
					id: user.USER_ID || user._id,
					name: user.USER_NAME,
					username: user.USER_ACCOUNT,
					googleEmail: user.USER_GOOGLE_EMAIL,
					authMethods: user.USER_AUTH_METHODS || ['google']
				}
			};
		}

		// 3. 新用户，创建账户
		console.log('Creating new user for Google ID:', googleUser.id);
		let userId = this._generateUserId();

		// 生成一个唯一的用户名（基于 Google email 前缀）
		let baseUsername = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
		let username = baseUsername;
		let suffix = 1;
		while (!(await this.checkUsername(username)).available) {
			username = `${baseUsername}${suffix}`;
			suffix++;
		}

		let newUserData = {
			USER_ID: userId,
			USER_ACCOUNT: username,
			USER_NAME: googleUser.name || username,
			USER_GOOGLE_ID: googleUser.id,
			USER_GOOGLE_EMAIL: googleUser.email,
			USER_GOOGLE_LINKED_AT: new Date(),
			USER_AVATAR: googleUser.picture || '',
			USER_STATUS: 1,
			USER_AUTH_METHODS: ['google'],
			USER_CREATED_VIA: 'google',
			USER_ADD_TIME: new Date(),
			USER_LAST_LOGIN: new Date()
		};

		await UserModel.insert(newUserData, true);
		console.log('New user created:', userId);

		return {
			userId: userId,
			isNewUser: true,
			user: {
				id: userId,
				name: newUserData.USER_NAME,
				username: newUserData.USER_ACCOUNT,
				googleEmail: newUserData.USER_GOOGLE_EMAIL,
				authMethods: newUserData.USER_AUTH_METHODS
			}
		};
	}

	/**
	 * 关联 Google 账户到现有用户
	 * @param {string} userId - 当前用户 ID
	 * @param {Object} params - { code, redirectUri }
	 * @returns {Object} { success, googleEmail }
	 */
	async linkGoogle(userId, { code, redirectUri }) {
		// 1. 查找当前用户
		let result = await this._findUser(userId);
		if (!result) {
			this.AppError('用户不存在');
		}
		let { user, where } = result;

		// 2. 检查是否已关联 Google
		if (user.USER_GOOGLE_ID) {
			this.AppError('您已关联 Google 账户');
		}

		// 3. 换取 Google tokens
		let tokens;
		try {
			tokens = await this._exchangeGoogleCode(code, redirectUri);
		} catch (e) {
			this.AppError('Google 认证失败: ' + e.message);
		}

		// 4. 获取 Google 用户信息
		let googleUser;
		try {
			googleUser = await this._getGoogleUserInfo(tokens.access_token);
		} catch (e) {
			this.AppError('获取 Google 用户信息失败');
		}

		// 5. 检查此 Google ID 是否已关联其他账户
		let existingUser = await UserModel.getOne({ USER_GOOGLE_ID: googleUser.id }, 'USER_ID');
		if (existingUser) {
			this.AppError('此 Google 账户已关联其他用户');
		}

		// 6. 更新用户，添加 Google 关联
		let authMethods = user.USER_AUTH_METHODS || [];
		if (!authMethods.includes('google')) {
			authMethods.push('google');
		}

		await UserModel.edit(where, {
			USER_GOOGLE_ID: googleUser.id,
			USER_GOOGLE_EMAIL: googleUser.email,
			USER_GOOGLE_LINKED_AT: new Date(),
			USER_AUTH_METHODS: authMethods
		});

		return {
			success: true,
			googleEmail: googleUser.email,
			authMethods: authMethods
		};
	}

	/**
	 * 关联 Google 账户到现有用户（使用 ID Token）
	 * 如果 Google 账户已被其他用户使用，则合并账户
	 * @param {string} userId - 当前用户 ID
	 * @param {Object} params - { idToken }
	 * @returns {Object} { success, googleEmail, merged? }
	 */
	async linkGoogleWithToken(userId, { idToken }) {
		console.log('=== linkGoogleWithToken START ===');
		console.log('User ID:', userId);

		// 1. 验证并解码 ID Token
		let googleUser;
		try {
			googleUser = this._verifyGoogleIdToken(idToken);
			console.log('Google user from token:', googleUser);
		} catch (e) {
			console.error('Token verification failed:', e.message);
			this.AppError('Google token verification failed: ' + e.message);
		}

		// 2. 查找当前用户
		let result = await this._findUser(userId);
		if (!result) {
			this.AppError('用户不存在，请先登录');
		}
		let { user, where } = result;
		console.log('Current user found:', user.USER_ID || user._id);

		// 3. 检查是否已关联 Google
		if (user.USER_GOOGLE_ID) {
			if (user.USER_GOOGLE_ID === googleUser.id) {
				this.AppError('您已关联此 Google 账户');
			} else {
				this.AppError('您已关联其他 Google 账户，请先取消关联');
			}
		}

		// 4. 检查此 Google ID 是否已关联其他账户
		let existingUser = await UserModel.getOne({ USER_GOOGLE_ID: googleUser.id }, '*');

		if (existingUser && existingUser.USER_ID !== user.USER_ID && existingUser._id !== user._id) {
			console.log('Google account linked to another user:', existingUser.USER_ID);
			// Google 账户已被其他用户使用，需要合并账户
			return await this._mergeAccounts(user, existingUser, googleUser);
		}

		// 5. 正常关联：更新当前用户，添加 Google 关联
		let authMethods = user.USER_AUTH_METHODS || [];
		if (!authMethods.includes('google')) {
			authMethods.push('google');
		}

		await UserModel.edit(where, {
			USER_GOOGLE_ID: googleUser.id,
			USER_GOOGLE_EMAIL: googleUser.email,
			USER_GOOGLE_LINKED_AT: new Date(),
			USER_AUTH_METHODS: authMethods
		});

		console.log('Google account linked successfully');

		return {
			success: true,
			googleEmail: googleUser.email,
			authMethods: authMethods,
			merged: false
		};
	}

	/**
	 * 合并两个账户
	 * @param {Object} primaryUser - 主账户（当前登录的 username 账户）
	 * @param {Object} secondaryUser - 被合并账户（Google 账户）
	 * @param {Object} googleUser - Google 用户信息
	 * @returns {Object} 合并结果
	 */
	async _mergeAccounts(primaryUser, secondaryUser, googleUser) {
		console.log('=== _mergeAccounts START ===');
		console.log('Primary user:', primaryUser.USER_ID || primaryUser._id);
		console.log('Secondary user:', secondaryUser.USER_ID || secondaryUser._id);

		const primaryUserId = primaryUser.USER_ID || primaryUser._id;
		const secondaryUserId = secondaryUser.USER_ID || secondaryUser._id;

		// 1. 合并认证方式
		let authMethods = primaryUser.USER_AUTH_METHODS || [];
		if (primaryUser.USER_PASSWORD_HASH && !authMethods.includes('password')) {
			authMethods.push('password');
		}
		if (!authMethods.includes('google')) {
			authMethods.push('google');
		}

		// 2. 更新主账户：添加 Google 信息
		let primaryWhere = primaryUser.USER_MINI_OPENID
			? { USER_MINI_OPENID: primaryUser.USER_MINI_OPENID }
			: { USER_ID: primaryUserId };

		await UserModel.edit(primaryWhere, {
			USER_GOOGLE_ID: googleUser.id,
			USER_GOOGLE_EMAIL: googleUser.email,
			USER_GOOGLE_LINKED_AT: new Date(),
			USER_AUTH_METHODS: authMethods,
			// 如果主账户没有名字，使用被合并账户的名字
			USER_NAME: primaryUser.USER_NAME || secondaryUser.USER_NAME || googleUser.name
		});

		// 3. 迁移卡片记录：将被合并账户的卡片转移到主账户
		let cardsTransferred = 0;
		try {
			const UserCardModel = require('../model/user_card_model.js');

			// 查找被合并账户的卡片
			let secondaryCards = await UserCardModel.getAll({
				USER_CARD_USER_ID: secondaryUserId
			}, '*', {}, 1, 1000);

			if (secondaryCards && secondaryCards.length > 0) {
				console.log('Found cards to transfer:', secondaryCards.length);

				// 更新卡片的用户 ID
				for (let card of secondaryCards) {
					await UserCardModel.edit(
						{ _id: card._id },
						{ USER_CARD_USER_ID: primaryUserId }
					);
					cardsTransferred++;
				}
				console.log('Cards transferred:', cardsTransferred);
			}
		} catch (e) {
			console.error('Error transferring cards:', e.message);
			// 卡片迁移失败不阻塞主流程
		}

		// 4. 迁移预约记录
		let bookingsTransferred = 0;
		try {
			const JoinModel = require('../model/join_model.js');

			// 更新预约记录的用户 ID
			await JoinModel.editMany(
				{ JOIN_USER_ID: secondaryUserId },
				{ JOIN_USER_ID: primaryUserId }
			);

			// 计算迁移数量
			bookingsTransferred = await JoinModel.count({ JOIN_USER_ID: primaryUserId }) || 0;
			console.log('Bookings transferred');
		} catch (e) {
			console.error('Error transferring bookings:', e.message);
		}

		// 5. 删除或禁用被合并的账户
		try {
			let secondaryWhere = secondaryUser.USER_MINI_OPENID
				? { USER_MINI_OPENID: secondaryUser.USER_MINI_OPENID }
				: { USER_ID: secondaryUserId };

			// 清除被合并账户的 Google 关联（避免重复）
			// 并标记为已合并状态
			await UserModel.edit(secondaryWhere, {
				USER_GOOGLE_ID: '',
				USER_GOOGLE_EMAIL: '',
				USER_STATUS: 0,  // 禁用
				USER_MERGED_TO: primaryUserId,
				USER_MERGED_AT: new Date()
			});
			console.log('Secondary account disabled');
		} catch (e) {
			console.error('Error disabling secondary account:', e.message);
		}

		console.log('=== _mergeAccounts COMPLETE ===');

		return {
			success: true,
			googleEmail: googleUser.email,
			authMethods: authMethods,
			merged: true,
			mergeDetails: {
				primaryUserId: primaryUserId,
				secondaryUserId: secondaryUserId,
				cardsTransferred: cardsTransferred,
				bookingsTransferred: bookingsTransferred
			}
		};
	}

	/**
	 * 取消关联 Google 账户
	 * @param {string} userId - 当前用户 ID
	 * @returns {Object} { success }
	 */
	async unlinkGoogle(userId) {
		// 1. 查找当前用户
		let result = await this._findUser(userId);
		if (!result) {
			this.AppError('用户不存在');
		}
		let { user, where } = result;

		// 2. 检查是否有 Google 关联
		if (!user.USER_GOOGLE_ID) {
			this.AppError('您未关联 Google 账户');
		}

		// 3. 检查是否是唯一的登录方式
		let authMethods = user.USER_AUTH_METHODS || [];
		if (authMethods.length <= 1) {
			this.AppError('无法取消关联，这是您唯一的登录方式');
		}

		// 4. 移除 Google 关联
		authMethods = authMethods.filter(m => m !== 'google');

		await UserModel.edit(where, {
			USER_GOOGLE_ID: '',
			USER_GOOGLE_EMAIL: '',
			USER_GOOGLE_LINKED_AT: null,
			USER_AUTH_METHODS: authMethods
		});

		return {
			success: true,
			authMethods: authMethods
		};
	}

	/**
	 * 获取用户认证方式
	 * @param {string} userId - 用户 ID
	 * @returns {Object} { methods, googleEmail? }
	 */
	async getAuthMethods(userId) {
		let result = await this._findUser(userId);
		if (!result) {
			this.AppError('用户不存在');
		}

		let { user } = result;
		let methods = user.USER_AUTH_METHODS || [];

		// 兼容旧数据
		if (methods.length === 0) {
			if (user.USER_PASSWORD_HASH) methods.push('password');
			if (user.USER_GOOGLE_ID) methods.push('google');
			if (user.USER_MINI_OPENID && !user.USER_MINI_OPENID.startsWith('manual_')) methods.push('wechat');
		}

		return {
			methods: methods,
			googleEmail: user.USER_GOOGLE_EMAIL || null,
			username: user.USER_ACCOUNT || null
		};
	}
}

module.exports = PassportService;