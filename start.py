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
import argparse
import re
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


def find_available_port(start_port):
    """从 start_port 开始寻找下一个可用端口"""
    for port in range(start_port, start_port + 100):
        if is_port_available(port):
            return port
    raise RuntimeError(f"无法找到可用端口（起始端口: {start_port}）")


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


def start_backend(project_root, backend_port):
    """启动后端服务"""
    print("启动后端服务...")
    backend_dir = os.path.join(project_root, "backend")
    main_py = os.path.join(backend_dir, "main.py")
    
    if not os.path.exists(main_py):
        print(f"❌ 错误: 未找到后端文件 {main_py}")
        sys.exit(1)
    
    env = os.environ.copy()
    env["FMCW_BACKEND_PORT"] = str(backend_port)
    
    return subprocess.Popen([
        sys.executable, main_py
    ], cwd=backend_dir, env=env)


def start_frontend(project_root, frontend_port, backend_port):
    """启动前端服务"""
    print("启动前端服务...")
    frontend_dir = os.path.join(project_root, "frontend")
    index_html = os.path.join(frontend_dir, "index.html")
    
    if not os.path.isdir(frontend_dir):
        print(f"❌ 错误: 未找到前端目录 {frontend_dir}")
        sys.exit(1)
    
    # 修改 index.html，添加 meta 标签配置 API 地址
    if os.path.exists(index_html):
        with open(index_html, "r", encoding="utf-8") as f:
            content = f.read()
        
        api_base = f"http://localhost:{backend_port}"
        meta_tag = f'<meta name="fmcw-api-base" content="{api_base}">'
        
        # 检查是否已有这个 meta 标签
        if 'name="fmcw-api-base"' in content:
            # 更新现有标签
            content = re.sub(r'<meta name="fmcw-api-base" content="[^"]*">', meta_tag, content)
        elif '<head>' in content:
            # 在 <head> 标签中添加
            content = content.replace('<head>', f'<head>\n    {meta_tag}')
        
        with open(index_html, "w", encoding="utf-8") as f:
            f.write(content)
    
    return subprocess.Popen([
        sys.executable, "-m", "http.server", str(frontend_port)
    ], cwd=frontend_dir)


def main():
    print("=========================================")
    print("🚀 FMCW Radar Interactive Lab 启动脚本")
    print("=========================================")
    
    project_root = get_project_root()
    os.chdir(project_root)
    
    # 检查 Python
    check_python()
    
    # 解析命令行参数
    parser = argparse.ArgumentParser(description="FMCW Radar Interactive Lab 启动脚本")
    parser.add_argument("--backend-port", type=int, help="后端服务端口 (默认: 自动选择可用端口)")
    parser.add_argument("--frontend-port", type=int, help="前端服务端口 (默认: 自动选择可用端口)")
    args = parser.parse_args()
    
    # 确定端口
    if args.backend_port is not None:
        backend_port = args.backend_port
    else:
        backend_port = find_available_port(8000)
        print(f"ℹ️  自动选择可用后端端口: {backend_port}")
    
    if args.frontend_port is not None:
        frontend_port = args.frontend_port
    else:
        frontend_port = find_available_port(8765)
        print(f"ℹ️  自动选择可用前端端口: {frontend_port}")
    
    # 安装依赖
    install_dependencies(project_root)
    
    print("\n🌐 正在启动服务...")
    print(f"后端服务: http://localhost:{backend_port}")
    print(f"前端页面: http://localhost:{frontend_port}/index.html")
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
        backend_process = start_backend(project_root, backend_port)
        processes.append(backend_process)
        
        # 等待后端启动
        time.sleep(2)
        
        # 启动前端
        frontend_process = start_frontend(project_root, frontend_port, backend_port)
        processes.append(frontend_process)
        
        print("\n✅ 服务启动成功！")
        print("\n访问地址：")
        print(f"  前端页面: http://localhost:{frontend_port}/index.html")
        print(f"  后端API:  http://localhost:{backend_port}")
        
        # 尝试自动打开浏览器
        try:
            time.sleep(1)
            webbrowser.open(f"http://localhost:{frontend_port}/index.html")
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
