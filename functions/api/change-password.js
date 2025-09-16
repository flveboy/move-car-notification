import bcrypt from 'bcryptjs';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { currentPassword, newPassword } = await request.json();
    const userId = context.userId; // 从中间件获取
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "未认证的用户" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 获取当前用户信息
    const user = await env.DB.prepare(
      "SELECT password_hash FROM users WHERE id = ?"
    ).bind(userId).first();
    
    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: "当前密码不正确" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 生成新密码哈希
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await env.DB.prepare(
      "UPDATE users SET password_hash = ? WHERE id = ?"
    ).bind(newPasswordHash, userId).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "密码修改成功" 
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