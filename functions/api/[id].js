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
