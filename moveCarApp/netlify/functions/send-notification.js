const axios = require('axios');

exports.handler = async (event, context) => {
  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    // 从环境变量获取配置
    const {
      CORP_ID,
      AGENT_ID,
      AGENT_SECRET,
      TO_USER = '@all'
    } = process.env;

    if (!CORP_ID || !AGENT_ID || !AGENT_SECRET) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration missing' })
      };
    }

    // 1. 获取access_token
    const tokenResponse = await axios.get(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${AGENT_SECRET}`
    );

    if (tokenResponse.data.errcode !== 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to get access token',
          detail: tokenResponse.data
        })
      };
    }

    const accessToken = tokenResponse.data.access_token;

    // 2. 发送消息
    const sendResponse = await axios.post(
      `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
      {
        touser: TO_USER,
        msgtype: 'text',
        agentid: AGENT_ID,
        text: {
          content: message
        }
      }
    );

    if (sendResponse.data.errcode === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data: sendResponse.data })
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to send message',
          detail: sendResponse.data
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};