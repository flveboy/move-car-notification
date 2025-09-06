// 增强的钉钉通知函数，包含错误处理和日志
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // 添加 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    // 解析请求体
    let message;
    try {
      const body = await request.json();
      message = body.message;
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: '无效的请求体',
        detail: '请提供有效的JSON数据'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 检查消息内容
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ 
        error: '消息内容不能为空',
        detail: '请提供有效的消息内容'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 从环境变量获取配置
    const DINGTALK_WEBHOOK = env.DINGTALK_WEBHOOK;
    const DINGTALK_SECRET = env.DINGTALK_SECRET;
    
    if (!DINGTALK_WEBHOOK) {
      return new Response(JSON.stringify({ 
        error: '钉钉Webhook未配置',
        detail: '请在环境变量中设置DINGTALK_WEBHOOK'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 生成签名（如果使用加签方式）
    let signedUrl = DINGTALK_WEBHOOK;
    if (DINGTALK_SECRET) {
      try {
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
        const signatureArray = new Uint8Array(signature);
        let base64Signature = '';
        for (let i = 0; i < signatureArray.length; i++) {
          base64Signature += String.fromCharCode(signatureArray[i]);
        }
        base64Signature = btoa(base64Signature);
        
        signedUrl = `${DINGTALK_WEBHOOK}&timestamp=${timestamp}&sign=${encodeURIComponent(base64Signature)}`;
      } catch (signError) {
        console.error('签名生成失败:', signError);
        return new Response(JSON.stringify({ 
          error: '签名生成失败',
          detail: signError.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
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
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } else {
      console.error('钉钉API错误:', data);
      return new Response(JSON.stringify({ 
        error: '发送通知失败', 
        detail: data.errmsg || '未知错误'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } catch (error) {
    console.error('服务器错误:', error);
    return new Response(JSON.stringify({ 
      error: '服务器内部错误', 
      detail: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
