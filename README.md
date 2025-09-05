# 部署在netlify，采用的是企业微信webhook消息通知。
# 需要在部署设置中，确保：
构建命令：留空（因为我们没有构建步骤）
发布目录：public

在 "Advanced build settings" 中，添加环境变量：

CORP_ID: 您的企业ID

AGENT_ID: 您的应用AgentId

AGENT_SECRET: 您的应用Secret

TO_USER: 接收消息的用户（可选，默认为@all）
