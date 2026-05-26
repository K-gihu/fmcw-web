import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '../utils/math';

const RangeModule = () => {
  const [params, setParams] = useState({
    B: 4.0,
    Tc: 40,
    fs: 10,
    N: 256,
  });
  
  const [targets, setTargets] = useState([
    { R: 20, amp: 1.0 },
    { R: 35, amp: 0.7 },
    { R: 60, amp: 0.85 },
  ]);
  
  const ifCanvas = useRef(null);
  const fftCanvas = useRef(null);
  const [loading, setLoading] = useState(false);

  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }));
  }, []);

  const addTarget = useCallback(() => {
    setTargets(prev => [...prev, { R: 50, amp: 0.8 }]);
  }, []);

  const removeTarget = useCallback((index) => {
    setTargets(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateTarget = useCallback((index, key, value) => {
    setTargets(prev => {
      const newTargets = [...prev];
      newTargets[index] = { ...newTargets[index], [key]: parseFloat(value) };
      return newTargets;
    });
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
    const { B, Tc, fs, N } = params;
    const S = (B * 1e9) / (Tc * 1e-6);
    const dR = C / (2 * B * 1e9);
    const Rmax = (fs * 1e6) * C * (Tc * 1e-6) / (4 * B * 1e9);
    const bin = Rmax / (N / 2);

    let { ctx, w, h } = fitCanvas(ifCanvas.current);
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 50, r: 20, t: 20, b: 30 };
      drawAxes(ctx, w, h, pad, 't (μs)', 'I(t)');
      
      const M = 800;
      const sig = new Array(M).fill(0);
      targets.forEach((tg) => {
        const fb = (2 * S * tg.R) / C;
        const ph = Math.random() * 2 * Math.PI;
        for (let i = 0; i < M; i++) {
          const t = (i / M) * Tc * 1e-6;
          sig[i] += tg.amp * Math.cos(2 * Math.PI * fb * t + ph);
        }
      });
      const mx = Math.max(...sig.map(Math.abs)) || 1;
      
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < M; i++) {
        const x = pad.l + (i / M) * (w - pad.l - pad.r);
        const y = (h - pad.t - pad.b) / 2 + pad.t - (sig[i] / mx) * (h - pad.t - pad.b) / 2 * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      ctx.fillStyle = '#8a97c7';
      ctx.font = '11px sans-serif';
      for (let i = 0; i <= 5; i++) {
        const x = pad.l + (i * (w - pad.l - pad.r)) / 5;
        ctx.fillText(((i * Tc) / 5).toFixed(0), x - 8, h - pad.b + 14);
      }
    }

    ({ ctx, w, h } = fitCanvas(fftCanvas.current));
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 50, r: 20, t: 20, b: 30 };
      drawAxes(ctx, w, h, pad, 'R (m)', '|FFT|');
      
      const half = N / 2;
      const spec = new Array(half).fill(0);
      
      for (let k = 0; k < half; k++) {
        let re = 0, im = 0;
        targets.forEach((tg) => {
          const fb = (2 * S * tg.R) / C;
          const binK = (fb * N) / (fs * 1e6);
          const delta = k - binK;
          const dir = Math.abs(delta) < 1e-6 ? N : Math.sin(Math.PI * delta) / Math.sin((Math.PI * delta) / N);
          re += tg.amp * dir;
        });
        spec[k] = Math.abs(re);
      }
      
      const smx = Math.max(...spec) || 1;
      const grd = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
      grd.addColorStop(0, '#fb923c');
      grd.addColorStop(1, '#fb923c00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(pad.l, h - pad.b);
      for (let k = 0; k < half; k++) {
        const R = (k * Rmax) / half;
        const x = pad.l + (R / Rmax) * (w - pad.l - pad.r);
        const y = h - pad.b - (spec[k] / smx) * (h - pad.t - pad.b) * 0.95;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w - pad.r, h - pad.b);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let k = 0; k < half; k++) {
        const R = (k * Rmax) / half;
        const x = pad.l + (R / Rmax) * (w - pad.l - pad.r);
        const y = h - pad.b - (spec[k] / smx) * (h - pad.t - pad.b) * 0.95;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      targets.forEach((tg) => {
        if (tg.R <= Rmax) {
          const x = pad.l + (tg.R / Rmax) * (w - pad.l - pad.r);
          ctx.strokeStyle = '#fff';
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(x, pad.t + 8);
          ctx.lineTo(x, h - pad.b);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillText(`${tg.R}m`, x + 4, pad.t + 18);
        }
      });
      
      ctx.fillStyle = '#8a97c7';
      ctx.font = '11px sans-serif';
      for (let i = 0; i <= 5; i++) {
        const R = (i * Rmax) / 5;
        const x = pad.l + (i * (w - pad.l - pad.r)) / 5;
        ctx.fillText(R.toFixed(0), x - 8, h - pad.b + 14);
      }
    }
  }, [params, targets, fitCanvas, drawAxes]);

  return (
    <div>
      <h2>② 距离测量：从拍频到距离谱</h2>
      <p>混频后的 IF 信号经 ADC 采样，做 <b>Range-FFT</b> 即可得到距离谱。每个峰值对应一个目标。</p>

      <div className="grid">
        <div className="card">
          <h3>目标配置</h3>
          <div>
            {targets.map((tg, i) => (
              <div key={i} className="target-row">
                <span style={{ color: 'var(--cyan)' }}>目标 {i + 1}</span>
                <label style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  R(m)<input
                    type="number"
                    value={tg.R}
                    onChange={(e) => updateTarget(i, 'R', e.target.value)}
                  />
                </label>
                <label style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  幅度<input
                    type="number"
                    step="0.1"
                    value={tg.amp}
                    onChange={(e) => updateTarget(i, 'amp', e.target.value)}
                  />
                </label>
                <span></span>
                <button className="del" onClick={() => removeTarget(i)}>✕</button>
              </div>
            ))}
          </div>
          <button className="add" onClick={addTarget}>＋ 添加目标</button>

          <h3>雷达参数</h3>
          <div className="controls">
            <div className="ctrl">
              <label>
                带宽 B <b>{params.B.toFixed(1)} GHz</b>
              </label>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.1"
                value={params.B}
                onChange={(e) => updateParam('B', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                Chirp 时长 T<sub>c</sub> <b>{params.Tc} μs</b>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={params.Tc}
                onChange={(e) => updateParam('Tc', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                ADC 采样率 f<sub>s</sub> <b>{params.fs} MHz</b>
              </label>
              <input
                type="range"
                min="2"
                max="40"
                step="1"
                value={params.fs}
                onChange={(e) => updateParam('fs', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                FFT 点数 N <b>{params.N}</b>
              </label>
              <select
                value={params.N}
                onChange={(e) => updateParam('N', e.target.value)}
              >
                <option>128</option>
                <option>256</option>
                <option>512</option>
                <option>1024</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>关键性能指标</h3>
          <div className="metric">
            <span>距离分辨率 ΔR = c / (2B)</span>
            <b>{((C / (2 * params.B * 1e9)) * 100).toFixed(2)} cm</b>
          </div>
          <div className="metric">
            <span>最大不模糊距离 R<sub>max</sub> = f<sub>s</sub>·c·T<sub>c</sub> / (4B)</span>
            <b>{((params.fs * 1e6 * C * params.Tc * 1e-6) / (4 * params.B * 1e9)).toFixed(1)} m</b>
          </div>
          <div className="metric">
            <span>Chirp 斜率 S = B / T<sub>c</sub></span>
            <b>{((params.B * 1e9) / (params.Tc * 1e-6) / 1e12).toFixed(2)} THz/s</b>
          </div>
          <div className="metric">
            <span>距离 bin 宽度 = R<sub>max</sub> / (N/2)</span>
            <b>{(((params.fs * 1e6 * C * params.Tc * 1e-6) / (4 * params.B * 1e9)) / (params.N / 2) * 100).toFixed(2)} cm</b>
          </div>

          <div className="note" style={{ marginTop: '14px' }}>
            📐 <b>距离分辨率只取决于带宽 B</b>，与 Chirp 时长无关。B = 4 GHz 时 ΔR ≈ 3.75 cm，这是 77 GHz 车载雷达的典型指标。
          </div>
          <div className="warn" style={{ marginTop: '10px' }}>
            ⚠ R<sub>max</sub> 受限于 ADC 采样率：拍频 f<sub>b</sub> ≤ f<sub>s</sub>/2（奈奎斯特）。
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '18px' }}>
        <h3>
          拍频信号 · 时域 & 频谱{' '}
          {loading && (
            <span className="loading" style={{ display: 'inline' }}>🔄 计算中...</span>
          )}
        </h3>
        <canvas ref={ifCanvas} width="1200" height="220" />
        <div className="legend">
          <i style={{ background: 'var(--green)' }}></i>IF 信号 I(t) = Σ cos(2π f<sub>b,i</sub> t + φ<sub>i</sub>)
        </div>
        <canvas ref={fftCanvas} width="1200" height="260" style={{ marginTop: '12px' }} />
        <div className="legend">
          <i style={{ background: 'var(--orange)' }}></i>Range-FFT 幅度谱（峰值 ↔ 目标距离）
        </div>
      </div>
    </div>
  );
};

export default RangeModule;