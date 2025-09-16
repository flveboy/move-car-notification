// /functions/api/send-notification.js
import { sendAllNotifications } from '../utils/notifications.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { vehicleId, message } = await request.json();
    
    // 验证输入
    if (!vehicleId || !message) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "缺少必要参数: vehicleId 或 message"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 检查车辆是否存在
    const vehicle = await env.DB.prepare(
      "SELECT id FROM vehicles WHERE id = ?"
    ).bind(vehicleId).first();
    
    if (!vehicle) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "车辆不存在"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 发送所有通知
    const results = await sendAllNotifications(env, vehicleId, message);
    
    // 检查是否有成功发送的通知
    const hasSuccess = results.some(result => result.success);
    
    return new Response(JSON.stringify({
      success: hasSuccess,
      results: results
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
