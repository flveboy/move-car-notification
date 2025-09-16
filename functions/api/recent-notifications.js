export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    // 获取最近10条通知记录
    const notifications = await env.DB.prepare(`
      SELECT n.*, v.plate_number 
      FROM notifications n
      LEFT JOIN vehicles v ON n.vehicle_id = v.id
      ORDER BY n.created_at DESC
      LIMIT 10
    `).all();

    return new Response(JSON.stringify(notifications.results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 如果通知表不存在，返回空数组
    if (error.message.includes("no such table")) {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
