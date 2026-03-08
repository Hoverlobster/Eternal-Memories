import React, { useState, useEffect, useRef } from 'react';
import './MainPage.css';

const CIRCUMFERENCE = 2 * Math.PI * 45;

export default function MainPage({ mode, setMode, setScreen, timer, timeRemaining, startBreak, endBreak }) {
  const canvasRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const particlesRef = useRef([]);
  const animationIdRef = useRef(null);
  const [showShonyTip, setShowShonyTip] = useState(false);
  const shonyTimeoutRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    const createFlower = (x, y) => ({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 2,
      life: 1,
      size: Math.random() * 3 + 2,
      color: `hsl(${Math.random() * 30 + 330}, 80%, 60%)`
    });

    const createEmber = (x, y) => ({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 3,
      life: 1,
      size: Math.random() * 4 + 2,
      color: `hsl(${Math.random() * 40 + 15}, 100%, 50%)`
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.015;
        p.vy += 0.1;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationIdRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (mode === 'soft') {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push(createFlower(mouseX, mouseY));
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationIdRef.current);
    };
  }, [mode]);

  const handleShonyClick = () => {
    setShowShonyTip(true);
    if (shonyTimeoutRef.current) clearTimeout(shonyTimeoutRef.current);
    shonyTimeoutRef.current = setTimeout(() => setShowShonyTip(false), 2000);

    const shonyEl = document.getElementById('shony');
    if (shonyEl) {
      shonyEl.classList.add('bounce');
      setTimeout(() => shonyEl.classList.remove('bounce'), 550);
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = timer ? (timeRemaining / (timer.totalSeconds * 1000)) : 1;
  const ringOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="main-page">
      <canvas ref={canvasRef} className="particles-canvas"></canvas>

      <div className="main-content">
        <div className="header">
          <h1 className="title">Monen 🐱</h1>
          <p className="subtitle">Break Timer</p>
        </div>

        <div className="timer-section">
          {timer ? (
            <>
              <div className="ring-container">
                <svg viewBox="0 0 100 100" className="progress-ring">
                  <circle cx="50" cy="50" r="45" fill="none" className="ring-bg" />
                  <circle cx="50" cy="50" r="45" fill="none" className="ring-progress" style={{ strokeDashoffset: ringOffset }} />
                </svg>
                <div className="timer-display">{formatTime(timeRemaining)}</div>
              </div>

              <button onClick={endBreak} className="btn btn-secondary">
                End Break
              </button>
            </>
          ) : (
            <>
              <div className="timer-display">00:00</div>
              <div className="button-group">
                <button onClick={() => startBreak(15)} className={`btn btn-start ${mode}`}>15 Min</button>
                <button onClick={() => startBreak(30)} className={`btn btn-start ${mode}`}>30 Min</button>
              </div>
            </>
          )}
        </div>

        <div className="bottom-section">
          <div className="mode-toggle">
            <button onClick={() => setMode('soft')} className={`mode-btn ${mode === 'soft' ? 'active' : ''}`}>💗 Soft</button>
            <button onClick={() => setMode('chaos')} className={`mode-btn ${mode === 'chaos' ? 'active' : ''}`}>🔥 Chaos</button>
          </div>

          <button onClick={() => setScreen('memories')} className={`btn btn-memories ${mode}`}>📸 Memories</button>
        </div>
      </div>

      <button id="shony" onClick={handleShonyClick} className="shony-btn" aria-label="Shony the cat">😺</button>

      {showShonyTip && (
        <div className={`shony-tip ${mode}`}>
          You found Shony! 😺
        </div>
      )}
    </div>
  );
}
