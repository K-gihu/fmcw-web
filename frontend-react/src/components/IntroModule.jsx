import React, { useState, useEffect, useRef, useCallback } from 'react';

const IntroModule = () => {
  const [params, setParams] = useState({
    f0: 77.0,
    B: 4.0,
    Tc: 40,
  });
  
  const chirpFreqCanvas = useRef(null);
  const chirpTimeCanvas = useRef(null);
  const blockCanvas = useRef(null);

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
    const { f0, B, Tc } = params;
    const S = (B * 1e9) / (Tc * 1e-6);

    let { ctx, w, h } = fitCanvas(chirpFreqCanvas.current);
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 50, r: 20, t: 20, b: 30 };
      drawAxes(ctx, w, h, pad, 't (μs)', 'f (GHz)');
      
      ctx.strokeStyle = '#172043';
      ctx.beginPath();
      for (let i = 1; i <= 4; i++) {
        const y = pad.t + i * (h - pad.t - pad.b) / 5;
        ctx.moveTo(pad.l, y);
        ctx.lineTo(w - pad.r, y);
      }
      for (let i = 1; i <= 4; i++) {
        const x = pad.l + i * (w - pad.l - pad.r) / 5;
        ctx.moveTo(x, pad.t);
        ctx.lineTo(x, h - pad.b);
      }
      ctx.stroke();

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;
      const fmax = f0 + B * 1.1;
      const fmin = f0 - B * 0.1;
      const yOf = (f) => pad.t + (1 - (f - fmin) / (fmax - fmin)) * ph;
      ctx.moveTo(pad.l, yOf(f0));
      ctx.lineTo(pad.l + pw, yOf(f0 + B));
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText('f₀=' + f0.toFixed(1) + ' GHz', pad.l + 4, yOf(f0) - 6);
      ctx.fillText('f₀+B=' + (f0 + B).toFixed(1) + ' GHz', pad.l + pw - 130, yOf(f0 + B) - 6);
      ctx.fillText('T₍c₎=' + Tc + ' μs', pad.l + pw - 70, h - pad.b - 8);
      ctx.fillText('斜率 S = B/T₍c₎ = ' + (S / 1e12).toFixed(2) + ' THz/s', pad.l + 10, pad.t + 16);

      for (let i = 0; i <= 5; i++) {
        const x = pad.l + i * pw / 5;
        const t = (i * Tc / 5);
        ctx.fillStyle = '#8a97c7';
        ctx.fillText(t.toFixed(0), x - 6, h - pad.b + 14);
      }
    }

    ({ ctx, w, h } = fitCanvas(chirpTimeCanvas.current));
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 50, r: 20, t: 20, b: 30 };
      drawAxes(ctx, w, h, pad, 't', 'A');
      
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const N = 1600;
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;
      
      for (let i = 0; i < N; i++) {
        const tn = i / N;
        const t = tn * Tc * 1e-6;
        const phi = 2 * Math.PI * (f0 * 1e9 * t + 0.5 * (B * 1e9 / (Tc * 1e-6)) * t * t);
        const v = Math.cos(phi);
        const x = pad.l + tn * pw;
        const y = (h - pad.t - pad.b) / 2 + pad.t - v * (h - pad.t - pad.b) / 2 * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#8a97c7';
      ctx.font = '11px sans-serif';
      ctx.fillText('→ 频率越来越密（chirp up）', pad.l + pw - 180, pad.t + 14);
    }

    ({ ctx, w, h } = fitCanvas(blockCanvas.current));
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const blocks = [
        { x: 30, y: 60, w: 110, h: 60, c: '#22d3ee', t: '波形发生器', s: 'Chirp 控制' },
        { x: 180, y: 60, w: 110, h: 60, c: '#22d3ee', t: '上变频 / PA', s: 'f₀, 倍频' },
        { x: 330, y: 60, w: 110, h: 60, c: '#22d3ee', t: 'TX 天线', s: '发射 Chirp' },
        { x: 500, y: 150, w: 140, h: 60, c: '#facc15', t: '目标（R,v,θ）', s: '反射 · 延迟 τ' },
        { x: 700, y: 60, w: 110, h: 60, c: '#fb923c', t: 'RX 天线', s: '接收回波' },
        { x: 850, y: 60, w: 110, h: 60, c: '#fb923c', t: 'LNA + 混频器', s: '与 TX 相乘' },
        { x: 1000, y: 60, w: 110, h: 60, c: '#4ade80', t: 'IF · ADC', s: '拍频 f_b' },
        { x: 1000, y: 170, w: 110, h: 60, c: '#a78bfa', t: 'DSP · 3D-FFT', s: 'R · v · θ' },
      ];

      const roundRect = (ctx, x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      };

      blocks.forEach((b) => {
        ctx.fillStyle = b.c + '22';
        ctx.strokeStyle = b.c;
        ctx.lineWidth = 1.5;
        roundRect(ctx, b.x, b.y, b.w, b.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = b.c;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(b.t, b.x + 10, b.y + 26);
        ctx.fillStyle = '#cdd6f4';
        ctx.font = '11px sans-serif';
        ctx.fillText(b.s, b.x + 10, b.y + 46);
      });

      const arrow = (x1, y1, x2, y2, col) => {
        ctx.strokeStyle = col || '#8a97c7';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const a = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 8 * Math.cos(a - 0.4), y2 - 8 * Math.sin(a - 0.4));
        ctx.lineTo(x2 - 8 * Math.cos(a + 0.4), y2 - 8 * Math.sin(a + 0.4));
        ctx.closePath();
        ctx.fillStyle = col || '#8a97c7';
        ctx.fill();
      };

      arrow(140, 90, 180, 90, '#22d3ee');
      arrow(290, 90, 330, 90, '#22d3ee');
      arrow(440, 90, 520, 150, '#22d3ee');
      arrow(620, 150, 700, 90, '#fb923c');
      arrow(810, 90, 850, 90, '#fb923c');
      arrow(960, 90, 1000, 90, '#4ade80');
      arrow(1055, 120, 1055, 170, '#a78bfa');
      
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(385, 120);
      ctx.bezierCurveTo(500, 220, 650, 220, 755, 120);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f472b6';
      ctx.font = '12px sans-serif';
      ctx.fillText('无线信道', 540, 220);
    }
  }, [params, fitCanvas, drawAxes]);

  useEffect(() => {
    const handleResize = () => {
      const event = new Event('resize');
      window.dispatchEvent(event);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      <div className="hero">
        <h1>从「啁啾」开始理解 FMCW</h1>
        <p>
          FMCW 雷达发射 <b>频率随时间线性变化</b> 的连续波（Chirp），接收回波后与发射信号做混频，
          得到频率与目标距离成正比的 <b>拍频信号 (Beat Signal)</b>。
          这是毫米波雷达（如 TI IWR系列、Infineon BGT60）的核心技术。
        </p>
        <div className="pill-row">
          <span className="pill">📈 线性调频</span>
          <span className="pill">🎯 距离·速度·角度</span>
          <span className="pill">⚡ 低成本低功耗</span>
          <span className="pill">🚗 车载 · 无人机 · 工业</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Chirp 信号波形</h3>
          <p>调整参数，观察频率 vs. 时间 与 时域波形：</p>
          <div className="controls">
            <div className="ctrl">
              <label>
                起始频率 f<sub>start</sub> <b>{params.f0.toFixed(1)} GHz</b>
              </label>
              <input
                type="range"
                min="76"
                max="81"
                step="0.1"
                value={params.f0}
                onChange={(e) => updateParam('f0', e.target.value)}
              />
            </div>
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
          </div>
          <canvas ref={chirpFreqCanvas} width="700" height="220" />
          <div className="legend">
            <i style={{ background: 'var(--cyan)' }}></i>瞬时频率 f(t) = f₀ + S·t
          </div>
          <canvas ref={chirpTimeCanvas} width="700" height="160" style={{ marginTop: '10px' }} />
          <div className="legend">
            <i style={{ background: 'var(--green)' }}></i>时域信号 cos(2π(f₀t + ½St²))
          </div>
        </div>

        <div className="card">
          <h3>核心公式速查</h3>
          <p>
            <span className="badge">Chirp 斜率</span>频率随时间线性增加：
          </p>
          <div className="formula">
            <span className="sym">S</span> <span className="eq">=</span> B / T<sub>c</sub>
          </div>

          <p>
            <span className="badge">发射信号</span>
          </p>
          <div className="formula">
            s<sub>tx</sub>(t) = A · cos( 2π( f<sub>0</sub>·t + ½·S·t² ) )
          </div>

          <p>
            <span className="badge">回波延迟</span>目标在距离 R 处：
          </p>
          <div className="formula">
            τ <span className="eq">=</span> 2R / c
          </div>

          <p>
            <span className="badge">拍频信号</span>混频后得到的中频 (IF) 频率：
          </p>
          <div className="formula">
            f<sub>b</sub> <span className="eq">=</span> S · τ <span className="eq">=</span> 2·S·R / c{' '}
            <span className="eq">=</span> 2·B·R / (c·T<sub>c</sub>)
          </div>

          <p>
            <span className="badge">距离反推</span>
          </p>
          <div className="formula">
            R <span className="eq">=</span> f<sub>b</sub> · c · T<sub>c</sub> / (2·B)
          </div>

          <div className="note">
            💡 <b>关键思想</b>：拍频 f<sub>b</sub> 与目标距离 R 成 <u>线性正比</u>。
            对 IF 信号做 FFT，频谱峰值的位置就对应目标的距离。
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '18px' }}>
        <h3>FMCW 系统框图</h3>
        <canvas ref={blockCanvas} width="1200" height="260" />
        <div className="legend">
          <i style={{ background: 'var(--cyan)' }}></i>发射链路 TX
          <i style={{ background: 'var(--orange)' }}></i>接收链路 RX
          <i style={{ background: 'var(--green)' }}></i>中频 IF / ADC
          <i style={{ background: 'var(--violet)' }}></i>DSP / FFT
        </div>
      </div>
    </div>
  );
};

export default IntroModule;