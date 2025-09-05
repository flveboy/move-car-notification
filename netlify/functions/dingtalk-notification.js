// netlify/functions/dingtalk-notification.js
const axios = require('axios');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, phoneNumber } = JSON.parse(event.body);
    
    // 从环境变量获取钉钉配置
    const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK;
    const DINGTALK_SECRET = process.env.DINGTALK_SECRET;
    
    if (!DINGTALK_WEBHOOK) {
      throw new Error('钉钉Webhook未配置');
    }
    
    // 生成签名（如果使用加签方式）
    let signedUrl = DINGTALK_WEBHOOK;
    if (DINGTALK_SECRET) {
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${DINGTALK_SECRET}`;
      const sign = crypto.createHmac('sha256', DINGTALK_SECRET)
                         .update(stringToSign)
                         .digest('base64');
      
      signedUrl = `${DINGTALK_WEBHOOK}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }
    
    // 构建钉钉消息
    const dingtalkMessage = {
      msgtype: "text",
      text: {
        content: `挪车通知: ${message}${phoneNumber ? `\n联系电话: ${phoneNumber}` : ''}`
      },
      at: {
        isAtAll: false // 不@所有人
      }
    };
    
    // 发送消息到钉钉
    const response = await axios.post(signedUrl, dingtalkMessage);
    
    if (response.data.errcode === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: '钉钉通知发送成功' 
        })
      };
    } else {
      throw new Error(`钉钉API错误: ${response.data.errmsg}`);
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '发送通知失败', 
        detail: error.message 
      })
    };
  }
};
