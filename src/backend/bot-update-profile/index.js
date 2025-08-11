// 更新AI角色个性配置
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * event: {
 *   id: number, // 角色ID（必填）
 *   gender?: 'male'|'female'|'unknown',
 *   speakingStyle?: string, // 说话方式，如 gentle/professional/creative...
 *   identity?: string,      // 身份，如 teacher/engineer/psychologist...
 *   relationship?: string   // 角色与用户关系，如 mentor/friend/colleague...
 * }
 */
exports.main = async (event, context) => {
  try {
    const { id, gender, speakingStyle, identity, relationship } = event || {}
    if (!id) {
      return { success: false, code: 400, message: '缺少必要参数: id' }
    }

    const updateData = {}
    if (gender !== undefined) updateData.gender = gender
    if (speakingStyle !== undefined) updateData.speakingStyle = speakingStyle
    if (identity !== undefined) updateData.identity = identity
    if (relationship !== undefined) updateData.relationship = relationship
    updateData.updatedAt = new Date()

    const bots = await db.collection('Bots').where({ id }).get()
    if (!bots.data || bots.data.length === 0) {
      return { success: false, code: 404, message: '未找到对应的AI角色', data: { id } }
    }
    const _id = bots.data[0]._id
    const r = await db.collection('Bots').doc(_id).update({ data: updateData })
    const updated = (r.stats && (r.stats.updated || r.stats.updatedDocs)) || 0
    return { success: updated > 0, code: updated > 0 ? 200 : 304, message: updated > 0 ? 'AI个性更新成功' : '无变更', data: { id, update: updateData, updated } }
  } catch (error) {
    console.error('更新AI个性失败:', error)
    return { success: false, code: 500, message: '更新AI个性失败', data: { error: error.message } }
  }
}


