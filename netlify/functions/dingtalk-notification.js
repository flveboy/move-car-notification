// netlify/functions/dingtalk-notification.js
const axios = require('axios');
const crypto = require('crypto');

// 频率限制 - 每分钟最多10次
let requestTimestamps = [];
const MAX_REQUESTS_PER_MINUTE = 10;

// 脏话过滤列表
const profanityList = [
    '傻逼', 'sb', '神经病', '脑残', '白痴', '混蛋', '王八蛋', '操', '日', '妈的',
    'fuck', 'shit', 'asshole', 'bitch', 'dick', 'pussy', 'cunt', 'bastard'
];

// 检查频率限制
function checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1分钟前
    
    // 移除1分钟前的记录
    requestTimestamps = requestTimestamps.filter(time => time > oneMinuteAgo);
    
    // 检查是否超过限制
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        return false;
    }
    
    // 添加当前时间戳
    requestTimestamps.push(now);
    return true;
}

// 检查脏话
function checkProfanity(text) {
    const lowerText = text.toLowerCase();
    for (const word of profanityList) {
        if (lowerText.includes(word.toLowerCase())) {
            return true;
        }
    }
    return false;
}


exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, phoneNumber } = JSON.parse(event.body);

  // 检查频率限制
        if (!checkRateLimit()) {
            return {
                statusCode: 429,
                body: JSON.stringify({ 
                    error: '发送频率过高，请稍后再试',
                    detail: '每分钟最多发送10条消息!'
                })
            };
        }
        
        // 检查脏话
        if (checkProfanity(message)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: '消息包含不当内容',
                    detail: '请文明用语!'
                })
            };
        }
    
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
