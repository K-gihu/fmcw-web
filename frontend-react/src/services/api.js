const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    return this.request('/health');
  }

  async computeRangeFFT(data) {
    return this.request('/api/range-fft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async computeVelocityFFT(data) {
    return this.request('/api/velocity-fft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async computeAngleFFT(data) {
    return this.request('/api/angle-fft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async computeSimulation(data) {
    return this.request('/api/simulation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiService();