const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
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
    const { phone, code } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code required' });
    }

    // Verify OTP
    const otpResponse = await fetch(`${OTP_API}/api/verifyotp?number=${encodeURIComponent(phone)}&code=${code}`);
    const otpResult = await otpResponse.json();
    
    if (!otpResult.success) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const db = await connectDB();
    
    // Get user
    const user = await db.collection('users').findOne({ phone });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), phone }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.json({ 
      success: true, 
      token,
      user: { 
        id: user._id.toString(), 
        name: user.name, 
        email: user.email,
        phone: user.phone 
      }
    });

  } catch (error) {
    console.error('Verify login error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
