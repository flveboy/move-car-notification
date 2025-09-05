// netlify/functions/dingtalk-notification.js
const axios = require('axios');
const crypto = require('crypto');

// 频率限制 - 每分钟最多10次
let requestTimestamps = [];
const MAX_REQUESTS_PER_MINUTE = 10;

// 增强脏话过滤系统
        const profanityFilter = {
            // 基础脏话列表 - 添加更多变体
            basePatterns: [
                '傻逼', '傻比', '傻毕', '傻笔', '傻币', '傻B', '傻b', '傻X', '傻x',
                'SB', 'sb', 'sB', 'Sb', 'SＢ', 'sｂ', 'ＳB', 'ｓb',
                '神经病', '脑残', '白痴', '混蛋', '王八蛋', '操', '日', '妈的', '妈逼',
                'fuck', 'shit', 'asshole', 'bitch', 'dick', 'pussy', 'cunt', 'bastard',
                // 添加更多字母变体
                'sha逼', 'sha比', 'sha毕', 'sha笔', 'sha币', 'shaB', 'shab', 'shaX', 'shax',
                '傻bi', '傻b1', '傻8', '傻13', '傻13', '傻一三'
            ],
            
            // 特殊字符变体映射 - 增强X和x的变体
            charVariants: {
                'a': ['@', '4', 'ａ', 'ⓐ', '⒜', 'α', '🅐'],
                'b': ['8', 'ｂ', '⒝', 'ⓑ', 'ḃ', 'ḅ', 'ḇ', '🅑', '🅱'],
                'c': ['ｃ', '⒞', 'ⓒ', 'ḉ', '🅒'],
                'd': ['ｄ', '⒟', 'ⓓ', 'ḋ', 'ḍ', 'ḏ', 'ḑ', 'ḓ', '🅓'],
                'e': ['3', 'ｅ', '⒠', 'ⓔ', 'ḕ', 'ḗ', 'ḙ', 'ḛ', 'ḝ', '🅔'],
                'f': ['ｆ', '⒡', 'ⓕ', 'ḟ', '🅕'],
                'g': ['9', 'ｇ', '⒢', 'ⓖ', 'ḡ', '🅖'],
                'h': ['ｈ', '⒣', 'ⓗ', 'ḣ', 'ḥ', 'ḧ', 'ḩ', 'ḫ', '🅗'],
                'i': ['1', '!', 'ｉ', '⒤', 'ⓘ', 'ì', 'í', 'î', 'ï', '🅘'],
                'j': ['ｊ', '⒥', 'ⓙ', 'ĵ', '🅙'],
                'k': ['ｋ', '⒦', 'ⓚ', 'ḱ', 'ḳ', 'ḵ', '🅚'],
                'l': ['1', '｜', 'ｌ', '⒧', 'ⓛ', 'ḷ', 'ḹ', 'ḻ', 'ḽ', '🅛'],
                'm': ['ｍ', '⒨', 'ⓜ', 'ḿ', 'ṁ', 'ṃ', '🅜'],
                'n': ['ｎ', '⒩', 'ⓝ', 'ń', 'ṇ', 'ṅ', 'ṉ', 'ṋ', '🅝'],
                'o': ['0', 'ｏ', '〇', '⒪', 'ⓞ', 'ò', 'ó', 'ô', 'ö', '🅞'],
                'p': ['ｐ', '⒫', 'ⓟ', 'ṕ', 'ṗ', '🅟'],
                'q': ['ｑ', '⒬', 'ⓠ', 'ṙ', 'ṛ', 'ṝ', 'ṟ', '🅠'],
                'r': ['ｒ', '⒭', 'ⓡ', 'ṙ', 'ṛ', 'ṝ', 'ṟ', '🅡'],
                's': ['5', 'ｓ', '＄', '⒮', 'ⓢ', 'ś', 'ṣ', 'ṥ', 'ṧ', 'ṩ', '🅢'],
                't': ['7', 'ｔ', '＋', '⒯', 'ⓣ', 'ṫ', 'ṭ', 'ṯ', 'ṱ', '🅣'],
                'u': ['ｕ', '⒰', 'ⓤ', 'ù', 'ú', 'û', 'ü', '🅤'],
                'v': ['ｖ', '⒱', 'ⓥ', 'ṽ', 'ṿ', '🅥'],
                'w': ['ｗ', '⒲', 'ⓦ', 'ẁ', 'ẃ', 'ẅ', 'ẇ', 'ẉ', '🅦'],
                'x': ['×', '✕', '✖', '✗', '✘', 'ｘ', '⒳', 'ⓧ', 'ẋ', 'ẍ', '🅧', 'X', 'Ｘ'],
                'y': ['ｙ', '⒴', 'ⓨ', 'ẏ', 'ẙ', 'ỳ', 'ý', 'ỷ', 'ỹ', '🅨'],
                'z': ['2', 'ｚ', '⒵', 'ⓩ', 'ẑ', 'ẓ', 'ẕ', '🅩'],
                '傻': ['儍', 'sha', 'ＳＨＡ', 's h a'],
                '逼': ['屄', '比', '毕', '笔', '币', 'B', 'b', 'X', 'x', 'Ｂ', 'ｂ'],
                '死': ['si', 'Ｓ', 'ｓ', 'ＳＩ', 's i'],
                '妈': ['ma', 'ｍ', 'Ｍ', 'ＭＡ', 'm a'],
                '蛋': ['dan', 'Ｄ', 'ＤＡＮ', 'd a n']
            },
            
            // 生成所有可能的变体
            generateVariants(word) {
                const variants = new Set([word]);
                
                // 生成拼音变体
                if (word.includes('傻')) {
                    variants.add(word.replace('傻', 'sha'));
                    variants.add(word.replace('傻', 'SHA'));
                    variants.add(word.replace('傻', 's h a'));
                }
                if (word.includes('逼')) {
                    variants.add(word.replace('逼', 'bi'));
                    variants.add(word.replace('逼', 'BI'));
                    variants.add(word.replace('逼', 'b i'));
                }
                if (word.includes('死')) {
                    variants.add(word.replace('死', 'si'));
                    variants.add(word.replace('死', 'SI'));
                    variants.add(word.replace('死', 's i'));
                }
                if (word.includes('妈')) {
                    variants.add(word.replace('妈', 'ma'));
                    variants.add(word.replace('妈', 'MA'));
                    variants.add(word.replace('妈', 'm a'));
                }
                if (word.includes('蛋')) {
                    variants.add(word.replace('蛋', 'dan'));
                    variants.add(word.replace('蛋', 'DAN'));
                    variants.add(word.replace('蛋', 'd a n'));
                }
                
                // 生成特殊字符变体
                for (const [char, replacements] of Object.entries(this.charVariants)) {
                    if (word.includes(char)) {
                        for (const replacement of replacements) {
                            variants.add(word.replace(new RegExp(char, 'g'), replacement));
                            // 添加大小写变体
                            variants.add(word.replace(new RegExp(char, 'g'), replacement.toLowerCase()));
                            variants.add(word.replace(new RegExp(char, 'g'), replacement.toUpperCase()));
                        }
                    }
                }
                
                // 生成分隔符变体（添加特殊字符分隔）
                if (word.length > 1) {
                    const separators = ['', '-', '_', '.', '*', '&', '@', ' ', '~', '^', '%'];
                    for (const sep of separators) {
                        if (sep) {
                            // 在每个字符之间添加分隔符
                            let variant = '';
                            for (let i = 0; i < word.length; i++) {
                                variant += word[i];
                                if (i < word.length - 1) variant += sep;
                            }
                            variants.add(variant);
                            
                            // 添加大小写变体
                            variants.add(variant.toLowerCase());
                            variants.add(variant.toUpperCase());
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
                const patterns = this.getAllPatterns();
                const lowerText = text.toLowerCase();
                
                for (const pattern of patterns) {
                    // 使用更严格的匹配
                    const patternLower = pattern.toLowerCase();
                    
                    // 检查精确匹配或作为单词的一部分
                    if (lowerText.includes(patternLower)) {
                        return {
                            hasProfanity: true,
                            word: pattern,
                            message: `检测到不当用语: ${pattern}`
                        };
                    }
                    
                    // 检查使用空格或标点分隔的情况
                    const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${patternLower}(\\s|[^a-zA-Z0-9]|$)`, 'i');
                    if (regex.test(text)) {
                        return {
                            hasProfanity: true,
                            word: pattern,
                            message: `检测到不当用语: ${pattern}`
                        };
                    }
                }
                
                return { hasProfanity: false };
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
