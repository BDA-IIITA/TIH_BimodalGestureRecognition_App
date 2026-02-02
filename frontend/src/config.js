// ============================================
// BACKEND CONFIGURATION
// ============================================

// Vast.ai backend URLs
const VASTAI_HOST = '1.208.108.242';
const VASTAI_MEDIAPIPE_PORT = '58723';
const VASTAI_FLEX_PORT = '58778';

// Local backend URLs
const LOCAL_MEDIAPIPE_PORT = '5001';
const LOCAL_FLEX_PORT = '8000';

// Auto-detect: use local URLs when running on localhost:3000, otherwise use Vast.ai
const isLocal = typeof window !== 'undefined' && 
                window.location.hostname === 'localhost' && 
                window.location.port === '3000';

// Choose URLs based on environment
export const FLEX_API_URL = isLocal 
  ? `http://localhost:${LOCAL_FLEX_PORT}`
  : `http://${VASTAI_HOST}:${VASTAI_FLEX_PORT}`;

export const MEDIAPIPE_WS_URL = isLocal
  ? `http://localhost:${LOCAL_MEDIAPIPE_PORT}`
  : `http://${VASTAI_HOST}:${VASTAI_MEDIAPIPE_PORT}`;

// Simple endpoint builder
export const getFlexEndpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${FLEX_API_URL}${cleanPath}`;
};

// Debug logging
console.log('Backend Config:', { flex: FLEX_API_URL, mediapipe: MEDIAPIPE_WS_URL, isLocal });
