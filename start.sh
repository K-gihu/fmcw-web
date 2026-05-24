#!/bin/bash

# FMCW 雷达学习网页启动脚本
# 同时启动后端和前端服务

echo "========================================="
echo "🚀 FMCW Radar Interactive Lab 启动脚本"
echo "========================================="

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3，请先安装 Python"
    exit 1
fi

echo "📦 检查并安装依赖..."
cd backend
pip install -q -r requirements.txt
cd ..

echo "✅ 依赖检查完成"
echo ""
echo "🌐 正在启动服务..."
echo ""
echo "后端服务: http://localhost:8000"
echo "前端页面: http://localhost:8765/index.html"
echo ""
echo "按 Ctrl+C 停止服务"
echo "========================================="
echo ""

# 创建临时目录存储 PID 文件
mkdir -p /tmp/fmcw-lab

# 启动后端服务
echo "启动后端服务..."
cd backend
python3 main.py > /tmp/fmcw-lab/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/fmcw-lab/backend.pid
cd ..

# 等待一下确保后端启动
sleep 2

# 启动前端服务
echo "启动前端服务..."
cd frontend
python3 -m http.server 8765 > /tmp/fmcw-lab/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/fmcw-lab/frontend.pid
cd ..

echo ""
echo "✅ 服务启动成功！"
echo ""
echo "访问地址："
echo "  前端页面: http://localhost:8765/index.html"
echo "  后端API:  http://localhost:8000"
echo ""

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID 2>/dev/null; kill $FRONTEND_PID 2>/dev/null; rm -rf /tmp/fmcw-lab; echo '✅ 服务已停止'; exit 0" INT

# 保持脚本运行
echo "服务运行中... 按 Ctrl+C 停止"
wait
