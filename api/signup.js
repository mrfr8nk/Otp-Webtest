const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
const OTP_API = process.env.OTP_API_URL || 'https://otp.dynamictech.gleeze.com';

let cachedDb = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGODB_URI);
  cachedDb = client.db('authSystem');
  return cachedDb;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, password } = req.body;
    
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const db = await connectDB();
    
    // Check if user exists
    const exists = await db.collection('users').findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (exists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Send OTP
    const otpResponse = await fetch(`${OTP_API}/api/sendotp?number=${encodeURIComponent(phone)}`);
    const otpResult = await otpResponse.json();
    
    if (!otpResult.success) {
      return res.status(500).json({ error: 'Failed to send OTP' });
    }

    // Store pending signup
    await db.collection('pendingSignups').updateOne(
      { phone },
      { 
        $set: { 
          name, 
          email, 
          phone, 
          password: await bcrypt.hash(password, 10),
          createdAt: new Date() 
        } 
      },
      { upsert: true }
    );

    return res.json({ 
      success: true, 
      message: 'OTP sent to your WhatsApp' 
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
