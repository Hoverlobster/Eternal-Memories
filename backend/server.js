import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

// Store for active timers
const activeTimers = new Map();

// Start a new timer
app.post('/api/timers/start', async (req, res) => {
  try {
    const { userId, minutes, bufferMinutes, deviceToken } = req.body;
    
    if (!userId || !minutes) {
      return res.status(400).json({ error: 'Missing userId or minutes' });
    }

    const actualMinutes = minutes - (bufferMinutes || 0);
    const endTime = Date.now() + actualMinutes * 60 * 1000;
    const timerId = `${userId}-${Date.now()}`;

    const timerData = {
      timerId,
      userId,
      startTime: Date.now(),
      endTime,
      totalSeconds: actualMinutes * 60,
      deviceToken,
      active: true,
      createdAt: new Date()
    };

    // Save to Firestore
    await db.collection('timers').doc(timerId).set(timerData);
    
    // Store in memory for active tracking
    activeTimers.set(timerId, timerData);

    res.json({
      success: true,
      timerId,
      endTime,
      totalSeconds: actualMinutes * 60
    });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current timer status
app.get('/api/timers/:timerId', async (req, res) => {
  try {
    const { timerId } = req.params;
    
    const doc = await db.collection('timers').doc(timerId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Timer not found' });
    }

    const timerData = doc.data();
    const now = Date.now();
    const timeRemaining = Math.max(0, timerData.endTime - now);
    const isActive = timeRemaining > 0;

    res.json({
      timerId,
      timeRemaining,
      totalSeconds: timerData.totalSeconds,
      isActive,
      endTime: timerData.endTime
    });
  } catch (error) {
    console.error('Error getting timer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's current active timer
app.get('/api/timers/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const snapshot = await db.collection('timers')
      .where('userId', '==', userId)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({ timer: null });
    }

    const timerData = snapshot.docs[0].data();
    const timerId = snapshot.docs[0].id;
    const now = Date.now();
    const timeRemaining = Math.max(0, timerData.endTime - now);
    const isActive = timeRemaining > 0;

    res.json({
      timer: {
        timerId,
        timeRemaining,
        totalSeconds: timerData.totalSeconds,
        isActive,
        endTime: timerData.endTime
      }
    });
  } catch (error) {
    console.error('Error getting user timer:', error);
    res.status(500).json({ error: error.message });
  }
});

// End a timer manually
app.post('/api/timers/:timerId/end', async (req, res) => {
  try {
    const { timerId } = req.params;

    await db.collection('timers').doc(timerId).update({
      active: false,
      endedAt: new Date()
    });

    activeTimers.delete(timerId);

    res.json({ success: true, message: 'Timer ended' });
  } catch (error) {
    console.error('Error ending timer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register device token for push notifications
app.post('/api/devices/register', async (req, res) => {
  try {
    const { userId, deviceToken } = req.body;

    if (!userId || !deviceToken) {
      return res.status(400).json({ error: 'Missing userId or deviceToken' });
    }

    await db.collection('devices').doc(userId).set(
      {
        deviceToken,
        updatedAt: new Date()
      },
      { merge: true }
    );

    res.json({ success: true, message: 'Device registered' });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Background job: Check for expired timers every 2 seconds
setInterval(async () => {
  try {
    const now = Date.now();
    const snapshot = await db.collection('timers')
      .where('active', '==', true)
      .where('endTime', '<=', now)
      .get();

    for (const doc of snapshot.docs) {
      const timerData = doc.data();
      const timerId = doc.id;
      
      // Mark as inactive
      await db.collection('timers').doc(timerId).update({
        active: false,
        completedAt: new Date()
      });

      activeTimers.delete(timerId);

      // Send push notification if device token exists
      if (timerData.deviceToken) {
        try {
          await messaging.send({
            notification: {
              title: "Break is over! 😤",
              body: "Time to get back to work!"
            },
            data: {
              timerId,
              action: "timer-complete"
            },
            token: timerData.deviceToken,
            android: {
              ttl: 3600,
              priority: 'high'
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: "Break is over! 😤",
                    body: "Time to get back to work!"
                  },
                  sound: 'default',
                  badge: 1
                }
              }
            },
            webpush: {
              notification: {
                title: "Break is over! 😤",
                body: "Time to get back to work!",
                icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><rect fill='%23ffc0cb' width='180' height='180' rx='45'/></svg>",
                badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><circle cx='48' cy='48' r='45' fill='%23ffc0cb'/></svg>"
              }
            }
          });
          console.log(`✅ Notification sent for timer ${timerId}`);
        } catch (notificationError) {
          console.error(`⚠️ Failed to send notification for timer ${timerId}:`, notificationError.message);
        }
      }
    }
  } catch (error) {
    console.error('Error in timer background job:', error);
  }
}, 2000);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Monen Backend running on port ${PORT}`);
  console.log(`✅ Firebase connected`);
});
