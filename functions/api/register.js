import bcrypt from 'bcryptjs';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { username, password } = await request.json();
    
    // 检查用户是否已存在
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE username = ?"
    ).bind(username).first();
    
    if (existingUser) {
      return new Response(JSON.stringify({ error: "用户名已存在" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 生成密码哈希
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const result = await env.DB.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)"
    ).bind(username, passwordHash).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "用户注册成功" 
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