import React from 'react';

const tabs = [
  { id: 'intro', label: '① 基础原理' },
  { id: 'range', label: '② 距离测量' },
  { id: 'velocity', label: '③ 速度与2D-FFT' },
  { id: 'angle', label: '④ 角度测量' },
  { id: 'params', label: '⑤ 参数设计器' },
  { id: 'sim', label: '⑥ 综合仿真' },
];

const TabNavigation = ({ activeTab, onTabChange }) => {
  return (
    <nav style={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={activeTab === tab.id ? 'active' : ''}
          style={activeTab === tab.id ? styles.activeButton : styles.button}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

const styles = {
  tabs: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '14px',
  },
  button: {
    background: 'transparent',
    color: '#8a97c7',
    border: '1px solid #253163',
    padding: '8px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: '0.2s',
    fontWeight: '500',
  },
  activeButton: {
    background: 'linear-gradient(90deg, rgba(34, 211, 238, 0.13), rgba(167, 139, 250, 0.13))',
    color: '#fff',
    borderColor: '#22d3ee',
    boxShadow: '0 0 0 1px rgba(34, 211, 238, 0.33) inset',
    padding: '8px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: '0.2s',
    fontWeight: '500',
  },
};

export default TabNavigation;