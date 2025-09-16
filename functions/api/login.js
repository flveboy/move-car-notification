import bcrypt from 'bcryptjs';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { username, password } = await request.json();
    
    // 从数据库获取用户
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE username = ?"
    ).bind(username).first();
    
    if (!user) {
      return new Response(JSON.stringify({ error: "用户不存在" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: "密码错误" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 生成JWT令牌
    const token = generateJWT(user.id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      token,
      user: { id: user.id, username: user.username }
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

// 简单的JWT生成函数（实际应用中应使用更安全的实现）
function generateJWT(userId) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ 
    sub: userId, 
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24小时过期
  }));
  const signature = btoa("your-secret-key"); // 实际应用中应使用更安全的签名方法
  
  return `${header}.${payload}.${signature}`;
}
