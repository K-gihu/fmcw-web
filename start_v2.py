#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FMCW Radar Interactive Lab v2.0 启动脚本
支持：
1. 后端 (FastAPI + NumPy + WebSocket)
2. 前端 (React + Vite + ECharts)
"""

import subprocess
import sys
import os
import time
import signal
import webbrowser
import argparse
import socket

def get_project_root():
    """获取项目根目录"""
    return os.path.dirname(os.path.abspath(__file__))

def is_port_available(port):
    """检查端口是否可用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False

def find_available_port(start_port, max_port=65535):
    """从指定端口开始查找第一个可用端口"""
    port = start_port
    while port <= max_port:
        if is_port_available(port):
            return port
        port += 1
    raise Exception(f"无法找到可用端口（从 {start_port} 到 {max_port} 都被占用）")

def check_python():
    """检查 Python 版本"""
    if sys.version_info < (3, 7):
        print("❌ 错误: 需要 Python 3.7 或更高版本")
        sys.exit(1)

def install_backend_deps(project_root):
    """检查后端依赖（使用 Poetry 管理）"""
    print("📦 检查后端依赖...")
    try:
        subprocess.check_call([
            "poetry", "install", "-q"
        ], cwd=project_root)
        print("✅ 后端依赖检查完成")
    except subprocess.CalledProcessError:
        print("⚠️  后端依赖安装可能不完整，但继续尝试启动")

def check_node():
    """检查 Node.js 是否安装"""
    import shutil
    node_path = shutil.which("node")
    if not node_path:
        return False
    try:
        subprocess.check_output([node_path, "--version"], stderr=subprocess.DEVNULL)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_frontend_deps(project_root):
    """安装前端依赖"""
    print("📦 检查并安装前端依赖...")
    frontend_dir = os.path.join(project_root, "frontend-react")

    if not os.path.exists(os.path.join(frontend_dir, "package.json")):
        print(f"❌ 错误: 未找到前端 package.json")
        sys.exit(1)

    try:
        if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
            if sys.platform == "win32":
                subprocess.check_call(
                    ["cmd", "/c", "npm", "install"],
                    cwd=frontend_dir
                )
            else:
                subprocess.check_call(
                    ["npm", "install"],
                    cwd=frontend_dir
                )
        print("✅ 前端依赖安装完成")
    except subprocess.CalledProcessError:
        print("⚠️  前端依赖安装可能不完整，但继续尝试启动")

def start_backend(project_root, backend_port):
    """启动后端服务"""
    print("🚀 启动后端服务...")
    backend_dir = os.path.join(project_root, "backend")
    main_py = os.path.join(backend_dir, "main.py")

    if not os.path.exists(main_py):
        print(f"❌ 错误: 未找到后端文件 {main_py}")
        sys.exit(1)

    env = os.environ.copy()
    env["FMCW_BACKEND_PORT"] = str(backend_port)

    return subprocess.Popen([
        "poetry", "run", "python", main_py
    ], cwd=backend_dir, env=env)

def start_frontend(project_root, frontend_port):
    """启动前端服务"""
    print("🚀 启动前端服务...")
    frontend_dir = os.path.join(project_root, "frontend-react")

    if not os.path.isdir(frontend_dir):
        print(f"❌ 错误: 未找到前端目录 {frontend_dir}")
        sys.exit(1)

    env = os.environ.copy()
    env["PORT"] = str(frontend_port)

    if sys.platform == "win32":
        return subprocess.Popen([
            "cmd", "/c", "npm", "run", "dev"
        ], cwd=frontend_dir, env=env)
    else:
        return subprocess.Popen([
            "npm", "run", "dev"
        ], cwd=frontend_dir, env=env)

def main():
    print("=" * 60)
    print("🚀 FMCW Radar Interactive Lab v2.0 启动脚本")
    print("=" * 60)

    parser = argparse.ArgumentParser(description="FMCW Radar v2.0 启动脚本")
    parser.add_argument("--backend-port", type=int, default=8000, help="后端服务端口 (默认: 8000)")
    parser.add_argument("--frontend-port", type=int, default=3000, help="前端服务端口 (默认: 3000)")
    parser.add_argument("--no-frontend", action="store_true", help="仅启动后端")
    parser.add_argument("--no-backend", action="store_true", help="仅启动前端")
    args = parser.parse_args()

    project_root = get_project_root()
    os.chdir(project_root)

    check_python()

    if not args.no_backend:
        if not is_port_available(args.backend_port):
            print(f"⚠️  端口 {args.backend_port} 已被占用，自动查找可用端口...")
            args.backend_port = find_available_port(args.backend_port)
            print(f"✅ 找到可用端口: {args.backend_port}")

    if not args.no_frontend:
        if not is_port_available(args.frontend_port):
            print(f"⚠️  端口 {args.frontend_port} 已被占用，自动查找可用端口...")
            args.frontend_port = find_available_port(args.frontend_port)
            print(f"✅ 找到可用端口: {args.frontend_port}")

    processes = []

    def cleanup(signum, frame):
        print("\n🛑 正在停止服务...")
        for p in processes:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    p.kill()
        print("✅ 服务已停止")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        if not args.no_backend:
            install_backend_deps(project_root)
            backend_process = start_backend(project_root, args.backend_port)
            processes.append(backend_process)
            time.sleep(2)

        if not args.no_frontend:
            if not check_node():
                print("❌ 错误: 未找到 Node.js，请先安装 Node.js")
                print("   下载地址: https://nodejs.org/")
                sys.exit(1)
            install_frontend_deps(project_root)
            frontend_process = start_frontend(project_root, args.frontend_port)
            processes.append(frontend_process)

        print("\n" + "=" * 60)
        print("✅ 服务启动成功！")
        if not args.no_backend:
            print(f"   后端 API: http://localhost:{args.backend_port}")
            print(f"   WebSocket: ws://localhost:{args.backend_port}/ws/simulation")
        if not args.no_frontend:
            print(f"   前端页面: http://localhost:{args.frontend_port}")
        print("=" * 60)

        if not args.no_frontend:
            try:
                time.sleep(3)
                webbrowser.open(f"http://localhost:{args.frontend_port}")
                print("\n🌐 已自动打开浏览器")
            except:
                pass

        print("\n服务运行中... 按 Ctrl+C 停止\n")

        for p in processes:
            p.wait()

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        cleanup(None, None)

if __name__ == "__main__":
    main()