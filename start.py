#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FMCW Radar Interactive Lab 启动脚本
跨平台支持，同时启动后端和前端服务
"""

import subprocess
import sys
import os
import time
import signal
import webbrowser


def get_project_root():
    """获取项目根目录"""
    return os.path.dirname(os.path.abspath(__file__))


def check_python():
    """检查 Python 版本"""
    if sys.version_info < (3, 7):
        print("❌ 错误: 需要 Python 3.7 或更高版本")
        sys.exit(1)


def install_dependencies(project_root):
    """安装依赖"""
    print("📦 检查并安装依赖...")
    requirements_path = os.path.join(project_root, "backend", "requirements.txt")
    
    if not os.path.exists(requirements_path):
        print(f"❌ 错误: 未找到依赖文件 {requirements_path}")
        sys.exit(1)
    
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-q", "-r", requirements_path
        ])
        print("✅ 依赖检查完成")
    except subprocess.CalledProcessError:
        print("⚠️  依赖安装可能不完整，但继续尝试启动")


def start_backend(project_root):
    """启动后端服务"""
    print("启动后端服务...")
    backend_dir = os.path.join(project_root, "backend")
    main_py = os.path.join(backend_dir, "main.py")
    
    if not os.path.exists(main_py):
        print(f"❌ 错误: 未找到后端文件 {main_py}")
        sys.exit(1)
    
    return subprocess.Popen([
        sys.executable, main_py
    ], cwd=backend_dir)


def start_frontend(project_root):
    """启动前端服务"""
    print("启动前端服务...")
    frontend_dir = os.path.join(project_root, "frontend")
    
    if not os.path.isdir(frontend_dir):
        print(f"❌ 错误: 未找到前端目录 {frontend_dir}")
        sys.exit(1)
    
    return subprocess.Popen([
        sys.executable, "-m", "http.server", "8765"
    ], cwd=frontend_dir)


def main():
    print("=========================================")
    print("🚀 FMCW Radar Interactive Lab 启动脚本")
    print("=========================================")
    
    project_root = get_project_root()
    os.chdir(project_root)
    
    # 检查 Python
    check_python()
    
    # 安装依赖
    install_dependencies(project_root)
    
    print("\n🌐 正在启动服务...")
    print("后端服务: http://localhost:8000")
    print("前端页面: http://localhost:8765/index.html")
    print("\n按 Ctrl+C 停止服务")
    print("=========================================\n")
    
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
    
    # 注册信号处理
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    try:
        # 启动后端
        backend_process = start_backend(project_root)
        processes.append(backend_process)
        
        # 等待后端启动
        time.sleep(2)
        
        # 启动前端
        frontend_process = start_frontend(project_root)
        processes.append(frontend_process)
        
        print("\n✅ 服务启动成功！")
        print("\n访问地址：")
        print("  前端页面: http://localhost:8765/index.html")
        print("  后端API:  http://localhost:8000")
        
        # 尝试自动打开浏览器
        try:
            time.sleep(1)
            webbrowser.open("http://localhost:8765/index.html")
            print("\n🌐 已自动打开浏览器")
        except:
            pass
        
        print("\n服务运行中... 按 Ctrl+C 停止")
        
        # 等待进程
        for p in processes:
            p.wait()
            
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        cleanup(None, None)


if __name__ == "__main__":
    main()
