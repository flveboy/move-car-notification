export async function onRequestGet(context) {
  const { env, request } = context;
  
  try {
    const url = new URL(request.url);
    const vehicleId = url.searchParams.get('vehicle_id');
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT n.*, v.plate_number 
      FROM notifications n
      LEFT JOIN vehicles v ON n.vehicle_id = v.id
    `;
    let countQuery = `SELECT COUNT(*) as total FROM notifications n`;
    
    let params = [];
    let countParams = [];
    
    if (vehicleId) {
      query += ` WHERE n.vehicle_id = ?`;
      countQuery += ` WHERE n.vehicle_id = ?`;
      params.push(vehicleId);
      countParams.push(vehicleId);
    }
    
    query += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // 获取通知记录
    const notifications = await env.DB.prepare(query).bind(...params).all();
    
    // 获取总数
    const totalResult = await env.DB.prepare(countQuery).bind(...countParams).first();
    const total = totalResult.total;
    
    return new Response(JSON.stringify({
      notifications: notifications.results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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
