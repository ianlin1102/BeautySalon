/**
 * HTTP 请求认证中间件
 * 处理来自 Web 端的 HTTP 请求认证
 */

const jwt = require('jsonwebtoken')
const config = require('../../config/config.js')

// JWT 密钥（应该从环境变量或配置文件读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * 验证 HTTP 请求的 JWT Token
 * @param {Object} event - 云函数事件对象
 * @returns {Object} 认证结果 { success: boolean, adminId?: string, error?: string }
 */
function verifyHttpAuth(event) {
  try {
    // 1. 检查是否为 HTTP 请求
    if (!event.headers) {
      return { success: false, error: 'Not HTTP request' }
    }

    // 2. 从 headers 中获取 token
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) {
      return { success: false, error: 'Missing authorization header' }
    }

    // 3. 提取 Bearer token
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return { success: false, error: 'Invalid token format' }
    }

    // 4. 验证 JWT
    const decoded = jwt.verify(token, JWT_SECRET)

    // 5. 检查 token 是否过期
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return { success: false, error: 'Token expired' }
    }

    // 6. 返回认证信息
    return {
      success: true,
      adminId: decoded.adminId,
      adminName: decoded.adminName,
      adminType: decoded.adminType
    }
  } catch (error) {
    console.error('JWT 验证失败:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 生成 JWT Token（用于登录接口）
 * @param {Object} admin - 管理员信息
 * @returns {string} JWT token
 */
function generateToken(admin) {
  const payload = {
    adminId: admin._id,
    adminName: admin.ADMIN_NAME,
    adminType: admin.ADMIN_TYPE,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7天过期
  }

  return jwt.sign(payload, JWT_SECRET)
}

/**
 * 检查路由是否需要认证
 * @param {string} route - 路由名称
 * @returns {boolean}
 */
function requiresAuth(route) {
  // 不需要认证的路由白名单
  // 注意：这里的"认证"指的是管理员 JWT 认证
  // 用户身份认证通过 request body 中的 token 字段处理（在 application.js 中）
  const publicRoutes = [
    'admin/login',
    'admin/home',         // 管理员仪表盘统计数据（只读，无敏感操作）
    'admin/user_list',    // 用户列表（管理员查看，只读）
    'passport/register',  // 用户注册
    'home/setup_all',
    'card/list',
    'card/home_list',
    'card/view',
    'instructor/list',
    'instructor/detail',
    'checkin/rank_list',
    // meet 预约相关（Web 日历页面需要）
    'meet/list',
    'meet/list_by_day',
    'meet/list_by_week',
    'meet/list_has_day',
    'meet/before_join',   // 预约前检测（用户认证通过 token）
    'meet/join',          // 提交预约（用户认证通过 token）
    'meet/detail_for_join', // 预约详情
    // my 用户中心相关（用户认证通过 token）
    'my/my_join_list',    // 我的预约列表
    'my/my_join_detail',  // 我的预约详情
    'my/my_join_cancel',  // 取消预约
    'my/detail',          // 用户详情
    'my/edit_base',       // 编辑基本信息
    'my/my_card_list',    // 我的卡项列表
    'debug/check_checkin',
    'debug/check_user',
    'debug/test_groupcount',
    'test/update_user',       // 更新测试用户
    'test/create_user',       // 创建测试用户
    // 购买/充值相关（用户购买流程需要）
    'purchase/test',
    'purchase/create',
    'purchase/upload_proof',
    'purchase/detail',
    'purchase/my_orders'
  ]

  return !publicRoutes.includes(route)
}

module.exports = {
  verifyHttpAuth,
  generateToken,
  requiresAuth
}
