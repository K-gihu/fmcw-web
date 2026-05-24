# FMCW Radar Interactive Lab v2.0

FMCW雷达原理交互式学习应用 - 优化版本

## 🎯 技术选型

### 后端技术栈

| 技术 | 选型 | 优势 |
|------|------|------|
| 后端框架 | FastAPI | 高性能、异步支持、自动API文档 |
| 科学计算 | NumPy | 成熟稳定、科学计算生态完善 |
| 实时通信 | WebSocket | 低延迟、双向通信 |

### 前端技术栈

| 技术 | 选型 | 优势 |
|------|------|------|
| 前端框架 | React 18 | 组件化、生态完善 |
| 构建工具 | Vite | 极快的开发体验 |
| 图表库 | ECharts | 专业科学可视化、性能优秀 |

## 🚀 快速开始

### 环境要求

- Python 3.7+
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
cd backend
pip install -r requirements.txt
python main.py
```

##### 前端

```bash
cd frontend-react
npm install
npm run dev
```

## ✨ 新功能

### v2.0 改进

- ✅ WebSocket实时通信
- ✅ React组件化架构
- ✅ ECharts专业可视化
- ✅ NumPy向量化优化
- ✅ 性能优化

## 📁 项目结构

```
/workspace/
├── backend/              # 后端代码
│   ├── main.py           # FastAPI后端 (v2.0)
│   └── requirements.txt  # 依赖
├── frontend/           # 旧版前端 (保留)
├── frontend-react/  # 新版前端
│   ├── src/
│   │   ├── components/  # 图表组件
│   │   ├── services/    # API和WebSocket服务
│   │   ├── App.jsx      # 主应用
│   │   └── main.jsx     # 入口
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── start.py           # 旧版启动脚本
└── start_v2.py      # 新版启动脚本
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

连接: `ws://localhost:8000/ws/simulation

消息格式:
```json
{
  "action": "simulate",
  "targets": [...],
  "fc": 77,
  "B": 4,
  ...
}
```

## 📝 License

仅用于学习理解原理，参数仅作示意