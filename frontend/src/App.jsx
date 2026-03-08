import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import './App.css';
import MainPage from './pages/MainPage';
import MemoriesPage from './pages/MemoriesPage';
import MemoryDetail from './pages/MemoryDetail';

const firebaseConfig = {
  apiKey: "AIzaSyAUMMuoXnya3XlNMwLHILiBXDRRloX5BX4",
  authDomain: "eternal-memories-23c0d.firebaseapp.com",
  projectId: "eternal-memories-23c0d",
  storageBucket: "eternal-memories-23c0d.firebasestorage.app",
  messagingSenderId: "624553159812",
  appId: "1:624553159612:web:cbf05ef2c110b5efa266d1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const USER_ID = 'user-monen';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dxd9bxrww/auto/upload';
const CLOUDINARY_PRESET = 'memories_preset';
const ANNIVERSARY_DATE = new Date('2024-12-19');

export default function App() {
  const [mode, setMode] = useState('soft');
  const [screen, setScreen] = useState('main');
  const [timer, setTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [memories, setMemories] = useState([]);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [deviceToken, setDeviceToken] = useState(null);
  const [buffer, setBuffer] = useState(0);
  const [surpriseIndex, setSurpriseIndex] = useState(0);
  const timerIntervalRef = useRef(null);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }

          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered');

          try {
            const { getMessaging, getToken } = await import('firebase/messaging');
            const messaging = getMessaging(app);
            const token = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_VAPID_KEY
            });
            if (token) {
              setDeviceToken(token);
              await axios.post(`${API_URL}/api/devices/register`, {
                userId: USER_ID,
                deviceToken: token
              });
            }
          } catch (e) {
            console.log('FCM setup skipped');
          }
        } catch (error) {
          console.error('Notification setup error:', error);
        }
      }
    };

    initNotifications();
  }, []);

  // Check for active timer
  useEffect(() => {
    const checkActiveTimer = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/timers/user/${USER_ID}`);
        if (response.data.timer?.isActive) {
          setTimer(response.data.timer);
          startTimerSync(response.data.timer);
        }
      } catch (error) {
        console.log('No active timer');
      }
    };

    checkActiveTimer();
  }, []);

  // Load memories
  useEffect(() => {
    const q = query(collection(db, 'memories'), where('userId', '==', USER_ID));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMemories(mems);
    });

    return () => unsubscribe();
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
        setBuffer(0);
        playEndSound();
        vibrate();
      }
    };

    updateTime();
    timerIntervalRef.current = setInterval(updateTime, 100);
  };

  const startBreak = async (minutes) => {
    try {
      const bufferMinutes = buffer || 0;
      const response = await axios.post(`${API_URL}/api/timers/start`, {
        userId: USER_ID,
        minutes,
        bufferMinutes,
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
      setBuffer(0);
      setTimeRemaining(0);
      playEndSound();
      vibrate();
    } catch (error) {
      console.error('Error ending timer:', error);
    }
  };

  const uploadMemory = async (file, caption) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);

      const uploadResponse = await axios.post(CLOUDINARY_URL, formData);
      const mediaUrl = uploadResponse.data.secure_url;

      await addDoc(collection(db, 'memories'), {
        userId: USER_ID,
        mediaUrl,
        caption,
        createdAt: new Date(),
        type: file.type.startsWith('video') ? 'video' : 'image'
      });

      return true;
    } catch (error) {
      console.error('Error uploading memory:', error);
      return false;
    }
  };

  const deleteMemory = async (memoryId) => {
    try {
      await deleteDoc(doc(db, 'memories', memoryId));
      setSelectedMemory(null);
      setScreen('memories');
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  };

  const playStartSound = () => {
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

  const getAnniversaryInfo = () => {
    const now = new Date();
    const nextAnniversary = new Date(now.getFullYear(), ANNIVERSARY_DATE.getMonth(), ANNIVERSARY_DATE.getDate());
    
    if (nextAnniversary < now) {
      nextAnniversary.setFullYear(now.getFullYear() + 1);
    }

    const togetherMs = now - ANNIVERSARY_DATE;
    const years = Math.floor(togetherMs / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor((togetherMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    const days = Math.floor(((togetherMs % (365.25 * 24 * 60 * 60 * 1000)) % (30.44 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));

    const daysUntilAnniversary = Math.ceil((nextAnniversary - now) / (24 * 60 * 60 * 1000));

    return {
      together: `${years}y ${months}m ${days}d`,
      daysUntilNext: daysUntilAnniversary,
      anniversaryDate: 'December 19'
    };
  };

  return (
    <div className={`app-container ${mode}`}>
      {screen === 'main' && (
        <MainPage
          mode={mode}
          setMode={setMode}
          setScreen={setScreen}
          timer={timer}
          timeRemaining={timeRemaining}
          startBreak={startBreak}
          endBreak={endBreak}
          buffer={buffer}
          setBuffer={setBuffer}
          surpriseIndex={surpriseIndex}
          setSurpriseIndex={setSurpriseIndex}
          anniversaryInfo={getAnniversaryInfo()}
        />
      )}

      {screen === 'memories' && (
        <MemoriesPage
          mode={mode}
          setScreen={setScreen}
          memories={memories}
          setSelectedMemory={setSelectedMemory}
          uploadMemory={uploadMemory}
        />
      )}

      {screen === 'detail' && selectedMemory && (
        <MemoryDetail
          mode={mode}
          memory={selectedMemory}
          setScreen={setScreen}
          deleteMemory={deleteMemory}
        />
      )}
    </div>
  );
}
