// /functions/utils/notifications.js

// 发送钉钉通知
async function sendDingTalkNotification(env, vehicleId, message, config) {
  try {
    // 构建请求
    const webhookUrl = config.webhook_url;
    const timestamp = Date.now();
    let sign = '';
    
    // 如果需要加签
    if (config.sign_enabled && config.sign_secret) {
      const stringToSign = `${timestamp}\n${config.sign_secret}`;
      const crypto = await import('crypto');
      sign = crypto.createHmac('sha256', config.sign_secret)
        .update(stringToSign)
        .digest('base64');
      
      // URL编码
      sign = encodeURIComponent(sign);
    }
    
    // 构建最终URL
    let finalUrl = webhookUrl;
    if (sign) {
      finalUrl += `&timestamp=${timestamp}&sign=${sign}`;
    }
    
    // 构建消息体
    const requestBody = {
      msgtype: "text",
      text: {
        content: `${config.keyword}：${message}`
      }
    };
    
    // 发送请求
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    // 记录通知结果
    await env.DB.prepare(
      "INSERT INTO notifications (vehicle_id, platform, message, status, error_message) VALUES (?, 'dingtalk', ?, ?, ?)"
    ).bind(
      vehicleId, 
      message, 
      result.errcode === 0 ? 'success' : 'failed',
      result.errcode !== 0 ? result.errmsg : null
    ).run();
    
    return {
      success: result.errcode === 0,
      error: result.errmsg
    };
  } catch (error) {
    // 记录错误
    await env.DB.prepare(
      "INSERT INTO notifications (vehicle_id, platform, message, status, error_message) VALUES (?, 'dingtalk', ?, 'failed', ?)"
    ).bind(vehicleId, message, error.message).run();
    
    return {
      success: false,
      error: error.message
    };
  }
}

// 发送企业微信通知
async function sendWecomNotification(env, vehicleId, message, config) {
  try {
    const webhookUrl = config.webhook_url;
    
    // 构建消息体
    const requestBody = {
      msgtype: "text",
      text: {
        content: message // 企业微信不需要关键词前缀
      }
    };
    
    // 发送请求
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    // 企业微信返回格式与钉钉不同
    const isSuccess = result.errcode === 0;
    
    // 记录通知结果
    await env.DB.prepare(
      "INSERT INTO notifications (vehicle_id, platform, message, status, error_message) VALUES (?, 'wecom', ?, ?, ?)"
    ).bind(
      vehicleId, 
      message, 
      isSuccess ? 'success' : 'failed',
      isSuccess ? null : result.errmsg
    ).run();
    
    return {
      success: isSuccess,
      error: result.errmsg
    };
  } catch (error) {
    // 记录错误
    await env.DB.prepare(
      "INSERT INTO notifications (vehicle_id, platform, message, status, error_message) VALUES (?, 'wecom', ?, 'failed', ?)"
    ).bind(vehicleId, message, error.message).run();
    
    return {
      success: false,
      error: error.message
    };
  }
}

// 发送邮件通知
async function sendEmailNotification(env, vehicleId, message, config) {
  try {
    const emailAddress = config.email_address;
    
    // 获取车辆信息用于邮件内容
    const vehicle = await env.DB.prepare(
      "SELECT plate_number, model, color FROM vehicles WHERE id = ?"
    ).bind(vehicleId).first();
    
    // 构建邮件内容
    const emailContent = {
      personalizations: [
        {
          to: [{ email: emailAddress }],
          subject: "挪车通知"
        }
      ],
      from: { email: "noreply@yourdomain.com", name: "扫码挪车服务" },
      content: [
        {
          type: "text/plain",
          value: `挪车通知：
          车牌号: ${vehicle.plate_number}
          车型: ${vehicle.model || '未知'}
          颜色: ${vehicle.color || '未知'}
          通知内容: ${message}
          时间: ${new Date().toLocaleString('zh-CN')}`
        }
      ]
    };
    
    // 发送邮件请求（使用SendGrid API）
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}` // 需要在环境变量中设置SendGrid API密钥
      },
      body: JSON.stringify(emailContent)
    });
    
    const isSuccess = response.status >= 200 && response.status < 300;
    
    // 记录通知结果
    await env.DB.prepare(
      "INSERT INTO notifications (vehicle_id, platform, message, status, error_message) VALUES (?, 'email', ?, ?, ?)"
    ).bind(
      vehicleId, 
      message, 
      isSuccess ? 'success' : 'failed',
      isSuccess ? null : `HTTP ${response.status}: ${await response.text()}`
    ).run();
    
    return {
      success: isSuccess,
      error: isSuccess ? null : `发送失败，状态码: ${response.status}`
    };
  } catch (error) {
    // 记录错误
    await env.DB.prepare(
      "INSERT INTO notifications (vehicle_id, platform, message, status, error_message) VALUES (?, 'email', ?, 'failed', ?)"
    ).bind(vehicleId, message, error.message).run();
    
    return {
      success: false,
      error: error.message
    };
  }
}

// 统一的通知发送函数
export async function sendNotification(env, vehicleId, message, platform, config) {
  switch (platform) {
    case 'dingtalk':
      return await sendDingTalkNotification(env, vehicleId, message, config);
    case 'wecom':
      return await sendWecomNotification(env, vehicleId, message, config);
    case 'email':
      return await sendEmailNotification(env, vehicleId, message, config);
    default:
      return {
        success: false,
        error: `未知的通知平台: ${platform}`
      };
  }
}

// 发送所有启用的通知
export async function sendAllNotifications(env, vehicleId, message) {
  try {
    // 获取车辆的通知配置
    const notificationConfigs = await env.DB.prepare(
      "SELECT * FROM notification_configs WHERE vehicle_id = ? AND enabled = 1"
    ).bind(vehicleId).all();
    
    const results = [];
    
    // 发送每种启用的通知
    for (const config of notificationConfigs.results) {
      const result = await sendNotification(
        env, 
        vehicleId, 
        message, 
        config.platform, 
        config
      );
      
      results.push({
        platform: config.platform,
        success: result.success,
        error: result.error
      });
    }
    
    return results;
  } catch (error) {
    return [{
      platform: 'unknown',
      success: false,
      error: error.message
    }];
  }
}
