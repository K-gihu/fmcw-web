import React, { useState, useCallback } from 'react';
import RangeFFTChart from './RangeFFTChart';
import RangeDopplerChart from './RangeDopplerChart';
import AngleFFTChart from './AngleFFTChart';

const SimModule = () => {
  const [config, setConfig] = useState({
    fc: 77,
    B: 4,
    Tc: 40,
    Nc: 64,
    Nrx: 4,
    noise: 0.15,
  });

  const [targets, setTargets] = useState([
    { R: 15, v: 10, th: -15, amp: 1.0 },
    { R: 35, v: -5, th: 20, amp: 0.8 },
    { R: 55, v: 0, th: 40, amp: 0.6 },
  ]);

  const updateConfig = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, [key]: Number(value) }));
  }, []);

  const updateTarget = useCallback((index, key, value) => {
    setTargets(prev => {
      const newTargets = [...prev];
      newTargets[index] = { ...newTargets[index], [key]: Number(value) };
      return newTargets;
    });
  }, []);

  const addTarget = useCallback(() => {
    setTargets(prev => [...prev, { R: 40, v: 0, th: 0, amp: 0.8 }]);
  }, []);

  const removeTarget = useCallback((index) => {
    setTargets(prev => prev.filter((_, i) => i !== index));
  }, []);

  const mockRangeSpectrum = {
    ranges: Array.from({ length: 128 }, (_, i) => i * 1.5),
    magnitudes: targets.flatMap(tg => {
      const peakIndex = Math.round(tg.R / 1.5);
      const result = new Array(128).fill(0.05 + Math.random() * 0.05);
      for (let i = peakIndex - 5; i <= peakIndex + 5; i++) {
        if (i >= 0 && i < 128) {
          const dist = Math.abs(i - peakIndex);
          result[i] = tg.amp * (1 - dist / 10) + Math.random() * 0.05;
        }
      }
      return result;
    }).map((_, i, arr) => {
      let sum = 0;
      for (let j = 0; j < targets.length; j++) {
        sum += arr[i + j * 128] || 0;
      }
      return Math.min(sum, 1);
    }),
  };

  const mockRangeDoppler = (() => {
    const Rmax = 100;
    const vmax = 30;
    const ranges = Array.from({ length: 60 }, (_, i) => i * Rmax / 60);
    const velocities = Array.from({ length: 100 }, (_, i) => (i / 100 - 0.5) * 2 * vmax);
    const spectrum = Array.from({ length: 60 }, () => new Array(100).fill(0));
    
    targets.forEach(tg => {
      const rIdx = Math.round((tg.R / Rmax) * 59);
      const vIdx = Math.round(((tg.v / (2 * vmax)) + 0.5) * 99);
      for (let dr = -3; dr <= 3; dr++) {
        for (let dv = -3; dv <= 3; dv++) {
          const ri = rIdx + dr;
          const vi = vIdx + dv;
          if (ri >= 0 && ri < 60 && vi >= 0 && vi < 100) {
            const dist = Math.sqrt(dr * dr + dv * dv);
            spectrum[ri][vi] += tg.amp * (1 - dist / 5) * 0.8;
          }
        }
      }
    });
    
    spectrum.forEach((row, ri) => {
      row.forEach((val, vi) => {
        spectrum[ri][vi] = Math.min(val + Math.random() * 0.05, 1);
      });
    });
    
    return { ranges, velocities, spectrum };
  })();

  const mockAngleSpectrum = {
    angles: Array.from({ length: 360 }, (_, i) => -90 + i * 180 / 360),
    magnitudes: targets.flatMap(tg => {
      const peakIndex = Math.round((tg.th + 90) / 0.5);
      const result = new Array(360).fill(0.03 + Math.random() * 0.02);
      for (let i = peakIndex - 10; i <= peakIndex + 10; i++) {
        if (i >= 0 && i < 360) {
          const dist = Math.abs(i - peakIndex);
          result[i] = tg.amp * Math.exp(-dist / 8) + Math.random() * 0.03;
        }
      }
      return result;
    }).map((_, i, arr) => {
      let sum = 0;
      for (let j = 0; j < targets.length; j++) {
        sum += arr[i + j * 360] || 0;
      }
      return Math.min(sum, 1);
    }),
  };

  return (
    <div>
      <h2>⑥ 综合仿真：多目标场景</h2>
      <p>配置多个 (R, v, θ) 目标，查看完整的 <b>距离谱 · Range-Doppler Map · 角度谱</b> 三视图。</p>

      <div className="grid">
        <div className="card">
          <h3>雷达配置</h3>
          <div className="controls">
            <div className="ctrl">
              <label>
                f<sub>c</sub> (GHz) <b>{config.fc}</b>
              </label>
              <input
                type="number"
                value={config.fc}
                onChange={(e) => updateConfig('fc', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                B (GHz) <b>{config.B}</b>
              </label>
              <input
                type="number"
                value={config.B}
                onChange={(e) => updateConfig('B', e.target.value)}
                step="0.1"
              />
            </div>
            <div className="ctrl">
              <label>
                T<sub>c</sub> (μs) <b>{config.Tc}</b>
              </label>
              <input
                type="number"
                value={config.Tc}
                onChange={(e) => updateConfig('Tc', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                N<sub>chirp</sub> <b>{config.Nc}</b>
              </label>
              <input
                type="number"
                value={config.Nc}
                onChange={(e) => updateConfig('Nc', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                N<sub>rx</sub> <b>{config.Nrx}</b>
              </label>
              <input
                type="number"
                value={config.Nrx}
                onChange={(e) => updateConfig('Nrx', e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label>
                噪声 σ <b>{config.noise}</b>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.noise}
                onChange={(e) => updateConfig('noise', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>目标列表</h3>
          <div>
            {targets.map((tg, i) => (
              <div key={i} className="target-row" style={{ gridTemplateColumns: '60px 1fr 1fr 1fr 1fr 40px' }}>
                <span style={{ color: 'var(--cyan)' }}>T{i + 1}</span>
                <label style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  R(m)<input
                    type="number"
                    value={tg.R}
                    onChange={(e) => updateTarget(i, 'R', e.target.value)}
                  />
                </label>
                <label style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  v(m/s)<input
                    type="number"
                    value={tg.v}
                    onChange={(e) => updateTarget(i, 'v', e.target.value)}
                    step="1"
                  />
                </label>
                <label style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  θ(°)<input
                    type="number"
                    value={tg.th}
                    onChange={(e) => updateTarget(i, 'th', e.target.value)}
                    step="5"
                  />
                </label>
                <label style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  amp<input
                    type="number"
                    value={tg.amp}
                    onChange={(e) => updateTarget(i, 'amp', e.target.value)}
                    step="0.1"
                  />
                </label>
                <button className="del" onClick={() => removeTarget(i)}>✕</button>
              </div>
            ))}
          </div>
          <button className="add" onClick={addTarget}>＋ 添加目标</button>
          <div className="warn" style={{ marginTop: '10px' }}>
            ⚠ 简化仿真：忽略 RCS 起伏、相位噪声、IQ 不平衡，仅演示原理。
          </div>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: '18px' }}>
        <div className="card">
          <h3>距离谱</h3>
          <div style={{ height: '280px' }}>
            <RangeFFTChart data={mockRangeSpectrum} targets={targets} />
          </div>
        </div>
        <div className="card">
          <h3>Range-Doppler</h3>
          <div style={{ height: '280px' }}>
            <RangeDopplerChart data={mockRangeDoppler} />
          </div>
        </div>
        <div className="card">
          <h3>角度谱</h3>
          <div style={{ height: '280px' }}>
            <AngleFFTChart data={mockAngleSpectrum} targets={targets} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimModule;