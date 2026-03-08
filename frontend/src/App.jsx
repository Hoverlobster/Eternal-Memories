import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import './App.css';

// Firebase config (same as before)
const firebaseConfig = {
  apiKey: "AIzaSyAUMMuoXnya3XlNMwLHILiBXDRRloX5BX4",
  authDomain: "eternal-memories-23c0d.firebaseapp.com",
  projectId: "eternal-memories-23c0d",
  storageBucket: "eternal-memories-23c0d.firebasestorage.app",
  messagingSenderId: "624553159812",
  appId: "1:624553159812:web:cbf05ef2c110b5efa266d1",
  measurementId: "G-TR47KXG4PC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const API_URL = import.meta.env.VITE_API_URL || 'https://monen-backend.onrender.com';
const USER_ID = 'user-monen'; // You can change this to dynamic user ID

export default function App() {
  const [mode, setMode] = useState('soft');
  const [screen, setScreen] = useState('main'); // 'main', 'memories', 'detail'
  const [timer, setTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [deviceToken, setDeviceToken] = useState(null);
  const timerIntervalRef = useRef(null);

  // Initialize and request notification permissions
  useEffect(() => {
    const initNotifications = async () => {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
          // Request notification permission
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
          }

          // Register service worker
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', registration);

          // Get FCM token (Firebase Cloud Messaging)
          const { getMessaging, getToken } = await import('firebase/messaging');
          const messaging = getMessaging(app);
          try {
            const token = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_VAPID_KEY
            });
            if (token) {
              setDeviceToken(token);
              // Register device with backend
              await axios.post(`${API_URL}/api/devices/register`, {
                userId: USER_ID,
                deviceToken: token
              });
              console.log('Device registered with backend');
            }
          } catch (tokenError) {
            console.log('Could not get FCM token:', tokenError.message);
          }
        } catch (error) {
          console.error('Notification setup error:', error);
        }
      }
    };

    initNotifications();
  }, []);

  // Check for active timer on mount
  useEffect(() => {
    const checkActiveTimer = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/timers/user/${USER_ID}`);
        if (response.data.timer && response.data.timer.isActive) {
          setTimer(response.data.timer);
          startTimerSync(response.data.timer);
        }
      } catch (error) {
        console.log('No active timer:', error.message);
      }
    };

    checkActiveTimer();
  }, []);

  const startTimerSync = (timerData) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const updateTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, timerData.endTime - now);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        setTimer(null);
        playEndSound();
        vibrate();
      }
    };

    updateTime();
    timerIntervalRef.current = setInterval(updateTime, 100);
  };

  const startBreak = async (minutes) => {
    try {
      const response = await axios.post(`${API_URL}/api/timers/start`, {
        userId: USER_ID,
        minutes,
        bufferMinutes: 0,
        deviceToken
      });

      const timerData = {
        timerId: response.data.timerId,
        endTime: response.data.endTime,
        totalSeconds: response.data.totalSeconds,
        isActive: true
      };

      setTimer(timerData);
      startTimerSync(timerData);
      playStartSound();
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer');
    }
  };

  const endBreak = async () => {
    if (!timer) return;

    try {
      await axios.post(`${API_URL}/api/timers/${timer.timerId}/end`);
      clearInterval(timerIntervalRef.current);
      setTimer(null);
      setTimeRemaining(0);
      playEndSound();
      vibrate();
    } catch (error) {
      console.error('Error ending timer:', error);
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const playStartSound = () => {
    // Play start sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 523.25;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  };

  const playEndSound = () => {
    // Play end sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const notes = [784.99, 659.25, 523.25];
    notes.forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      const startTime = now + i * 0.2;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  };

  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  return (
    <div className={`app ${mode}`}>
      {screen === 'main' && (
        <div className="main-screen">
          <div className="header">
            <h1>Monen 🐱</h1>
            <p>Break Timer</p>
          </div>

          {timer ? (
            <div className="timer-section">
              <div className="timer-display">
                {formatTime(timeRemaining)}
              </div>
              <div className="timer-progress">
                <div 
                  className="progress-bar"
                  style={{
                    width: `${(timeRemaining / (timer.totalSeconds * 1000)) * 100}%`
                  }}
                ></div>
              </div>
              <button onClick={endBreak} className="btn btn-secondary">
                End Break
              </button>
            </div>
          ) : (
            <div className="timer-section">
              <div className="timer-display">00:00</div>
              <div className="buttons">
                <button 
                  onClick={() => startBreak(15)} 
                  className={`btn btn-timer ${mode === 'soft' ? 'soft' : 'chaos'}`}
                >
                  15 Min
                </button>
                <button 
                  onClick={() => startBreak(30)} 
                  className={`btn btn-timer ${mode === 'soft' ? 'soft' : 'chaos'}`}
                >
                  30 Min
                </button>
              </div>
            </div>
          )}

          <div className="mode-toggle">
            <button 
              onClick={() => setMode('soft')} 
              className={`mode-btn ${mode === 'soft' ? 'active' : ''}`}
            >
              Soft 💗
            </button>
            <button 
              onClick={() => setMode('chaos')} 
              className={`mode-btn ${mode === 'chaos' ? 'active' : ''}`}
            >
              Chaos 🔥
            </button>
          </div>

          <button 
            onClick={() => setScreen('memories')}
            className="btn btn-memories"
          >
            Memories 📸
          </button>
        </div>
      )}
    </div>
  );
}
