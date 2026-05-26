import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C, cmap } from '../utils/math';

const VelocityModule = () => {
  const [params, setParams] = useState({
    fc: 77,
    Tc: 60,
    Nc: 64,
    R: 30,
    v: 12,
  });
  
  const seqCanvas = useRef(null);
  const rdCanvas = useRef(null);

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
    const { fc, Tc, Nc, R, v } = params;
    const lam = C / (fc * 1e9);
    const vmax = lam / (4 * Tc * 1e-6);
    const dv = lam / (2 * Nc * Tc * 1e-6);

    let { ctx, w, h } = fitCanvas(seqCanvas.current);
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 50, r: 20, t: 20, b: 30 };
      drawAxes(ctx, w, h, pad, 't', 'f');
      
      const drawN = Math.min(Nc, 16);
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;

      for (let i = 0; i < drawN; i++) {
        const x0 = pad.l + (i * Tc / (drawN * Tc)) * pw;
        const x1 = pad.l + (((i + 0.8) * Tc) / (drawN * Tc)) * pw;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, h - pad.b - 10);
        ctx.lineTo(x1, pad.t + 20);
        ctx.stroke();
        
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + 3, h - pad.b - 10 + 6);
        ctx.lineTo(x1 + 3, pad.t + 26);
        ctx.stroke();
      }

      ctx.fillStyle = '#f472b6';
      ctx.font = '12px sans-serif';
      ctx.fillText('Δφ = 4πvT₍c₎/λ  相邻 Chirp 的相位差', pad.l + 10, h - pad.b - 30);
      ctx.fillText('λ = ' + (lam * 1000).toFixed(2) + ' mm', pad.l + pw - 100, pad.t + 16);
    }

    ({ ctx, w, h } = fitCanvas(rdCanvas.current));
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad2 = { l: 70, r: 20, t: 20, b: 40 };
      drawAxes(ctx, w, h, pad2, '速度 v (m/s)', 'R (m)');
      
      const Bsim = 4;
      const fsSim = 10e6;
      const RmaxSim = (fsSim * C * (Tc * 1e-6)) / (4 * Bsim * 1e9);
      const dRsim = C / (2 * Bsim * 1e9);
      const dvsim = lam / (2 * Nc * Tc * 1e-6);

      const targets = [
        { R: R, v: v },
        { R: Math.max(3, R * 0.5), v: -v * 0.6 },
        { R: Math.min(RmaxSim * 0.85, R * 1.4), v: v * 0.3 },
      ];

      const Nx = 120;
      const Ny = 80;
      const img = ctx.createImageData(Nx, Ny);
      let maxv = 0;
      const arr = new Float32Array(Nx * Ny);

      for (let yi = 0; yi < Ny; yi++) {
        const Rg = (yi / Ny) * RmaxSim;
        for (let xi = 0; xi < Nx; xi++) {
          const vg = ((xi / Nx) - 0.5) * 2 * vmax;
          let val = 0;
          targets.forEach((tg) => {
            const dr = (Rg - tg.R) / dRsim;
            const dvv = (vg - tg.v) / dvsim;
            const sr = Math.abs(dr) < 1e-6 ? 1 : Math.sin(Math.PI * dr) / (Math.PI * dr);
            const sv = Math.abs(dvv) < 1e-6 ? 1 : Math.sin(Math.PI * dvv) / (Math.PI * dvv);
            val += sr * sr * sv * sv;
          });
          arr[yi * Nx + xi] = val;
          if (val > maxv) maxv = val;
        }
      }

      for (let i = 0; i < arr.length; i++) {
        const n = Math.pow(arr[i] / maxv, 0.55);
        const [r, g, b] = cmap(n);
        img.data[4 * i] = r;
        img.data[4 * i + 1] = g;
        img.data[4 * i + 2] = b;
        img.data[4 * i + 3] = 255;
      }

      const off = document.createElement('canvas');
      off.width = Nx;
      off.height = Ny;
      off.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, pad2.l, pad2.t, w - pad2.l - pad2.r, h - pad2.t - pad2.b);
      ctx.strokeStyle = '#253163';
      ctx.strokeRect(pad2.l, pad2.t, w - pad2.l - pad2.r, h - pad2.t - pad2.b);

      ctx.fillStyle = '#cdd6f4';
      ctx.font = '11px sans-serif';
      for (let i = 0; i <= 4; i++) {
        const vv = -vmax + (i * vmax) / 2;
        const x = pad2.l + (i / 4) * (w - pad2.l - pad2.r);
        ctx.fillText(vv.toFixed(1), x - 12, h - pad2.b + 14);
      }
      for (let i = 0; i <= 4; i++) {
        const Rg = (i * RmaxSim) / 4;
        const y = pad2.t + (1 - i / 4) * (h - pad2.t - pad2.b);
        ctx.fillText(Rg.toFixed(0), pad2.l - 34, y + 4);
      }
      ctx.fillText('0 在中心', pad2.l + (w - pad2.l - pad2.r) / 2 - 20, h - 8);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#fff';
      targets.forEach((tg, idx) => {
        const x = pad2.l + ((tg.v / (2 * vmax)) + 0.5) * (w - pad2.l - pad2.r);
        const y = pad2.t + (1 - tg.R / RmaxSim) * (h - pad2.t - pad2.b);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillText('T' + (idx + 1), x + 12, y + 4);
      });
    }
  }, [params, fitCanvas, drawAxes]);

  const lam = C / (params.fc * 1e9);
  const vmax = lam / (4 * params.Tc * 1e-6);
  const dv = lam / (2 * params.Nc * params.Tc * 1e-6);
  const Tf = params.Nc * params.Tc * 1e-6;

  return (
    <div>
      <h2>③ 速度测量：Chirp 序列与 2D-FFT</h2>
      <p>单个 Chirp 只能测距。要测速度，需要发射 <b>一帧 N 个 Chirp</b>，利用相邻 Chirp 之间回波的 <b>相位差</b> 估计多普勒频移。</p>

      <div className="grid">
        <div className="card">
          <h3>帧结构参数</h3>
          <div className="controls">
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
            <div className="ctrl">
              <label>
                Chirp 间隔 T<sub>c</sub>（含 idle）<b>{params.Tc} μs</b>
              </label>
              <input
                type="range"
                min="20"
                max="200"
                step="1"
                value={params.Tc}
                onChange={(e) => updateParam('Tc', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                每帧 Chirp 数 N<sub>chirp</sub> <b>{params.Nc}</b>
              </label>
              <input
                type="range"
                min="8"
                max="256"
                step="8"
                value={params.Nc}
                onChange={(e) => updateParam('Nc', e.target.value)}
              />
            </div>
          </div>
          <h3>目标</h3>
          <div className="controls">
            <div className="ctrl">
              <label>
                距离 R <b>{params.R} m</b>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={params.R}
                onChange={(e) => updateParam('R', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                速度 v（+ 远离）<b>{params.v.toFixed(1)} m/s</b>
              </label>
              <input
                type="range"
                min="-40"
                max="40"
                step="0.5"
                value={params.v}
                onChange={(e) => updateParam('v', e.target.value)}
              />
            </div>
          </div>
          <canvas ref={seqCanvas} width="700" height="220" />
          <div className="legend">
            <i style={{ background: 'var(--cyan)' }}></i>TX chirps &nbsp;
            <i style={{ background: 'var(--orange)' }}></i>RX echoes（多普勒相移逐 Chirp 累积）
          </div>
        </div>

        <div className="card">
          <h3>多普勒测速公式</h3>
          <p>
            <span className="badge">载波波长</span>
          </p>
          <div className="formula">
            λ <span className="eq">=</span> c / f<sub>c</sub>
          </div>

          <p>
            <span className="badge">相邻 Chirp 相位差</span>
          </p>
          <div className="formula">
            Δφ <span className="eq">=</span> 4π · v · T<sub>c</sub> / λ
          </div>

          <p>
            <span className="badge">速度反推</span>对慢时间做 Doppler-FFT 得峰值 f<sub>d</sub>：
          </p>
          <div className="formula">
            v <span className="eq">=</span> λ · f<sub>d</sub> / 2 &nbsp; 其中 &nbsp; f<sub>d</sub>{' '}
            <span className="eq">=</span> Δφ / (2π · T<sub>c</sub>)
          </div>

          <h3>性能指标</h3>
          <div className="metric">
            <span>最大不模糊速度 v<sub>max</sub> = λ / (4T<sub>c</sub>)</span>
            <b>{vmax.toFixed(2)} m/s</b>
          </div>
          <div className="metric">
            <span>速度分辨率 Δv = λ / (2·N<sub>chirp</sub>·T<sub>c</sub>)</span>
            <b>{dv.toFixed(3)} m/s</b>
          </div>
          <div className="metric">
            <span>帧时长 T<sub>frame</sub> = N<sub>chirp</sub>·T<sub>c</sub></span>
            <b>{(Tf * 1000).toFixed(1)} ms</b>
          </div>

          <div className="note" style={{ marginTop: '14px' }}>
            🚗 <b>速度分辨率取决于整帧时长</b>。77 GHz 下想达到 0.1 m/s 分辨率，需 T<sub>frame</sub> ≈ 19 ms。
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '18px' }}>
        <h3>
          Range-Doppler Map（2D-FFT）{' '}
          <span className="loading" style={{ display: 'none' }}>🔄 计算中...</span>
        </h3>
        <p>沿快时间做 Range-FFT，沿慢时间做 Doppler-FFT，得到二维谱图。</p>
        <canvas ref={rdCanvas} width="1200" height="360" />
        <div className="legend">
          <i style={{ background: '#22d3ee' }}></i>低能量 &nbsp;
          <i style={{ background: '#4ade80' }}></i>中 &nbsp;
          <i style={{ background: '#facc15' }}></i>高 &nbsp;
          <i style={{ background: '#ef4444' }}></i>峰值 — 目标 (R, v)
        </div>
      </div>
    </div>
  );
};

export default VelocityModule;