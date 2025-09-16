export async function onRequestGet(context) {
  const { env } = context;
  try {
    // 获取车辆列表及通知配置状态
    const vehicles = await env.DB.prepare(`
      SELECT v.*, 
        MAX(CASE WHEN nc.platform = 'dingtalk' THEN nc.enabled ELSE 0 END) as dingtalk_enabled,
        MAX(CASE WHEN nc.platform = 'wecom' THEN nc.enabled ELSE 0 END) as wecom_enabled,
        MAX(CASE WHEN nc.platform = 'email' THEN nc.enabled ELSE 0 END) as email_enabled
      FROM vehicles v
      LEFT JOIN notification_configs nc ON v.id = nc.vehicle_id
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `).all();

    return new Response(JSON.stringify(vehicles.results), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    const {
      plate_number,
      model,
      color,
      phone_number,
      owner_name,
      dingtalk_enabled,
      dingtalk_webhook,
      dingtalk_keyword,
      dingtalk_sign_enabled,
      dingtalk_sign_secret,
      wecom_enabled,
      wecom_webhook,
      email_enabled,
      email_address
    } = data;

    // 验证必填字段
    if (!plate_number || !model || !color || !phone_number) {
      return new Response(JSON.stringify({ error: "请填写所有必填字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 生成唯一ID
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 使用 D1 的事务 API
    const result = await env.DB.transaction(async (tx) => {
      // 插入车辆基本信息
      await tx.prepare(
        "INSERT INTO vehicles (id, plate_number, model, color, phone_number, owner_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(id, plate_number, model, color, phone_number, owner_name || null, createdAt).run();

      // 插入通知配置
      if (dingtalk_enabled) {
        await tx.prepare(
          "INSERT INTO notification_configs (vehicle_id, platform, enabled, webhook_url, keyword, sign_enabled, sign_secret) VALUES (?, 'dingtalk', 1, ?, ?, ?, ?)"
        ).bind(id, dingtalk_webhook, dingtalk_keyword, dingtalk_sign_enabled ? 1 : 0, dingtalk_sign_secret || null).run();
      }

      if (wecom_enabled) {
        await tx.prepare(
          "INSERT INTO notification_configs (vehicle_id, platform, enabled, webhook_url) VALUES (?, 'wecom', 1, ?)"
        ).bind(id, wecom_webhook).run();
      }

      if (email_enabled) {
        await tx.prepare(
          "INSERT INTO notification_configs (vehicle_id, platform, enabled, email_address) VALUES (?, 'email', 1, ?)"
        ).bind(id, email_address).run();
      }

      return { success: true };
    });

    return new Response(JSON.stringify({ 
      success: true, 
      id,
      message: "车辆添加成功" 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
