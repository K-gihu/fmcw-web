from playwright.sync_api import sync_playwright
import http.server
import socketserver
import threading
import time
import os
import sys

BACKEND_PORT = 8000
FRONTEND_PORT = 8765

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="frontend", **kwargs)
    
    def log_message(self, format, *args):
        pass

def start_frontend_server():
    with socketserver.TCPServer(("", FRONTEND_PORT), QuietHandler) as httpd:
        httpd.serve_forever()

def start_backend_server():
    original_dir = os.getcwd()
    try:
        os.chdir("backend")
        python_exe = os.path.join(original_dir, ".venv", "Scripts", "python.exe")
        os.execv(python_exe, [python_exe, "main.py"])
    finally:
        os.chdir(original_dir)

def test_full_stack():
    print("=== 启动服务 ===")
    
    backend_thread = threading.Thread(target=start_backend_server, daemon=True)
    backend_thread.start()
    print(f"后端服务启动中 (端口 {BACKEND_PORT})...")
    
    frontend_thread = threading.Thread(target=start_frontend_server, daemon=True)
    frontend_thread.start()
    print(f"前端服务启动中 (端口 {FRONTEND_PORT})...")
    
    time.sleep(4)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        
        print(f"\n访问: http://localhost:{FRONTEND_PORT}/index.html")
        page.goto(f'http://localhost:{FRONTEND_PORT}/index.html')
        page.wait_for_load_state('networkidle')
        time.sleep(1)
        
        print("\n=== 页面加载成功 ===")
        print(f"页面标题: {page.title()}")
        
        try:
            status = page.locator('#backend-status').text_content()
            print(f"后端状态: {status}")
        except:
            print("后端状态: 无法获取")
        
        print("\n=== 截图保存 ===")
        page.screenshot(path='tmp_01_intro.png', full_page=True)
        print("✓ 01_intro.png - 基础原理页面")
        
        tabs_to_test = [
            ('range', '02_range.png', '距离测量'),
            ('velocity', '03_velocity.png', '速度测量'),
            ('angle', '04_angle.png', '角度测量'),
            ('params', '05_params.png', '参数设计器'),
            ('sim', '06_sim.png', '综合仿真'),
        ]
        
        for section_id, filename, name in tabs_to_test:
            print(f"\n切换到: {name}")
            page.locator(f'[data-tab="{section_id}"]').click()
            page.wait_for_timeout(2000)
            page.screenshot(path=f'tmp_{filename}', full_page=True)
            print(f"✓ {filename}")
        
        print("\n=== 控制台错误 ===")
        errors = [m for m in console_messages if 'error' in m.lower() and 'ERR_CONNECTION_REFUSED' not in m]
        if errors:
            for e in errors[:3]:
                print(f"  {e}")
        else:
            print("✓ 无错误")
        
        print("\n测试完成！")
        input("\n按回车键关闭浏览器...")
        
        browser.close()
    
    print("\n" + "="*50)
    print("所有截图已保存!")
    print("="*50)

if __name__ == "__main__":
    test_full_stack()
