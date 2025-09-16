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
