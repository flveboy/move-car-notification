export async function onRequestGet(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    // 获取车辆基本信息
    const vehicle = await env.DB.prepare(
      "SELECT * FROM vehicles WHERE id = ?"
    ).bind(id).first();

    if (!vehicle) {
      return new Response(JSON.stringify({ error: "车辆不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 获取通知配置
    const notificationConfigs = await env.DB.prepare(
      "SELECT * FROM notification_configs WHERE vehicle_id = ?"
    ).bind(id).all();

    // 将通知配置按平台组织
    const configs = {};
    notificationConfigs.results.forEach(config => {
      configs[config.platform] = config;
    });

    return new Response(JSON.stringify({ ...vehicle, notification_configs: configs }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;
  
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

    // 使用 D1 的事务 API
    const result = await env.DB.transaction(async (tx) => {
      // 更新车辆基本信息
      await tx.prepare(
        "UPDATE vehicles SET plate_number = ?, model = ?, color = ?, phone_number = ?, owner_name = ? WHERE id = ?"
      ).bind(plate_number, model, color, phone_number, owner_name || null, id).run();

      // 删除现有通知配置
      await tx.prepare(
        "DELETE FROM notification_configs WHERE vehicle_id = ?"
      ).bind(id).run();

      // 插入新的通知配置
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
      message: "车辆信息更新成功" 
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

export async function onRequestDelete(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    // 使用 D1 的事务 API
    const result = await env.DB.transaction(async (tx) => {
      // 删除通知配置
      await tx.prepare(
        "DELETE FROM notification_configs WHERE vehicle_id = ?"
      ).bind(id).run();

      // 删除车辆
      const deleteResult = await tx.prepare(
        "DELETE FROM vehicles WHERE id = ?"
      ).bind(id).run();

      return deleteResult;
    });

    if (result.success) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "车辆删除成功" 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "车辆不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
