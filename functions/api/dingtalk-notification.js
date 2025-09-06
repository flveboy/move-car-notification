const axios = require('axios');
const crypto = require('crypto');

// 频率限制 - 每分钟最多10次
let requestTimestamps = [];
const MAX_REQUESTS_PER_MINUTE = 10;

// 增强脏话过滤系统 - 优化减少误判
        const profanityFilter = {
            // 基础脏话列表 - 更精确的匹配
            basePatterns: [
                '傻逼', '傻比', '傻毕', '傻笔', '傻币', '傻B', '傻b', '傻X', '傻x',
                'SB', 'sb', 'sB', 'Sb', 'SＢ', 'sｂ', 'ＳB', 'ｓb',
                '神经病', '脑残', '白痴', '混蛋', '王八蛋', '操', '妈的', '妈逼',
                'fuck', 'shit', 'asshole', 'bitch', 'dick', 'pussy', 'cunt', 'bastard',
                // 更精确的变体
                'sha逼', 'sha比', 'sha毕', 'sha笔', 'sha币', 'shaB', 'shab', 'shaX', 'shax',
                '傻bi', '傻b1', '傻8', '傻13'
            ],
            
            // 白名单 - 防止误判的词语
            whitelist: [
                '麻烦', '麻木', '麻将', '妈妈', '蚂蚁', '马路', '麻婆豆腐',
                '麻烦您', '麻烦你', '麻省理工', '麻烦事', '麻利', '麻风病'
            ],
            
            // 特殊字符变体映射
            charVariants: {
                'a': ['@', '4', 'ａ'],
                'b': ['8', 'ｂ', '⒝'],
                'c': ['ｃ', '⒞'],
                'd': ['ｄ'],
                'e': ['3', 'ｅ', '⒠'],
                'f': ['ｆ'],
                'g': ['9', 'ｇ'],
                'i': ['1', '!', 'ｉ', '丨'],
                'l': ['1', '｜', 'ｌ'],
                'o': ['0', 'ｏ', '〇'],
                's': ['5', 'ｓ', '＄'],
                't': ['7', 'ｔ', '＋'],
                'x': ['×', 'ｘ', '⒳', 'ⓧ', 'X', 'Ｘ'],
                'z': ['2', 'ｚ'],
                '傻': ['儍', 'sha'],
                '逼': ['屄', '比', '毕', '笔', '币', 'B', 'b'],
                '死': ['si', 'Ｓ', 'ｓ'],
                '妈': ['ma', 'ｍ', 'Ｍ'],
                '蛋': ['dan', 'Ｄ']
            },
            
            // 检查是否在白名单中
            isInWhitelist(text) {
                const lowerText = text.toLowerCase();
                for (const word of this.whitelist) {
                    if (lowerText.includes(word.toLowerCase())) {
                        return true;
                    }
                }
                return false;
            },
            
            // 生成所有可能的变体
            generateVariants(word) {
                const variants = new Set([word]);
                
                // 生成拼音变体
                if (word.includes('傻')) {
                    variants.add(word.replace('傻', 'sha'));
                }
                if (word.includes('逼')) {
                    variants.add(word.replace('逼', 'bi'));
                }
                if (word.includes('死')) {
                    variants.add(word.replace('死', 'si'));
                }
                if (word.includes('妈')) {
                    variants.add(word.replace('妈', 'ma'));
                }
                if (word.includes('蛋')) {
                    variants.add(word.replace('蛋', 'dan'));
                }
                
                // 生成特殊字符变体
                for (const [char, replacements] of Object.entries(this.charVariants)) {
                    if (word.includes(char)) {
                        for (const replacement of replacements) {
                            variants.add(word.replace(new RegExp(char, 'g'), replacement));
                        }
                    }
                }
                
                // 生成分隔符变体（添加特殊字符分隔）
                if (word.length > 1) {
                    const separators = ['', '-', '_', '.', '*', '&', '@', ' '];
                    for (const sep of separators) {
                        if (sep) {
                            // 在每个字符之间添加分隔符
                            let variant = '';
                            for (let i = 0; i < word.length; i++) {
                                variant += word[i];
                                if (i < word.length - 1) variant += sep;
                            }
                            variants.add(variant);
                        }
                    }
                }
                
                return Array.from(variants);
            },
            
            // 获取所有脏话模式
            getAllPatterns() {
                const patterns = [];
                
                for (const pattern of this.basePatterns) {
                    patterns.push(pattern); // 原始模式
                    patterns.push(pattern.toLowerCase()); // 小写
                    patterns.push(pattern.toUpperCase()); // 大写
                    
                    // 生成变体
                    const variants = this.generateVariants(pattern);
                    for (const variant of variants) {
                        patterns.push(variant);
                        patterns.push(variant.toLowerCase());
                        patterns.push(variant.toUpperCase());
                    }
                }
                
                return patterns;
            },
            
            // 检查文本是否包含脏话
            check(text) {
                // 首先检查白名单
                if (this.isInWhitelist(text)) {
                    return { hasProfanity: false };
                }
                
                const patterns = this.getAllPatterns();
                const lowerText = text.toLowerCase();
                
                for (const pattern of patterns) {
                    const patternLower = pattern.toLowerCase();
                    
                    // 使用更精确的匹配 - 要求模式作为独立词出现
                    const regex = new RegExp(`(^|[^a-zA-Z0-9\\u4e00-\\u9fff])${this.escapeRegExp(patternLower)}([^a-zA-Z0-9\\u4e00-\\u9fff]|$)`, 'i');
                    if (regex.test(text)) {
                        return {
                            hasProfanity: true,
                            word: pattern,
                            message: `检测到不当用语: ${pattern}`
                        };
                    }
                }
                
                return { hasProfanity: false };
            },
            
            // 转义正则表达式特殊字符
            escapeRegExp(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        };

// 检查频率限制
function checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1分钟前
    
    // 移除1分钟前的记录
    requestTimestamps = requestTimestamps.filter(time => time > oneMinuteAgo);
    
    // 检查是否超过限制
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        return false;
    }
    
    // 添加当前时间戳
    requestTimestamps.push(now);
    return true;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, phoneNumber } = JSON.parse(event.body);
      
    const profanityCheck = profanityFilter.check(message);
    if (profanityCheck.hasProfanity) {
        return {
            statusCode: 400,
            body: JSON.stringify({ 
                error: '消息包含不当内容',
                detail: profanityCheck.message
            })
        };
    }
      
  // 检查频率限制
        if (!checkRateLimit()) {
            return {
                statusCode: 429,
                body: JSON.stringify({ 
                    error: '发送频率过高，请稍后再试',
                    detail: '每分钟最多发送10条消息!'
                })
            };
        }
    
    // 从环境变量获取钉钉配置
    const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK;
    const DINGTALK_SECRET = process.env.DINGTALK_SECRET;
    
    if (!DINGTALK_WEBHOOK) {
      throw new Error('钉钉Webhook未配置');
    }
    
    // 生成签名（如果使用加签方式）
    let signedUrl = DINGTALK_WEBHOOK;
    if (DINGTALK_SECRET) {
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${DINGTALK_SECRET}`;
      const sign = crypto.createHmac('sha256', DINGTALK_SECRET)
                         .update(stringToSign)
                         .digest('base64');
      
      signedUrl = `${DINGTALK_WEBHOOK}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }
    
    // 构建钉钉消息
    const dingtalkMessage = {
      msgtype: "text",
      text: {
        content: `挪车通知: ${message}${phoneNumber ? `\n联系电话: ${phoneNumber}` : ''}`
      },
      at: {
        isAtAll: false // 不@所有人
      }
    };
    
    // 发送消息到钉钉
    const response = await axios.post(signedUrl, dingtalkMessage);
    
    if (response.data.errcode === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: '钉钉通知发送成功' 
        })
      };
    } else {
      throw new Error(`钉钉API错误: ${response.data.errmsg}`);
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '发送通知失败', 
        detail: error.message 
      })
    };
  }
};
