export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    // 获取车辆总数
    const totalVehicles = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM vehicles"
    ).first().then(row => row.count);

    // 获取今日通知次数（需要根据实际通知记录表统计）
    const todayNotifications = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE date(created_at) = date('now')"
    ).first().then(row => row.count || 0);

    // 获取本月通知次数
    const monthNotifications = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    ).first().then(row => row.count || 0);

    // 待审核车辆（如果有审核功能）
    const pendingVehicles = 0;

    return new Response(JSON.stringify({
      totalVehicles,
      todayNotifications,
      monthNotifications,
      pendingVehicles
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
