// ============================================
// BACKEND CONFIGURATION
// ============================================

// Detect if running in development mode (npm start on localhost:3000)
const isDevelopment = typeof window !== 'undefined' && 
                      window.location.hostname === 'localhost' && 
                      window.location.port === '3000';

// In development: use direct backend ports
// In production (Docker): use nginx proxy paths on same origin
export const FLEX_API_URL = isDevelopment 
  ? 'http://localhost:8000'
  : '/api/flex';

export const MEDIAPIPE_WS_URL = isDevelopment
  ? 'http://localhost:5001'
  : '/api/mediapipe';

// Socket.IO uses same origin in production (nginx proxies /socket.io/)
export const SOCKET_URL = isDevelopment
  ? 'http://localhost:5001'
  : '';  // Empty string = same origin

// Simple endpoint builder
export const getFlexEndpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${FLEX_API_URL}${cleanPath}`;
};

// Debug logging
console.log('Backend Config:', { 
  flex: FLEX_API_URL, 
  mediapipe: MEDIAPIPE_WS_URL, 
  socket: SOCKET_URL || '(same origin)',
  isDevelopment 
});
