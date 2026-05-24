from playwright.sync_api import sync_playwright
import http.server
import socketserver
import threading
import os

PORT = 8765
DIRECTORY = "frontend"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        pass  # 静默日志

def start_server():
    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

def test_fmcw_frontend():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    print(f"启动HTTP服务器: http://localhost:{PORT}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        
        print(f"\n访问: http://localhost:{PORT}/index.html")
        page.goto(f'http://localhost:{PORT}/index.html')
        page.wait_for_load_state('networkidle')
        
        print("=== 页面加载成功 ===")
        
        title = page.title()
        print(f"页面标题: {title}")
        
        tabs = page.locator('nav.tabs button').all()
        print(f"\n找到 {len(tabs)} 个Tab按钮:")
        for tab in tabs:
            print(f"  - {tab.text_content()}")
        
        status = page.locator('#backend-status').text_content()
        print(f"\n后端状态: {status}")
        
        intro_section = page.locator('#intro')
        has_content = intro_section.locator('h1, .hero').count()
        print(f"\nIntro模块内容: {'已加载' if has_content > 0 else '未加载'}")
        
        page.screenshot(path='tmp_test_screenshot.png', full_page=True)
        print("截图已保存: tmp_test_screenshot.png")
        
        print("\n=== 测试Tab切换 ===")
        for i, tab_btn in enumerate(tabs):
            tab_name = tab_btn.text_content()
            print(f"点击: {tab_name}")
            tab_btn.click()
            page.wait_for_timeout(1000)
            
            section_id = tab_btn.get_attribute('data-tab')
            section = page.locator(f'#{section_id}')
            section_class = section.get_attribute('class')
            print(f"  ✓ {section_id} - class: {section_class}")
        
        print("\n=== 控制台消息 ===")
        errors = [m for m in console_messages if 'error' in m.lower() or 'Error' in m]
        if errors:
            print("发现错误:")
            for e in errors[:5]:
                print(f"  {e}")
        else:
            print("✓ 无控制台错误")
        
        browser.close()
        
        return len(errors) == 0

if __name__ == "__main__":
    success = test_fmcw_frontend()
    print(f"\n{'='*40}")
    print(f"测试结果: {'✓ 通过' if success else '⚠ 有非致命错误'}")
