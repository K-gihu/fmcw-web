
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import numpy as np
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import asyncio
import json
from collections import defaultdict

app = FastAPI(title="FMCW Radar API - Optimized")

CORS_ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

C = 299792458.0

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

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

def compute_range_fft_core(targets, B, Tc, fs, N):
    B_hz = B * 1e9
    Tc_sec = Tc * 1e-6
    fs_hz = fs * 1e6

    S = B_hz / Tc_sec
    Rmax = fs_hz * C * Tc_sec / (4 * B_hz)

    t = np.linspace(0, Tc_sec, N, endpoint=False)
    signal = np.zeros(N, dtype=np.complex128)

    for target in targets:
        R = target.R
        amp = target.amp
        tau = 2 * R / C
        fb = 2 * S * R / C
        signal += amp * np.exp(1j * 2 * np.pi * fb * t)

    spectrum = np.fft.fft(signal)
    magnitude = np.abs(spectrum[:N//2])
    frequencies = np.fft.fftfreq(N, 1/fs_hz)[:N//2]
    ranges = frequencies * C * Tc_sec / (2 * B_hz)

    return {
        "frequencies": frequencies.tolist(),
        "magnitudes": magnitude.tolist(),
        "ranges": ranges.tolist()
    }

def compute_velocity_fft_core(targets, fc, Tc, Nc, B, fs):
    fc_hz = fc * 1e9
    Tc_sec = Tc * 1e-6
    B_hz = B * 1e9
    fs_hz = fs * 1e6

    lam = C / fc_hz
    S = B_hz / Tc_sec

    Nfast = 64
    Nslow = Nc

    signal = np.zeros((Nslow, Nfast), dtype=np.complex128)

    for target in targets:
        R = target.R
        v = target.v
        amp = target.amp

        tau = 2 * R / C
        fb = 2 * S * R / C
        fd = 2 * v * fc_hz / C

        m_indices = np.arange(Nslow)
        n_indices = np.arange(Nfast)
        phase = 2 * np.pi * fd * m_indices * Tc_sec
        signal += amp * np.exp(1j * phase)[:, np.newaxis] * np.exp(1j * 2 * np.pi * fb * n_indices / fs_hz)

    range_fft = np.fft.fft(signal, axis=1)
    doppler_fft = np.fft.fft(range_fft, axis=0)
    spectrum = np.abs(doppler_fft)

    velocities = np.fft.fftfreq(Nslow, Tc_sec) * lam / 2
    ranges = np.fft.fftfreq(Nfast, 1/fs_hz) * C * Tc_sec / (2 * B_hz)

    return {
        "ranges": ranges[:Nfast//2].tolist(),
        "velocities": velocities.tolist(),
        "spectrum": spectrum.tolist()
    }

def compute_angle_fft_core(dLam, Nrx, th, fc):
    fc_hz = fc * 1e9
    lam = C / fc_hz
    d = dLam * lam

    angles = np.linspace(-90, 90, 360)
    spectrum = np.zeros_like(angles, dtype=np.float64)

    th_rad = np.deg2rad(th)
    n_indices = np.arange(Nrx)

    for i, ang in enumerate(angles):
        ang_rad = np.deg2rad(ang)
        phase_obs = 2 * np.pi * d * np.sin(th_rad) / lam * n_indices
        phase_st = 2 * np.pi * d * np.sin(ang_rad) / lam * n_indices
        total = np.sum(np.exp(1j * (phase_obs - phase_st)))
        spectrum[i] = np.abs(total)

    return {
        "frequencies": [],
        "magnitudes": spectrum.tolist(),
        "angles": angles.tolist()
    }

def compute_simulation_core(targets, fc, B, Tc, Nc, Nrx, noise):
    fc_hz = fc * 1e9
    B_hz = B * 1e9
    Tc_sec = Tc * 1e-6

    lam = C / fc_hz
    S = B_hz / Tc_sec
    fs_hz = 20e6
    Nfast = 128

    Rmax = fs_hz * C * Tc_sec / (4 * B_hz)
    vmax = lam / (4 * Tc_sec)

    range_spec = np.zeros(Nfast // 2)
    k_indices = np.arange(Nfast // 2)

    for k in k_indices:
        dir_vals = []
        for target in targets:
            fb = 2 * S * target.R / C
            bin_k = fb * Nfast / fs_hz
            delta = k - bin_k
            if abs(delta) < 1e-6:
                dir_val = Nfast
            else:
                dir_val = np.sin(np.pi * delta) / np.sin(np.pi * delta / Nfast)
            dir_vals.append(target.amp * abs(dir_val))
        range_spec[k] = np.sum(dir_vals) + noise * np.random.rand() * Nfast * 0.1

    ranges = np.linspace(0, Rmax, Nfast // 2)

    Nx = 100
    Ny = 60
    dR = C / (2 * B_hz)
    dv = lam / (2 * Nc * Tc_sec)

    range_doppler = np.zeros((Ny, Nx))
    yi_indices = np.arange(Ny)
    xi_indices = np.arange(Nx)

    for yi in yi_indices:
        Rg = yi / Ny * Rmax
        for xi in xi_indices:
            vg = (xi / Nx - 0.5) * 2 * vmax
            vals = []
            for target in targets:
                dr = (Rg - target.R) / dR
                dvv = (vg - target.v) / dv
                sr = 1.0 if abs(dr) < 1e-6 else np.sin(np.pi * dr) / (np.pi * dr)
                sv = 1.0 if abs(dvv) < 1e-6 else np.sin(np.pi * dvv) / (np.pi * dvv)
                vals.append(target.amp ** 2 * sr ** 2 * sv ** 2)
            range_doppler[yi, xi] = np.sum(vals) + noise ** 2 * np.random.rand() * 0.2

    velocities = np.linspace(-vmax, vmax, Nx)

    angle_spec = np.zeros(360)
    d = lam / 2
    k_indices = np.arange(360)

    for k in k_indices:
        ang = -90 + k * 180 / 360
        ang_rad = np.deg2rad(ang)
        total = 0.0 + 0.0j
        for target in targets:
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

@app.get("/")
async def root():
    return {"message": "FMCW Radar API - Optimized with WebSocket Support", "version": "2.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "performance": "optimized"}

@app.post("/api/range-fft", response_model=FFTResponse)
async def compute_range_fft(request: RangeFFTRequest):
    try:
        result = compute_range_fft_core(
            request.targets, request.B, request.Tc, request.fs, request.N
        )
        return FFTResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/velocity-fft")
async def compute_velocity_fft(request: VelocityFFTRequest):
    try:
        result = compute_velocity_fft_core(
            request.targets, request.fc, request.Tc, request.Nc, request.B, request.fs
        )
        return RangeDopplerResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/angle-fft", response_model=FFTResponse)
async def compute_angle_fft(request: AngleFFTRequest):
    try:
        result = compute_angle_fft_core(
            request.dLam, request.Nrx, request.th, request.fc
        )
        return FFTResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulation")
async def compute_simulation(request: SimulationRequest):
    try:
        result = compute_simulation_core(
            request.targets, request.fc, request.B, request.Tc,
            request.Nc, request.Nrx, request.noise
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            request_data = json.loads(data)

            if request_data.get("action") == "simulate":
                targets = [Target(**t) for t in request_data.get("targets", [])]
                fc = request_data.get("fc", 77)
                B = request_data.get("B", 4)
                Tc = request_data.get("Tc", 40)
                Nc = request_data.get("Nc", 64)
                Nrx = request_data.get("Nrx", 4)
                noise = request_data.get("noise", 0.15)

                result = compute_simulation_core(
                    targets, fc, B, Tc, Nc, Nrx, noise
                )

                await websocket.send_json({
                    "type": "simulation_result",
                    "data": result
                })

            elif request_data.get("action") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": asyncio.get_event_loop().time()
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FMCW_BACKEND_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

