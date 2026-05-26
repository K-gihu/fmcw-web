import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '../utils/math';

const AngleModule = () => {
  const [params, setParams] = useState({
    dLam: 0.5,
    Nrx: 4,
    th: 20,
    fc: 77,
  });
  
  const geomCanvas = useRef(null);
  const fftCanvas = useRef(null);

  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }));
  }, []);

  const fitCanvas = useCallback((cv) => {
    if (!cv) return { ctx: null, w: 0, h: 0 };
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }, []);

  const drawAxes = useCallback((ctx, w, h, pad, xlabel, ylabel) => {
    ctx.strokeStyle = '#253163';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8a97c7';
    ctx.font = '11px sans-serif';
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();
  }, []);

  useEffect(() => {
    const { dLam, Nrx, th, fc } = params;
    const lam = C / (fc * 1e9);
    const d = dLam * lam;
    const thR = (th * Math.PI) / 180;
    const dphi = (2 * Math.PI * d * Math.sin(thR)) / lam;
    const dth = (0.886 * lam) / (Nrx * d * Math.cos(thR)) * (180 / Math.PI);
    const unamb = Math.asin(Math.min(1, lam / (2 * d))) * (180 / Math.PI);

    let { ctx, w, h } = fitCanvas(geomCanvas.current);
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h - 60;
      
      ctx.strokeStyle = '#253163';
      ctx.beginPath();
      ctx.moveTo(40, cy);
      ctx.lineTo(w - 40, cy);
      ctx.stroke();

      const totalW = (Nrx - 1) * 50;
      const x0 = cx - totalW / 2;
      const antPos = [];
      for (let i = 0; i < Nrx; i++) {
        const ax = x0 + i * 50;
        antPos.push(ax);
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(ax, cy, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('RX' + (i + 1), ax - 12, cy + 22);
      }

      const R = 260;
      const tx = cx + R * Math.sin(thR);
      const ty = cy - R * Math.cos(thR);
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('目标', tx + 12, ty + 4);
      ctx.fillText('θ = ' + th + '°', cx + 4, cy - R - 10);

      const nx = Math.sin(thR);
      const ny = -Math.cos(thR);
      const perpX = -ny;
      const perpY = nx;
      ctx.strokeStyle = '#22d3ee55';
      ctx.lineWidth = 1;
      for (let k = -3; k <= 3; k++) {
        const off = k * 30;
        const ox = tx - nx * off;
        const oy = ty - ny * off;
        ctx.beginPath();
        ctx.moveTo(ox - perpX * 200, oy - perpY * 200);
        ctx.lineTo(ox + perpX * 200, oy + perpY * 200);
        ctx.stroke();
      }

      if (Nrx >= 2) {
        const a0x = antPos[0];
        const a1x = antPos[1];
        ctx.strokeStyle = '#fb923c';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a0x, cy);
        ctx.lineTo(a0x + 50 * Math.sin(thR), cy - 50 * Math.cos(thR));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fb923c';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('ΔL = d·sinθ', cx - 40, cy - 40);
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('θ', cx - 12, cy - 12);
        ctx.beginPath();
        ctx.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + thR, thR < 0);
        ctx.strokeStyle = '#a78bfa';
        ctx.stroke();
      }
    }

    ({ ctx, w, h } = fitCanvas(fftCanvas.current));
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad2 = { l: 60, r: 20, t: 20, b: 40 };
      drawAxes(ctx, w, h, pad2, '角度 θ (°)', '|Angle-FFT|');

      const Ngrid = 512;
      const angSpec = new Float32Array(Ngrid);

      for (let k = 0; k < Ngrid; k++) {
        const ang = -90 + (k * 180) / Ngrid;
        const angR = (ang * Math.PI) / 180;
        let re = 0, im = 0;
        for (let n = 0; n < Nrx; n++) {
          const phaseObs = (2 * Math.PI * d * Math.sin(thR)) / lam * n;
          const phaseSt = (2 * Math.PI * d * Math.sin(angR)) / lam * n;
          re += Math.cos(phaseObs - phaseSt);
          im += Math.sin(phaseObs - phaseSt);
        }
        angSpec[k] = Math.sqrt(re * re + im * im);
      }

      const mx = Math.max(...angSpec) || 1;
      const grd = ctx.createLinearGradient(0, pad2.t, 0, h - pad2.b);
      grd.addColorStop(0, '#a78bfa');
      grd.addColorStop(1, '#a78bfa00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(pad2.l, h - pad2.b);
      for (let k = 0; k < Ngrid; k++) {
        const x = pad2.l + (k / Ngrid) * (w - pad2.l - pad2.r);
        const y = h - pad2.b - (angSpec[k] / mx) * (h - pad2.t - pad2.b) * 0.95;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w - pad2.r, h - pad2.b);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k < Ngrid; k++) {
        const x = pad2.l + (k / Ngrid) * (w - pad2.l - pad2.r);
        const y = h - pad2.b - (angSpec[k] / mx) * (h - pad2.t - pad2.b) * 0.95;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#cdd6f4';
      ctx.font = '11px sans-serif';
      for (let a = -90; a <= 90; a += 30) {
        const x = pad2.l + ((a + 90) / 180) * (w - pad2.l - pad2.r);
        ctx.fillText(a + '°', x - 10, h - pad2.b + 16);
      }

      const pkx = pad2.l + ((th + 90) / 180) * (w - pad2.l - pad2.r);
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pkx, pad2.t);
      ctx.lineTo(pkx, h - pad2.b);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('θ=' + th + '°', pkx + 6, pad2.t + 14);

      if (dLam > 0.5 && Math.abs(th) > unamb) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('⚠ 栅瓣出现（d > λ/2）', pad2.l + 10, pad2.t + 14);
      }
    }
  }, [params, fitCanvas, drawAxes]);

  const lam = C / (params.fc * 1e9);
  const d = params.dLam * lam;
  const thR = (params.th * Math.PI) / 180;
  const dphi = (2 * Math.PI * d * Math.sin(thR)) / lam;
  const dth = (0.886 * lam) / (params.Nrx * d * Math.cos(thR)) * (180 / Math.PI);
  const unamb = Math.asin(Math.min(1, lam / (2 * d))) * (180 / Math.PI);

  const dLabel = params.dLam === 0.5 ? 'λ/2' : params.dLam === 0.25 ? 'λ/4' : params.dLam === 0.75 ? '3λ/4' : 'λ';

  return (
    <div>
      <h2>④ 角度测量：多接收天线与相位差</h2>
      <p>当目标不在雷达法线方向时，到达不同 RX 天线的回波存在 <b>路径差</b>，从而产生 <b>相位差</b>。用均匀线阵 (ULA) 即可估计方位角。</p>

      <div className="grid">
        <div className="card">
          <h3>ULA 几何</h3>
          <div className="controls">
            <div className="ctrl">
              <label>
                天线间距 d <b>{dLabel}</b>
              </label>
              <select
                value={params.dLam}
                onChange={(e) => updateParam('dLam', e.target.value)}
              >
                <option value="0.25">λ/4</option>
                <option value="0.5">λ/2</option>
                <option value="0.75">3λ/4</option>
                <option value="1">λ（注意栅瓣）</option>
              </select>
            </div>
            <div className="ctrl">
              <label>
                天线数 N<sub>rx</sub> <b>{params.Nrx}</b>
              </label>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={params.Nrx}
                onChange={(e) => updateParam('Nrx', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                目标角度 θ <b>{params.th}°</b>
              </label>
              <input
                type="range"
                min="-80"
                max="80"
                step="1"
                value={params.th}
                onChange={(e) => updateParam('th', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                载频 f<sub>c</sub> <b>{params.fc} GHz</b>
              </label>
              <input
                type="range"
                min="24"
                max="79"
                step="1"
                value={params.fc}
                onChange={(e) => updateParam('fc', e.target.value)}
              />
            </div>
          </div>
          <canvas ref={geomCanvas} width="700" height="360" />
          <div className="legend">
            <i style={{ background: 'var(--cyan)' }}></i>波前 &nbsp;
            <i style={{ background: 'var(--orange)' }}></i>路径差 ΔL = d·sinθ
          </div>
        </div>

        <div className="card">
          <h3>测角公式</h3>
          <p>
            <span className="badge">相邻天线相位差</span>
          </p>
          <div className="formula">
            Δφ <span className="eq">=</span> 2π · d · sinθ / λ
          </div>

          <p>
            <span className="badge">角度反推</span>
          </p>
          <div className="formula">
            θ <span className="eq">=</span> arcsin( Δφ · λ / (2π · d) )
          </div>

          <p>
            <span className="badge">角度分辨率</span>（瑞利限，N 元 ULA）：
          </p>
          <div className="formula">
            Δθ ≈ 0.886 · λ / (N · d · cosθ)
          </div>

          <p>
            <span className="badge">无模糊测角条件</span>
          </p>
          <div className="formula">
            |Δφ| &lt; π &nbsp; ⟹ &nbsp; d ≤ λ/2 &nbsp; （避免相位模糊）
          </div>

          <h3>指标</h3>
          <div className="metric">
            <span>当前 Δφ</span>
            <b>{(dphi * 180 / Math.PI).toFixed(1)}° ({dphi.toFixed(3)} rad)</b>
          </div>
          <div className="metric">
            <span>角分辨率 Δθ</span>
            <b>{dth.toFixed(2)}°</b>
          </div>
          <div className="metric">
            <span>无模糊范围</span>
            <b>±{unamb.toFixed(1)}°</b>
          </div>

          <div className="note" style={{ marginTop: '14px' }}>
            🧭 实车中常用 <b>4 TX × 4 RX = 16 虚拟通道</b> 的 MIMO 配置，等效于 16 元 ULA，Δθ 可优于 10°。
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '18px' }}>
        <h3>
          FFT 波束形成（Angle-FFT）{' '}
          <span className="loading" style={{ display: 'none' }}>🔄 计算中...</span>
        </h3>
        <canvas ref={fftCanvas} width="1200" height="280" />
        <div className="legend">
          <i style={{ background: 'var(--violet)' }}></i>角度谱（峰值 = 目标方向）
        </div>
      </div>
    </div>
  );
};

export default AngleModule;