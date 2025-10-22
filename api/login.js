const { MongoClient } = require('mongodb');

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
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const db = await connectDB();
    
    // Check if user exists
    const user = await db.collection('users').findOne({ phone });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sign up first.' });
    }

    // Send OTP
    const otpResponse = await fetch(`${OTP_API}/api/sendotp?number=${encodeURIComponent(phone)}`);
    const otpResult = await otpResponse.json();
    
    if (!otpResult.success) {
      return res.status(500).json({ error: 'Failed to send OTP' });
    }

    return res.json({ 
      success: true, 
      message: 'OTP sent to your WhatsApp' 
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
