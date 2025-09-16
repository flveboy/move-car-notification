# 1. main分支部署在netlify
## 现在配置的是钉钉的webhook，需要配置
  - DINGTALK_SECRET
  - DINGTALK_WEBHOOK
    这两个可以在钉钉群机器人里面获取。

# 2. feature分支部署在 cloudflare
## 现在配置的是钉钉的webhook，需要配置
  - DINGTALK_SECRET
  - DINGTALK_WEBHOOK
    这两个可以在钉钉群机器人里面获取。

## 部署在cloudflare上时，结构要修改一下，要添加 functions 文件夹，把 js 放在 functions 文件夹。

# 3. feature_wecom部署在 cloudflare
## 配置的钉钉的webhook
  - DINGTALK_SECRET
  - DINGTALK_WEBHOOK
    这两个可以在钉钉群机器人里面获取。
## 企微的 webhook
  - WECOM_WEBHOOK 可以在企微群里面获取

# 4. feature_db版本加入了数据库，可以保存过个车辆注册数据
数据存入 cloudflare d1
