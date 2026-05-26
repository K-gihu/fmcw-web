import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#ef4444'
        }}>
          <h3>图表加载出错</h3>
          <p style={{ fontSize: '12px', color: '#8a97c7' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#253163',
              color: '#22d3ee',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;