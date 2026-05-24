
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import numpy as np
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os

app = FastAPI(title="FMCW Radar API")

# CORS配置，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 光速常量
C = 299792458.0

# 数据模型
class Target(BaseModel):
    R: float
    amp: float
    v: Optional[float] = 0.0
    th: Optional[float] = 0.0

class RangeFFTRequest(BaseModel):
    targets: List[Target]
    B: float
    Tc: float
    fs: float
    N: int

class VelocityFFTRequest(BaseModel):
    targets: List[Target]
    fc: float
    Tc: float
    Nc: int
    R: float
    v: float
    B: float
    fs: float

class AngleFFTRequest(BaseModel):
    dLam: float
    Nrx: int
    th: float
    fc: float

class SimulationRequest(BaseModel):
    targets: List[Target]
    fc: float
    B: float
    Tc: float
    Nc: int
    Nrx: int
    noise: float

class FFTResponse(BaseModel):
    frequencies: List[float]
    magnitudes: List[float]
    ranges: Optional[List[float]] = None
    velocities: Optional[List[float]] = None
    angles: Optional[List[float]] = None

class RangeDopplerResponse(BaseModel):
    ranges: List[float]
    velocities: List[float]
    spectrum: List[List[float]]

@app.get("/")
async def root():
    return {"message": "FMCW Radar API - High Precision FFT Backend"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/range-fft", response_model=FFTResponse)
async def compute_range_fft(request: RangeFFTRequest):
    try:
        B = request.B * 1e9
        Tc = request.Tc * 1e-6
        fs = request.fs * 1e6
        N = request.N
        
        S = B / Tc
        Rmax = fs * C * Tc / (4 * B)
        
        t = np.linspace(0, Tc, N, endpoint=False)
        signal = np.zeros(N, dtype=np.complex128)
        
        for target in request.targets:
            R = target.R
            amp = target.amp
            tau = 2 * R / C
            fb = 2 * S * R / C
            signal += amp * np.exp(1j * 2 * np.pi * fb * t)
        
        spectrum = np.fft.fft(signal)
        magnitude = np.abs(spectrum[:N//2])
        frequencies = np.fft.fftfreq(N, 1/fs)[:N//2]
        ranges = frequencies * C * Tc / (2 * B)
        
        return FFTResponse(
            frequencies=frequencies.tolist(),
            magnitudes=magnitude.tolist(),
            ranges=ranges.tolist()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/velocity-fft")
async def compute_velocity_fft(request: VelocityFFTRequest):
    try:
        fc = request.fc * 1e9
        Tc = request.Tc * 1e-6
        Nc = request.Nc
        B = request.B * 1e9
        fs = request.fs * 1e6
        
        lam = C / fc
        S = B / Tc
        
        Nfast = 64
        Nslow = Nc
        
        signal = np.zeros((Nslow, Nfast), dtype=np.complex128)
        
        for target in request.targets:
            R = target.R
            v = target.v
            amp = target.amp
            
            tau = 2 * R / C
            fb = 2 * S * R / C
            fd = 2 * v * fc / C
            
            for m in range(Nslow):
                t = m * Tc
                phase = 2 * np.pi * fd * t
                for n in range(Nfast):
                    signal[m, n] += amp * np.exp(1j * phase) * np.exp(1j * 2 * np.pi * fb * n / fs)
        
        range_fft = np.fft.fft(signal, axis=1)
        doppler_fft = np.fft.fft(range_fft, axis=0)
        spectrum = np.abs(doppler_fft)
        
        velocities = np.fft.fftfreq(Nslow, Tc) * lam / 2
        ranges = np.fft.fftfreq(Nfast, 1/fs) * C * Tc / (2 * B)
        
        return RangeDopplerResponse(
            ranges=ranges[:Nfast//2].tolist(),
            velocities=velocities.tolist(),
            spectrum=spectrum.tolist()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/angle-fft", response_model=FFTResponse)
async def compute_angle_fft(request: AngleFFTRequest):
    try:
        dLam = request.dLam
        Nrx = request.Nrx
        th = request.th
        fc = request.fc * 1e9
        
        lam = C / fc
        d = dLam * lam
        
        angles = np.linspace(-90, 90, 360)
        spectrum = np.zeros_like(angles, dtype=np.float64)
        
        for i, ang in enumerate(angles):
            ang_rad = np.deg2rad(ang)
            th_rad = np.deg2rad(th)
            
            total = 0.0 + 0.0j
            for n in range(Nrx):
                phase_obs = 2 * np.pi * d * np.sin(th_rad) / lam * n
                phase_st = 2 * np.pi * d * np.sin(ang_rad) / lam * n
                total += np.exp(1j * (phase_obs - phase_st))
            
            spectrum[i] = np.abs(total)
        
        return FFTResponse(
            frequencies=[],
            magnitudes=spectrum.tolist(),
            angles=angles.tolist()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulation")
async def compute_simulation(request: SimulationRequest):
    try:
        fc = request.fc * 1e9
        B = request.B * 1e9
        Tc = request.Tc * 1e-6
        Nc = request.Nc
        Nrx = request.Nrx
        noise = request.noise
        
        lam = C / fc
        S = B / Tc
        fs = 20e6
        Nfast = 128
        
        Rmax = fs * C * Tc / (4 * B)
        vmax = lam / (4 * Tc)
        
        range_spec = np.zeros(Nfast // 2)
        for k in range(Nfast // 2):
            for target in request.targets:
                fb = 2 * S * target.R / C
                bin_k = fb * Nfast / fs
                delta = k - bin_k
                if abs(delta) < 1e-6:
                    dir_val = Nfast
                else:
                    dir_val = np.sin(np.pi * delta) / np.sin(np.pi * delta / Nfast)
                range_spec[k] += target.amp * abs(dir_val)
            range_spec[k] += noise * np.random.rand() * Nfast * 0.1
        
        ranges = np.linspace(0, Rmax, Nfast // 2)
        
        Nx = 100
        Ny = 60
        dR = C / (2 * B)
        dv = lam / (2 * Nc * Tc)
        
        range_doppler = np.zeros((Ny, Nx))
        for yi in range(Ny):
            Rg = yi / Ny * Rmax
            for xi in range(Nx):
                vg = (xi / Nx - 0.5) * 2 * vmax
                for target in request.targets:
                    dr = (Rg - target.R) / dR
                    dvv = (vg - target.v) / dv
                    sr = 1.0 if abs(dr) < 1e-6 else np.sin(np.pi * dr) / (np.pi * dr)
                    sv = 1.0 if abs(dvv) < 1e-6 else np.sin(np.pi * dvv) / (np.pi * dvv)
                    range_doppler[yi, xi] += target.amp ** 2 * sr ** 2 * sv ** 2
                range_doppler[yi, xi] += noise ** 2 * np.random.rand() * 0.2
        
        velocities = np.linspace(-vmax, vmax, Nx)
        
        angle_spec = np.zeros(360)
        d = lam / 2
        for k in range(360):
            ang = -90 + k * 180 / 360
            ang_rad = np.deg2rad(ang)
            total = 0.0 + 0.0j
            for target in request.targets:
                th_rad = np.deg2rad(target.th)
                for n in range(Nrx):
                    ph_obs = 2 * np.pi * d * np.sin(th_rad) / lam * n
                    ph_st = 2 * np.pi * d * np.sin(ang_rad) / lam * n
                    total += target.amp * np.exp(1j * (ph_obs - ph_st))
            angle_spec[k] = np.abs(total) + noise * np.random.rand() * Nrx * 0.1
        
        angles = np.linspace(-90, 90, 360)
        
        return {
            "range_spectrum": {
                "ranges": ranges.tolist(),
                "magnitudes": range_spec.tolist()
            },
            "range_doppler": {
                "ranges": np.linspace(0, Rmax, Ny).tolist(),
                "velocities": velocities.tolist(),
                "spectrum": range_doppler.tolist()
            },
            "angle_spectrum": {
                "angles": angles.tolist(),
                "magnitudes": angle_spec.tolist()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("FMCW_BACKEND_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

