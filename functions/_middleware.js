// export async function onRequest(context) {
//   const { request, next, env } = context;

//   const url = new URL(request.url);
//   const pathname = url.pathname;

//   // 公开路由，不需要认证
//   const publicRoutes = [
//     '/api/login',
//     '/api/register',
//     '/api/send-notification'
    
//     , '/api/vehicles',
//     '/api/vehicle-stats',
//     '/api/notifications',
//     '/api/recent-notifications',
//     '/api/change-password'
//   ];

//   if (publicRoutes.some(route => pathname.startsWith(route))) {
//     return next();
//   }
  
//   // // 跳过登录和公开路由的验证
//   // if (request.url.includes('/api/login') || request.url.includes('/public/')) {
//   //   return next();
//   // }
  
//   // 验证JWT令牌
//   const authHeader = request.headers.get('Authorization');
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return new Response(JSON.stringify({ error: "未提供认证令牌" }), {
//       status: 401,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
  
//   const token = authHeader.substring(7);
//   try {
//     const payload = verifyJWT(token);
//     // 将用户ID添加到请求上下文中
//     context.userId = payload.sub;
//     return next();
//   } catch (error) {
//     return new Response(JSON.stringify({ error: "无效的认证令牌" }), {
//       status: 401,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }

// function verifyJWT(token) {
//   const parts = token.split('.');
//   if (parts.length !== 3) {
//     throw new Error("无效的令牌格式");
//   }
  
//   try {
//     const payload = JSON.parse(atob(parts[1]));
    
//     // 检查令牌是否过期
//     if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
//       throw new Error("令牌已过期");
//     }
    
//     return payload;
//   } catch (error) {
//     throw new Error("无效的令牌");
//   }
// }
