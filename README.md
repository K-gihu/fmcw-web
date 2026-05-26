# FMCW Radar Interactive Lab

FMCW雷达原理交互式学习应用

## 🎯 技术选型

### 后端技术栈

| 技术 | 选型 | 优势 |
|------|------|------|
| 后端框架 | FastAPI | 高性能、异步支持、自动API文档 |
| 科学计算 | NumPy | 成熟稳定、科学计算生态完善 |
| 实时通信 | WebSocket | 低延迟、双向通信 |
| 依赖管理 | Poetry | 现代化依赖管理、虚拟环境一体化 |

### 前端技术栈

| 技术 | 选型 | 优势 |
|------|------|------|
| 前端框架 | React 18 | 组件化、生态完善 |
| 构建工具 | Vite | 极快的开发体验 |
| 图表库 | ECharts | 专业科学可视化、性能优秀 |

## 🚀 快速开始

### 环境要求

- Python 3.12+
- Poetry
- Node.js 16+

### 启动方式

#### 方式一：使用启动脚本（推荐）

```bash
# 启动后端 + 前端
python start_v2.py

# 仅启动后端
python start_v2.py --no-frontend

# 仅启动前端
python start_v2.py --no-backend

# 指定端口
python start_v2.py --backend-port 8001 --frontend-port 3001
```

#### 方式二：手动启动

##### 后端

```bash
poetry install
poetry run python backend/main.py
```

##### 前端

```bash
cd frontend-react
npm install
npm run dev
```

## ✨ 功能模块

| 模块 | 功能 |
|------|------|
| 基础原理 | Chirp波形可视化、核心公式展示、系统框图 |
| 距离测量 | 目标配置、Range-FFT、性能指标计算 |
| 速度与2D-FFT | 帧结构参数、Range-Doppler Map、多普勒原理 |
| 角度测量 | ULA天线几何、Angle-FFT、测角公式 |
| 参数设计器 | 系统约束输入、自动参数推荐、敏感性分析 |
| 综合仿真 | 多目标场景配置、三重视图（距离/速度/角度谱） |

## 📁 项目结构

```
/
├── backend/              # 后端代码
│   └── main.py           # FastAPI后端
├── frontend-react/       # React前端
│   ├── src/
│   │   ├── components/   # 组件目录
│   │   ├── services/     # API和WebSocket服务
│   │   ├── styles/       # 样式文件
│   │   ├── utils/        # 工具函数
│   │   ├── App.jsx       # 主应用组件
│   │   └── main.jsx      # 入口文件
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── start_v2.py           # 启动脚本
├── pyproject.toml        # Poetry配置
└── poetry.lock           # Poetry锁定文件
```

## 📊 API 文档

### HTTP API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/range-fft` | POST | 距离FFT计算 |
| `/api/velocity-fft` | POST | 速度FFT计算 |
| `/api/angle-fft` | POST | 角度FFT计算 |
| `/api/simulation` | POST | 综合仿真 |

### WebSocket

连接: `ws://localhost:8000/ws/simulation`

消息格式:
```json
{
  "action": "simulate",
  "targets": [...],
  "fc": 77,
  "B": 4,
  "Tc": 40,
  "Nc": 64,
  "Nrx": 4,
  "noise": 0.15
}
```

## 📝 License

仅用于学习理解原理，参数仅作示意