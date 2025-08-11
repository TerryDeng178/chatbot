// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { avatarUrl } = event;

  if (!avatarUrl) {
    return {
      errCode: 1,
      errMsg: 'avatarUrl is required'
    };
  }

  try {
    await db.collection('users').where({
      _openid: wxContext.OPENID
    }).update({
      data: {
        avatarUrl: avatarUrl,
        updateTime: db.serverDate()
      }
    });

    return {
      errCode: 0,
      errMsg: 'success'
    };
  } catch (e) {
    console.error('update user profile failed', e);
    return {
      errCode: -1,
      errMsg: 'database error'
    };
  }
};