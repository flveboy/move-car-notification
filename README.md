# 部署在netlify

## 现在配置的是钉钉的webhook，需要配置
  - DINGTALK_SECRET
  - DINGTALK_WEBHOOK
    这两个可以在钉钉群机器人里面获取。

## 采用的是企业微信webhook消息通知。-------------需要认证，方案被pass掉了
### 需要在部署设置中，确保：
      - 构建命令：留空（因为我们没有构建步骤）
      - 发布目录：public
      - 在 "Advanced build settings" 中，添加环境变量：
      - CORP_ID: 您的企业ID
      - AGENT_ID: 您的应用AgentId
      - AGENT_SECRET: 您的应用Secret
      - TO_USER: 接收消息的用户（可选，默认为@all）

# 部署在 cloudflare
## 现在配置的是钉钉的webhook，需要配置
  - DINGTALK_SECRET
  - DINGTALK_WEBHOOK
    这两个可以在钉钉群机器人里面获取。

## 部署在cloudflare上时，结构要修改一下，要添加 functions 文件夹，把 js 放在 functions 文件夹。
