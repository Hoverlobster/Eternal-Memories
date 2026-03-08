import React, { useState, useEffect, useRef } from 'react';
import './MainPage.css';

const CIRCUMFERENCE = 2 * Math.PI * 45;

export default function MainPage({ mode, setMode, setScreen, timer, timeRemaining, startBreak, endBreak, buffer, setBuffer, surpriseIndex, setSurpriseIndex, anniversaryInfo }) {
  const canvasRef = useRef(null);
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
      if (mode === 'soft') {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push(createFlower(e.clientX, e.clientY));
        }
      } else if (mode === 'chaos') {
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push(createEmber(e.clientX, e.clientY));
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

  const handleSurpriseClick = () => {
    setSurpriseIndex((prev) => prev + 1);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getBackAtTime = () => {
    if (!timer) return null;
    const endTime = new Date(timer.endTime);
    const hours = endTime.getHours();
    const minutes = endTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const getSurpriseUrl = () => {
    const index = (surpriseIndex % 100) + 1;
    if (mode === 'soft') {
      return `https://res.cloudinary.com/dxd9bxrww/image/fetch/w_400,h_400,c_fill/https://res.cloudinary.com/dxd9bxrww/image/upload/us-${index}.jpg`;
    } else {
      return `https://res.cloudinary.com/dxd9bxrww/video/upload/us-${index}.mp4`;
    }
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

        <div className="anniversary-section">
          <div className="anniversary-item">
            <p className="anniversary-label">Together</p>
            <p className="anniversary-value">{anniversaryInfo.together}</p>
          </div>
          <div className="anniversary-divider">•</div>
          <div className="anniversary-item">
            <p className="anniversary-label">Until Next</p>
            <p className="anniversary-value">{anniversaryInfo.daysUntilNext} days</p>
          </div>
          <div className="anniversary-divider">•</div>
          <div className="anniversary-item">
            <p className="anniversary-label">Date</p>
            <p className="anniversary-value">{anniversaryInfo.anniversaryDate}</p>
          </div>
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

              <div className="back-at-time">
                Back at {getBackAtTime()}
              </div>

              <button onClick={endBreak} className="btn btn-secondary">
                End Break
              </button>
            </>
          ) : (
            <>
              <div className="timer-display">00:00</div>

              <div className="buffer-section">
                <p className="buffer-label">Buffer (minutes):</p>
                <div className="buffer-buttons">
                  {[0, 5, 10, 15].map((b) => (
                    <button
                      key={b}
                      onClick={() => setBuffer(b)}
                      className={`buffer-btn ${buffer === b ? 'active' : ''}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="button-group">
                <button onClick={() => startBreak(15)} className={`btn btn-start ${mode}`}>
                  15 Min
                </button>
                <button onClick={() => startBreak(30)} className={`btn btn-start ${mode}`}>
                  30 Min
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bottom-section">
          <div className="mode-toggle">
            <button
              onClick={() => setMode('soft')}
              className={`mode-btn ${mode === 'soft' ? 'active' : ''}`}
            >
              💗 Soft
            </button>
            <button
              onClick={() => setMode('chaos')}
              className={`mode-btn ${mode === 'chaos' ? 'active' : ''}`}
            >
              🔥 Chaos
            </button>
          </div>

          <div className="bottom-buttons">
            <button onClick={handleSurpriseClick} className={`btn btn-surprise ${mode}`}>
              💝 Surprise
            </button>

            <button onClick={() => setScreen('memories')} className={`btn btn-memories ${mode}`}>
              📸 Memories
            </button>
          </div>
        </div>
      </div>

      {surpriseIndex > 0 && (
        <div className="surprise-modal" onClick={() => setSurpriseIndex(0)}>
          <div className="surprise-content">
            {mode === 'soft' ? (
              <img src={getSurpriseUrl()} alt="Surprise" className="surprise-media" onError={(e) => {e.target.style.display = 'none'}} />
            ) : (
              <video src={getSurpriseUrl()} className="surprise-media" autoPlay controls onError={(e) => {e.target.style.display = 'none'}} />
            )}
            <p className="surprise-close">Click to close</p>
          </div>
        </div>
      )}

      <button id="shony" onClick={handleShonyClick} className="shony-btn" aria-label="Shony the cat">
        😺
      </button>

      {showShonyTip && (
        <div className={`shony-tip ${mode}`}>
          You found Shony! 😺
        </div>
      )}
    </div>
  );
}
