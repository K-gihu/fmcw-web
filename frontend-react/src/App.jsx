import React, { useState, useEffect } from 'react';
import TabNavigation from './components/TabNavigation';
import IntroModule from './components/IntroModule';
import RangeModule from './components/RangeModule';
import VelocityModule from './components/VelocityModule';
import AngleModule from './components/AngleModule';
import ParamsModule from './components/ParamsModule';
import SimModule from './components/SimModule';
import './styles/global.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('intro');
  const [backendStatus, setBackendStatus] = useState('checking...');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8001/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          setBackendStatus('已连接 (Python/NumPy)');
        } else {
          throw new Error('Backend returned error');
        }
      } catch (e) {
        setBackendStatus('未连接 (使用前端近似)');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 3000);
    return () => clearInterval(interval);
  }, []);

  const renderModule = () => {
    switch (activeTab) {
      case 'intro':
        return <IntroModule />;
      case 'range':
        return <RangeModule />;
      case 'velocity':
        return <VelocityModule />;
      case 'angle':
        return <AngleModule />;
      case 'params':
        return <ParamsModule />;
      case 'sim':
        return <SimModule />;
      default:
        return <IntroModule />;
    }
  };

  return (
    <div>
      <header>
        <div className="header-wrap">
          <div className="title">📡 FMCW Radar · Interactive Lab</div>
          <div className="subtitle">Frequency-Modulated Continuous Wave 雷达原理 · 公式 · 仿真</div>
          <div className="status-bar">
            <span>计算后端: <span className={backendStatus.includes('已连接') ? 'online' : 'offline'}>{backendStatus}</span></span>
          </div>
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </header>
      <main>
        {renderModule()}
      </main>
      <footer>© FMCW Radar Interactive Lab · 仅用于学习理解原理，参数仅作示意</footer>
    </div>
  );
};

export default App;