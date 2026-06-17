const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing or malformed Authorization header', 
      code: 'AUTH_HEADER_MISSING' 
    });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, email: payload.email };

    // --- Silent Session Token Auto-Renewal ---
    const nowSeconds = Math.floor(Date.now() / 1000);
    // If the token expires in less than 2 days (172800 seconds), refresh it for another 7 days
    if (payload.exp && (payload.exp - nowSeconds) < 2 * 24 * 60 * 60) {
      const newToken = jwt.sign(
        { id: payload.id, email: payload.email }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );
      // Attach to headers and expose it so client-side Axios can read it
      res.setHeader('X-Refresh-Token', newToken);
      res.setHeader('Access-Control-Expose-Headers', 'X-Refresh-Token');
      console.log(`🔄 Silent Token Rotation: Session auto-renewed for user ${payload.email}`);
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED' 
      });
    }
    return res.status(401).json({ 
      error: 'Invalid token', 
      code: 'TOKEN_INVALID' 
    });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
