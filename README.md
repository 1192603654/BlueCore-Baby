# BlueCore Baby (蓝核宝贝)

高端、简约、智能的育儿记录工具。基于 Python FastAPI 和微信原生小程序框架打造。

## 特色功能

*   **极简操作闭环**：无感静默登录 -> 一键创建宝宝 -> 底部快捷菜单秒速记录喂养/尿布/睡眠/疫苗。
*   **多宝宝管理**：支持多宝宝无缝切换，首页数据看板实时随之联动。
*   **莫兰迪美学 UI**：采用大圆角卡片流（Radius: 24rpx），配合奶油背景（#F8F5F2）与品牌柔彩色系，视觉极简大气。
*   **数据分析统计**：支持查看每个项目的历史明细，提供每日奶量/尿布统计与 AI 智能管家建议展示。
*   **商业化预埋**：已封装 `adManager.js`，后端下发控制开关，内置插屏/激励视频策略。

## 技术栈

*   **前端**：微信小程序原生框架 (WXML/WXSS/JS)
*   **后端**：Python 3.8+ / Flask / SQLAlchemy (适配微信云托管)
*   **数据库**：SQLite（本地快速开发默认） / MySQL（生产环境适用）

---

## 🚀 部署与启动教程

本项目分为后端（Python Flask）和前端（微信小程序）两部分。由于微信最新规范限制局域网 IP 调用，**推荐直接使用微信云托管部署后端**，以获得最佳体验和天然鉴权。

### 第一种方式：微信云托管部署 (极力推荐)

1. 打开微信开发者工具，点击右上角的 **“云开发”** -> **“云托管”** 开通服务。
2. 在云托管控制台，新建一个服务，命名为 `flask-backend`。
3. 选择 **“代码库拉取”** 或 **“本地代码上传”** 方式，上传本项目的 `backend` 文件夹（根目录下已经为您配置好了标准的 `Dockerfile` 和 `requirements.txt`）。
4. 发布流水线，等待构建成功。
5. 在 `miniprogram/utils/api.js` 中，将 `CLOUD_ENV_ID` 替换为您的真实环境 ID。
6. 前端编译运行，小程序将自动通过安全的微信内网链路 `wx.cloud.callContainer` 访问您的 Flask 服务！

### 第二种方式：后端本地服务调试 (Local Backend)

### 第一步：后端服务部署 (Backend)

1. **环境准备**：
   确保您的电脑上已安装 Python 3.8 或更高版本。

2. **创建并激活虚拟环境（强烈推荐）**：
   打开终端（命令行），进入到项目根目录下执行：
   ```bash
   # 创建虚拟环境
   python -m venv venv

   # 激活虚拟环境 (Mac/Linux)
   source venv/bin/activate

   # 激活虚拟环境 (Windows)
   # venv\Scripts\activate
   ```

3. **安装项目依赖模块**：
   虚拟环境激活后，运行以下命令安装必需的库文件（Flask, SQLAlchemy, PyJWT 等）：
   ```bash
   pip install -r requirements.txt
   ```

4. **启动本地 Flask 服务器**：
   依赖安装完成后，您可以直接运行 `backend/main.py` 以启动 Flask 开发服务：
   ```bash
   python backend/main.py
   ```
   或者使用 Flask 官方推荐的命令：
   ```bash
   export FLASK_APP=backend/main.py
   export FLASK_ENV=development
   flask run --host=0.0.0.0 --port=8000
   ```
   > 启动成功后，终端会显示运行在 `http://127.0.0.1:8000` 的字样。
   > **注意**：本地测试默认使用的是极其轻量的 SQLite 数据库。系统会在根目录下自动创建 `bluecore_baby.db` 文件。

5. **如何切换到 MySQL (准备上线生产环境时)**：
   本系统原生支持 MySQL，配置 `DATABASE_URL` 环境变量即可无缝切换：
   ```bash
   export DATABASE_URL="mysql+pymysql://root:您的密码@127.0.0.1/bluecore_baby"
   python backend/main.py
   ```

---

### 第二步：前端小程序部署 (Frontend)

1. **准备开发者工具**：
   下载并打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。

2. **导入项目代码**：
   - 打开工具，点击左侧的“小程序”。
   - 点击右侧大大的“+”号（或“导入项目”）。
   - 选择本项目的 **`miniprogram`** 文件夹作为项目目录。
   - `AppID` 填写您申请的小程序 AppID，如果没有可以直接点击下拉框下方的 **“测试号”**。
   - 点击“确定”进入开发界面。

3. **非常关键的本地设置**：
   为了让小程序模拟器能向本地服务器发送网络请求：
   - 点击开发者工具右上角的 **“详情”**。
   - 切换到 **“本地设置”** 面板。
   - **务必勾选**：“不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书”。

4. **尽情体验**：
   点击工具顶部菜单栏的“编译”，首页将瞬间加载出华丽的莫兰迪色卡片！点击“喂养”或者右下角的“添加”，即可看到数据实时写入了您的本地后端数据库！
