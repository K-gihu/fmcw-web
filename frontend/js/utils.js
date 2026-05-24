// 从环境配置或 HTML 中的 meta 标签读取 API 地址
function getApiBase() {
    const meta = document.querySelector('meta[name="fmcw-api-base"]');
    if (meta) {
        return meta.content;
    }
    // 尝试从与前端相同的主机名，但不同的端口（默认 8000）
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
}
const API_BASE = getApiBase();
let backendAvailable = false;

async function checkBackend() {
    const statusEl = document.getElementById('backend-status');
    const urlEl = document.getElementById('backend-url');
    if (!statusEl || !urlEl) return;
    
    urlEl.textContent = `后端: ${API_BASE}`;
    
    try {
        const response = await fetch(`${API_BASE}/health`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            backendAvailable = true;
            statusEl.textContent = '已连接 (Python/NumPy)';
            statusEl.className = 'online';
        } else {
            throw new Error('Backend returned error');
        }
    } catch (e) {
        backendAvailable = false;
        statusEl.textContent = '未连接 (使用前端近似)';
        statusEl.className = 'offline';
    }
}

async function apiCall(endpoint, data) {
    if (!backendAvailable) {
        throw new Error('Backend not available');
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
}

function showLoading(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'inline';
}

function hideLoading(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

const C = 299792458;
const $ = id => document.getElementById(id);

function fitCanvas(cv){
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.height;
    cv.width = Math.round(w*dpr);
    cv.height = Math.round(h*dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx, w, h};
}

function drawAxes(ctx,w,h,pad,xlabel,ylabel,xticks,yticks){
    ctx.strokeStyle='#253163'; ctx.lineWidth=1;
    ctx.fillStyle='#8a97c7'; ctx.font='11px sans-serif';
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h-pad.b);
    ctx.lineTo(w-pad.r, h-pad.b); ctx.stroke();
    if(xticks) xticks.forEach(([x,label])=>{
        ctx.beginPath();
        ctx.moveTo(x, h-pad.b); ctx.lineTo(x, h-pad.b+4); ctx.stroke();
        ctx.fillText(label, x+2, h-pad.b+14);
    });
    if(yticks) yticks.forEach(([y,label])=>{
        ctx.fillText(label, 4, y+3);
    });
    ctx.fillStyle='#cdd6f4';
    if(xlabel) ctx.fillText(xlabel, w-pad.r-60, h-4);
    if(ylabel){ ctx.save(); ctx.translate(10,pad.t+10); ctx.rotate(-Math.PI/2);
        ctx.fillText(ylabel,0,0); ctx.restore(); }
}

function cmap(n){
    n = Math.max(0,Math.min(1,n));
    const stops=[
        [0,   [6,12,40]],
        [0.25,[20,80,140]],
        [0.5, [34,211,238]],
        [0.75,[74,222,128]],
        [0.9, [250,204,21]],
        [1,   [239,68,68]]
    ];
    for(let i=0;i<stops.length-1;i++){
        if(n<=stops[i+1][0]){
            const a=stops[i], b=stops[i+1];
            const t=(n-a[0])/(b[0]-a[0]);
            return [
                a[1][0]+(b[1][0]-a[1][0])*t,
                a[1][1]+(b[1][1]-a[1][1])*t,
                a[1][2]+(b[1][2]-a[1][2])*t
            ];
        }
    }
    return [239,68,68];
}

function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
}
