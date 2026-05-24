import React, { useState, useEffect, useCallback } from 'react';
import api from './services/api';
import ws from './services/websocket';
import RangeFFTChart from './components/RangeFFTChart';
import RangeDopplerChart from './components/RangeDopplerChart';
import AngleFFTChart from './components/AngleFFTChart';

const App = () => {
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [useWebSocket, setUseWebSocket] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const [simulationData, setSimulationData] = useState(null);

  useEffect(() => {
    checkBackend();
  }, []);

  useEffect(() => {
    if (useWebSocket) {
      ws.connect('ws://localhost:8000/ws/simulation');
      ws.on('message', handleWebSocketMessage);
    }
    return () => {
      ws.disconnect();
    };
  }, [useWebSocket]);

  const checkBackend = async () => {
    try {
      await api.healthCheck();
      setBackendStatus('connected (v2.0)');
    } catch (e) {
      setBackendStatus('disconnected');
    }
  };

  const handleWebSocketMessage = (data) => {
    if (data.type === 'simulation_result') {
      setSimulationData(data.data);
      setLoading(false);
    }
  };

  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      if (useWebSocket) {
        ws.send({
          action: 'simulate',
          targets,
          ...config,
        });
      } else {
        const result = await api.computeSimulation({
          targets,
          ...config,
        });
        setSimulationData(result);
        setLoading(false);
      }
    } catch (e) {
      console.error('Simulation failed:', e);
      setLoading(false);
    }
  }, [targets, config, useWebSocket]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateTarget = (index, key, value) => {
    setTargets(prev => {
      const newTargets = [...prev];
      newTargets[index] = { ...newTargets[index], [key]: value };
      return newTargets;
    });
  };

  const addTarget = () => {
    setTargets(prev => [...prev, { R: 40, v: 0, th: 0, amp: 0.8 }]);
  };

  const removeTarget = (index) => {
    setTargets(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>📡 FMCW Radar · Interactive Lab v2.0</h1>
          <p style={styles.subtitle}>Frequency-Modulated Continuous Wave 雷达原理 · 公式 · 仿真</p>
          <div style={styles.statusBar}>
            <span style={styles.status}>
              后端状态: <span style={{ ...styles.statusText, color: backendStatus.includes('connected') ? '#4ade80' : '#ef4444' }}>
                {backendStatus}
              </span>
            </span>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={useWebSocket}
                onChange={(e) => setUseWebSocket(e.target.checked)}
                style={styles.checkbox}
              />
              使用 WebSocket 实时通信
            </label>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>⚙️ 雷达配置</h3>
            <div style={styles.controls}>
              {Object.entries(config).map(([key, value]) => (
                <div key={key} style={styles.control}>
                  <label style={styles.label}>
                    {key === 'fc' && 'fc (GHz)'}
                    {key === 'B' && 'B (GHz)'}
                    {key === 'Tc' && 'Tc (μs)'}
                    {key === 'Nc' && 'Nc (chirps)'}
                    {key === 'Nrx' && 'Nrx (antennas)'}
                    {key === 'noise' && '噪声 σ'}
                    <b style={styles.value}>{value}</b>
                  </label>
                  <input
                    type={key === 'noise' ? 'range' : 'number'}
                    value={value}
                    onChange={(e) => updateConfig(key, Number(e.target.value))}
                    min={key === 'noise' ? 0 : 0.1}
                    max={key === 'noise' ? 1 : 200}
                    step={key === 'noise' ? 0.05 : 1}
                    style={key === 'noise' ? styles.rangeInput : styles.numberInput}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🎯 目标配置</h3>
            <div style={styles.targetsList}>
              {targets.map((target, index) => (
                <div key={index} style={styles.targetRow}>
                  <span style={styles.targetIndex}>T{index + 1}</span>
                  <div style={styles.targetInput}>
                    <span style={styles.inputLabel}>R(m)</span>
                    <input
                      type="number"
                      value={target.R}
                      onChange={(e) => updateTarget(index, 'R', Number(e.target.value))}
                      style={styles.smallInput}
                    />
                  </div>
                  <div style={styles.targetInput}>
                    <span style={styles.inputLabel}>v(m/s)</span>
                    <input
                      type="number"
                      value={target.v}
                      onChange={(e) => updateTarget(index, 'v', Number(e.target.value))}
                      style={styles.smallInput}
                    />
                  </div>
                  <div style={styles.targetInput}>
                    <span style={styles.inputLabel}>θ(°)</span>
                    <input
                      type="number"
                      value={target.th}
                      onChange={(e) => updateTarget(index, 'th', Number(e.target.value))}
                      style={styles.smallInput}
                    />
                  </div>
                  <div style={styles.targetInput}>
                    <span style={styles.inputLabel}>amp</span>
                    <input
                      type="number"
                      value={target.amp}
                      onChange={(e) => updateTarget(index, 'amp', Number(e.target.value))}
                      step="0.1"
                      style={styles.smallInput}
                    />
                  </div>
                  <button
                    onClick={() => removeTarget(index)}
                    style={styles.removeButton}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addTarget} style={styles.addButton}>
              + 添加目标
            </button>
          </div>
        </div>

        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>计算中...</p>
          </div>
        )}

        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <RangeFFTChart
              data={simulationData?.range_spectrum}
              targets={targets}
            />
          </div>
          <div style={styles.chartCard}>
            <RangeDopplerChart data={simulationData?.range_doppler} />
          </div>
          <div style={styles.chartCard}>
            <AngleFFTChart
              data={simulationData?.angle_spectrum}
              targets={targets}
            />
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        © FMCW Radar Interactive Lab v2.0 · React + ECharts + FastAPI
      </footer>
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0b1020 0%, #0a0f1a 100%)',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(11, 16, 32, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #253163',
    padding: '20px',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #22d3ee, #a78bfa, #f472b6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    color: '#8a97c7',
    fontSize: '14px',
    marginTop: '8px',
    margin: 0,
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    padding: '12px 16px',
    background: '#111a33',
    borderRadius: '8px',
    border: '1px solid #253163',
  },
  status: {
    fontSize: '14px',
    color: '#8a97c7',
  },
  statusText: {
    fontWeight: '600',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#8a97c7',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#22d3ee',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    background: 'linear-gradient(180deg, #111a33, #182347)',
    border: '1px solid #253163',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
  },
  cardTitle: {
    color: '#22d3ee',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  controls: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  control: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    color: '#8a97c7',
    display: 'flex',
    justifyContent: 'space-between',
  },
  value: {
    color: '#22d3ee',
    fontWeight: '600',
  },
  numberInput: {
    background: '#0a1230',
    color: '#e6ecff',
    border: '1px solid #253163',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
  },
  rangeInput: {
    width: '100%',
    accentColor: '#22d3ee',
  },
  targetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  targetRow: {
    display: 'grid',
    gridTemplateColumns: '50px repeat(4, 1fr) 40px',
    gap: '10px',
    alignItems: 'center',
    padding: '12px',
    background: '#0a1230',
    borderRadius: '8px',
    border: '1px solid #253163',
  },
  targetIndex: {
    color: '#22d3ee',
    fontWeight: '700',
    fontSize: '14px',
  },
  targetInput: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputLabel: {
    fontSize: '11px',
    color: '#8a97c7',
  },
  smallInput: {
    background: '#060b1c',
    color: '#e6ecff',
    border: '1px solid #253163',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '13px',
    width: '100%',
  },
  removeButton: {
    background: '#3a1020',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    borderRadius: '6px',
    padding: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  addButton: {
    width: '100%',
    background: 'linear-gradient(90deg, #22d3ee, #4ade80)',
    color: '#062016',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#22d3ee',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #253163',
    borderTopColor: '#22d3ee',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  chartCard: {
    background: 'linear-gradient(180deg, #111a33, #182347)',
    border: '1px solid #253163',
    borderRadius: '16px',
    padding: '20px',
    height: '400px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
  },
  footer: {
    textAlign: 'center',
    padding: '30px',
    color: '#8a97c7',
    fontSize: '13px',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;