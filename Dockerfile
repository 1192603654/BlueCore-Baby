# 使用官方 Python 轻量级基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装（利用 Docker 缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 复制项目代码
COPY . .

# 暴露端口（微信云托管默认监听 80 端口，可通过环境变量 PORT 覆盖）
ENV PORT=80
EXPOSE 80

# 使用 Gunicorn 启动 Flask 应用，适用于生产环境
# 注意：Flask 实例在 backend.main 中的变量名为 app
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.main:app
