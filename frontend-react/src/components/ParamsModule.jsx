import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '../utils/math';

const ParamsModule = () => {
  const [params, setParams] = useState({
    fc: 77,
    fs: 10,
    Bmax: 4,
    Nadc: 256,
    RmaxReq: 100,
    dRreq: 0.1,
    vmaxReq: 30,
    dvReq: 0.5,
  });
  
  const sensCanvas = useRef(null);

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

  useEffect(() => {
    const { fc, fs, Bmax, RmaxReq, dRreq } = params;
    const lam = C / (fc * 1e9);
    const B = Math.min(Bmax, C / (2 * dRreq * 1e9));
    const Smax = (fs * 1e6 * C) / (4 * RmaxReq);
    const Tc = (B * 1e9) / Smax;
    const Tc_us = Tc * 1e6;
    const Tc_max_vmax = lam / (4 * params.vmaxReq);
    const Tc_us_max = Tc_max_vmax * 1e6;
    const Nc = Math.ceil(lam / (2 * params.dvReq * Tc));
    const Tf = Nc * Tc;

    const { ctx, w, h } = fitCanvas(sensCanvas.current);
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 60, r: 20, t: 20, b: 40 };
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;

      const panels = [
        { title: 'ΔR vs B (GHz)', color: '#22d3ee', fn: (B_val) => C / (2 * B_val * 1e9), xrange: [0.5, 6], yunit: 'm' },
        { title: 'Rmax vs Tc (μs)', color: '#fb923c', fn: (Tc_val) => (fs * 1e6 * C * (Tc_val * 1e-6)) / (4 * B * 1e9), xrange: [10, 200], yunit: 'm' },
        { title: 'vmax vs Tc (μs)', color: '#4ade80', fn: (Tc_val) => lam / (4 * Tc_val * 1e-6), xrange: [10, 200], yunit: 'm/s' },
        { title: 'Δv vs Nchirp', color: '#a78bfa', fn: (N) => lam / (2 * N * Tc), xrange: [8, 256], yunit: 'm/s' },
      ];

      const pW = (pw - 30) / 4;
      panels.forEach((p, idx) => {
        const ox = pad.l + idx * (pW + 10);
        const oy = pad.t;
        ctx.strokeStyle = '#253163';
        ctx.strokeRect(ox, oy, pW, ph);
        ctx.fillStyle = '#cdd6f4';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(p.title, ox + 6, oy + 14);

        const N = 80;
        const ys = [];
        let ymin = Infinity, ymax = -Infinity;
        for (let i = 0; i < N; i++) {
          const x = p.xrange[0] + (i / (N - 1)) * (p.xrange[1] - p.xrange[0]);
          const y = p.fn(x);
          ys.push(y);
          if (y < ymin) ymin = y;
          if (y > ymax) ymax = y;
        }

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const x = ox + (i / (N - 1)) * pW;
          const y = oy + ph - ((ys[i] - ymin) / (ymax - ymin)) * ph * 0.9 - ph * 0.05;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#8a97c7';
        ctx.font = '10px sans-serif';
        ctx.fillText(ymax.toFixed(2), ox + 2, oy + 26);
        ctx.fillText(ymin.toFixed(2), ox + 2, oy + ph - 4);
        ctx.fillText(p.xrange[0], ox + 2, oy + ph + 12);
        ctx.fillText(p.xrange[1], ox + pW - 24, oy + ph + 12);
      });
    }
  }, [params, fitCanvas]);

  const lam = C / (params.fc * 1e9);
  const B = Math.min(params.Bmax, C / (2 * params.dRreq * 1e9));
  const Smax = (params.fs * 1e6 * C) / (4 * params.RmaxReq);
  const Tc = (B * 1e9) / Smax;
  const Tc_us = Tc * 1e6;
  const Rmax_actual = (params.fs * 1e6 * C * Tc) / (4 * B * 1e9);
  const Tc_max_vmax = lam / (4 * params.vmaxReq);
  const Tc_us_max = Tc_max_vmax * 1e6;
  const vmax_actual = lam / (4 * Math.max(Tc, Tc_max_vmax));
  const Nc = Math.ceil(lam / (2 * params.dvReq * Tc));
  const dv_actual = lam / (2 * Nc * Tc);
  const Tf = Nc * Tc;

  const checks = [];
  if (B < C / (2 * params.dRreq * 1e9)) {
    checks.push({
      ok: false,
      t: `❌ 带宽受限：需 ${(C / (2 * params.dRreq * 1e9)).toFixed(2)} GHz 才能达到 ΔR=${params.dRreq} m，但最大只有 ${params.Bmax} GHz`,
    });
  } else {
    checks.push({ ok: true, t: '✅ 距离分辨率达标' });
  }
  if (Tc_us > Tc_us_max) {
    checks.push({
      ok: false,
      t: `❌ v<sub>max</sub> 冲突：要 vmax≥${params.vmaxReq} m/s，T<sub>c</sub> 必须 ≤ ${Tc_us_max.toFixed(1)} μs`,
    });
  } else {
    checks.push({ ok: true, t: '✅ 最大速度达标' });
  }
  if (Tf > 0.1) {
    checks.push({ ok: false, t: `⚠ 帧时长 ${(Tf * 1000).toFixed(0)} ms，>100 ms 可能影响实时性` });
  } else {
    checks.push({ ok: true, t: '✅ 帧时长合理' });
  }
  if (Nc > 512) {
    checks.push({ ok: false, t: `⚠ N<sub>chirp</sub>=${Nc} 偏大，DSP 负担重` });
  } else {
    checks.push({ ok: true, t: '✅ N<sub>chirp</sub> 合理' });
  }

  const results = [
    ['推荐带宽 B', `${B.toFixed(3)} GHz`],
    ['推荐斜率 S', `${(Smax / 1e12).toFixed(2)} THz/s`],
    ['Chirp 时长 T<sub>c</sub>', `${Tc_us.toFixed(1)} μs`],
    ['每帧 Chirp 数 N<sub>chirp</sub>', Nc],
    ['帧时长 T<sub>frame</sub>', `${(Tf * 1000).toFixed(1)} ms`],
    ['实际 R<sub>max</sub>', `${Rmax_actual.toFixed(1)} m`],
    ['实际 ΔR', `${(C / (2 * B * 1e9) * 100).toFixed(2)} cm`],
    ['实际 v<sub>max</sub>', `${vmax_actual.toFixed(2)} m/s`],
    ['实际 Δv', `${dv_actual.toFixed(3)} m/s`],
    ['波长 λ', `${(lam * 1000).toFixed(2)} mm`],
  ];

  return (
    <div>
      <h2>⑤ 参数设计器：倒推 Chirp & 帧配置</h2>
      <p>给定系统约束（ADC 采样率、期望性能）和应用需求（最大距离、速度、分辨率），自动推荐 Chirp 与帧参数。</p>

      <div className="grid">
        <div className="card">
          <h3>输入：系统约束</h3>
          <div className="controls">
            <div className="ctrl">
              <label>
                载频 f<sub>c</sub> (GHz) <b>{params.fc}</b>
              </label>
              <input
                type="number"
                value={params.fc}
                onChange={(e) => updateParam('fc', e.target.value)}
                step="1"
              />
            </div>
            <div className="ctrl">
              <label>
                ADC 采样率 f<sub>s</sub> (MHz) <b>{params.fs}</b>
              </label>
              <input
                type="number"
                value={params.fs}
                onChange={(e) => updateParam('fs', e.target.value)}
                step="1"
              />
            </div>
            <div className="ctrl">
              <label>
                可用带宽 B<sub>max</sub> (GHz) <b>{params.Bmax}</b>
              </label>
              <input
                type="number"
                value={params.Bmax}
                onChange={(e) => updateParam('Bmax', e.target.value)}
                step="0.1"
              />
            </div>
            <div className="ctrl">
              <label>
                ADC 样本数 N<sub>ADC</sub> <b>{params.Nadc}</b>
              </label>
              <input
                type="number"
                value={params.Nadc}
                onChange={(e) => updateParam('Nadc', e.target.value)}
                step="64"
              />
            </div>
          </div>
          <h3>输入：性能目标</h3>
          <div className="controls">
            <div className="ctrl">
              <label>
                最大距离 R<sub>max</sub> (m) <b>{params.RmaxReq}</b>
              </label>
              <input
                type="number"
                value={params.RmaxReq}
                onChange={(e) => updateParam('RmaxReq', e.target.value)}
                step="10"
              />
            </div>
            <div className="ctrl">
              <label>
                距离分辨率 ΔR (m) <b>{params.dRreq}</b>
              </label>
              <input
                type="number"
                value={params.dRreq}
                onChange={(e) => updateParam('dRreq', e.target.value)}
                step="0.01"
              />
            </div>
            <div className="ctrl">
              <label>
                最大速度 v<sub>max</sub> (m/s) <b>{params.vmaxReq}</b>
              </label>
              <input
                type="number"
                value={params.vmaxReq}
                onChange={(e) => updateParam('vmaxReq', e.target.value)}
                step="5"
              />
            </div>
            <div className="ctrl">
              <label>
                速度分辨率 Δv (m/s) <b>{params.dvReq}</b>
              </label>
              <input
                type="number"
                value={params.dvReq}
                onChange={(e) => updateParam('dvReq', e.target.value)}
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>🎯 推荐参数</h3>
          <div className="kv">
            {results.map(([k, v], i) => (
              <React.Fragment key={i}>
                <div dangerouslySetInnerHTML={{ __html: k }} />
                <b>{v}</b>
              </React.Fragment>
            ))}
          </div>

          <h3>校验</h3>
          <div style={{ fontSize: '13px' }}>
            {checks.map((c, i) => (
              <div
                key={i}
                style={{ padding: '4px 0', color: c.ok ? '#cdd6f4' : '#ef4444' }}
                dangerouslySetInnerHTML={{ __html: c.t }}
              />
            ))}
          </div>

          <div className="note" style={{ marginTop: '14px' }}>
            💡 <b>设计顺序</b>：① 由 ΔR 定 B；② 由 R<sub>max</sub> 和 f<sub>s</sub> 定 S 和 T<sub>c</sub>；③ 由 v<sub>max</sub> 定 T<sub>c</sub> 上限；④ 由 Δv 定 N<sub>chirp</sub>。
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '18px' }}>
        <h3>参数敏感性图</h3>
        <canvas ref={sensCanvas} width="1200" height="260" />
        <div className="legend">
          <i style={{ background: 'var(--cyan)' }}></i>ΔR vs B
          <i style={{ background: 'var(--orange)' }}></i>R<sub>max</sub> vs T<sub>c</sub>
          <i style={{ background: 'var(--green)' }}></i>v<sub>max</sub> vs T<sub>c</sub>
          <i style={{ background: 'var(--violet)' }}></i>Δv vs N<sub>chirp</sub>
        </div>
      </div>
    </div>
  );
};

export default ParamsModule;