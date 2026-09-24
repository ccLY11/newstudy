FROM node:18-slim

WORKDIR /app

# 安装依赖
COPY package.json ./
RUN npm install --production

# 复制项目文件
COPY . .

# Hugging Face Spaces 默认端口
ENV PORT=7860
EXPOSE 7860

# 启动服务
CMD ["node", "server/index.js"]
