// 使用 Cloudflare Workers 的语法
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { message } = await request.json();
    
    // 从环境变量获取配置
    const DINGTALK_WEBHOOK = env.DINGTALK_WEBHOOK;
    const DINGTALK_SECRET = env.DINGTALK_SECRET;
    
    if (!DINGTALK_WEBHOOK) {
      return new Response(JSON.stringify({ error: '钉钉Webhook未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 生成签名（如果使用加签方式）
    let signedUrl = DINGTALK_WEBHOOK;
    if (DINGTALK_SECRET) {
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${DINGTALK_SECRET}`;
      
      // 使用 Web Crypto API 进行 HMAC-SHA256 签名
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(DINGTALK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(stringToSign)
      );
      
      // 将签名转换为 base64
      const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
      signedUrl = `${DINGTALK_WEBHOOK}&timestamp=${timestamp}&sign=${encodeURIComponent(base64Signature)}`;
    }
    
    // 构建钉钉消息
    const dingtalkMessage = {
      msgtype: "text",
      text: {
        content: `挪车通知: ${message}`
      },
      at: {
        isAtAll: false
      }
    };
    
    // 发送消息到钉钉
    const response = await fetch(signedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dingtalkMessage)
    });
    
    const data = await response.json();
    
    if (data.errcode === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: '钉钉通知发送成功' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        error: '发送通知失败', 
        detail: data.errmsg 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '发送通知失败', 
      detail: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
