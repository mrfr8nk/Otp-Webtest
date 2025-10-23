const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
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

// Helper: Send OTP
async function sendOTP(phone) {
  const response = await fetch(`${OTP_API}/api/sendotp?number=${encodeURIComponent(phone)}`);
  return await response.json();
}

// Helper: Verify OTP
async function verifyOTP(phone, code) {
  const response = await fetch(`${OTP_API}/api/verifyotp?number=${encodeURIComponent(phone)}&code=${code}`);
  return await response.json();
}

// Helper: Parse JSON body
async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get the original request path before rewrite
  const originalPath = req.headers['x-vercel-forwarded-for'] || req.url;
  const urlPath = originalPath.split('?')[0];
  
  // Extract endpoint name from the path
  const pathParts = urlPath.split('/').filter(p => p);
  const endpoint = pathParts[pathParts.length - 1] || 'auth';
  const method = req.method;
  
  const db = await connectDB();

  try {
    // POST /api/signup - Request OTP for signup
    if (endpoint === 'signup' && method === 'POST') {
      const { name, email, phone, password } = await parseBody(req);
      
      if (!name || !email || !phone || !password) {
        return res.status(400).json({ error: 'All fields required' });
      }

      // Check if user exists
      const exists = await db.collection('users').findOne({ 
        $or: [{ email }, { phone }] 
      });
      
      if (exists) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Send OTP
      const otpResult = await sendOTP(phone);
      
      if (!otpResult.success) {
        return res.status(500).json({ error: 'Failed to send OTP' });
      }

      // Store pending signup (temporary)
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
    }

    // POST /api/verify-signup - Verify OTP and complete signup
    if (endpoint === 'verify-signup' && method === 'POST') {
      const { phone, code } = await parseBody(req);
      
      if (!phone || !code) {
        return res.status(400).json({ error: 'Phone and code required' });
      }

      // Verify OTP
      const otpResult = await verifyOTP(phone, code);
      
      if (!otpResult.success) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Get pending signup
      const pending = await db.collection('pendingSignups').findOne({ phone });
      
      if (!pending) {
        return res.status(400).json({ error: 'Signup session expired' });
      }

      // Create user
      const result = await db.collection('users').insertOne({
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        password: pending.password,
        verified: true,
        createdAt: new Date()
      });

      // Delete pending signup
      await db.collection('pendingSignups').deleteOne({ phone });

      // Generate JWT
      const token = jwt.sign(
        { userId: result.insertedId, phone }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      return res.json({ 
        success: true, 
        token,
        user: { 
          id: result.insertedId, 
          name: pending.name, 
          email: pending.email,
          phone 
        }
      });
    }

    // POST /api/login - Request OTP for login
    if (endpoint === 'login' && method === 'POST') {
      const { phone } = await parseBody(req);
      
      if (!phone) {
        return res.status(400).json({ error: 'Phone number required' });
      }

      // Check if user exists
      const user = await db.collection('users').findOne({ phone });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Send OTP
      const otpResult = await sendOTP(phone);
      
      if (!otpResult.success) {
        return res.status(500).json({ error: 'Failed to send OTP' });
      }

      return res.json({ 
        success: true, 
        message: 'OTP sent to your WhatsApp' 
      });
    }

    // POST /api/verify-login - Verify OTP and login
    if (endpoint === 'verify-login' && method === 'POST') {
      const { phone, code } = await parseBody(req);
      
      if (!phone || !code) {
        return res.status(400).json({ error: 'Phone and code required' });
      }

      // Verify OTP
      const otpResult = await verifyOTP(phone, code);
      
      if (!otpResult.success) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Get user
      const user = await db.collection('users').findOne({ phone });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, phone }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      return res.json({ 
        success: true, 
        token,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email,
          phone: user.phone 
        }
      });
    }

    // GET /api/user - Get current user
    if (endpoint === 'user' && method === 'GET') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.collection('users').findOne({ 
          _id: new ObjectId(decoded.userId) 
        });
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ 
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            verified: user.verified
          }
        });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // PUT /api/user - Update user profile
    if (endpoint === 'user' && method === 'PUT') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { name, email } = await parseBody(req);
        
        if (!name || !email) {
          return res.status(400).json({ error: 'Name and email are required' });
        }

        const emailExists = await db.collection('users').findOne({ 
          email,
          _id: { $ne: new ObjectId(decoded.userId) }
        });
        
        if (emailExists) {
          return res.status(400).json({ error: 'Email already in use by another account' });
        }

        const result = await db.collection('users').updateOne(
          { _id: new ObjectId(decoded.userId) },
          { $set: { name, email, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = await db.collection('users').findOne({ 
          _id: new ObjectId(decoded.userId) 
        });

        return res.json({ 
          success: true,
          message: 'Profile updated successfully',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            verified: user.verified
          }
        });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
