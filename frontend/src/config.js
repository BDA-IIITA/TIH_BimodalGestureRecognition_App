// Dynamic backend URL configuration
// Automatically detects the correct URLs based on where the app is running

const getBackendUrls = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  
  // Check if running locally (development mode)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development - always use direct backend URLs
    // React dev server runs on 3000, backends on 8000 and 5001
    return {
      flexUrl: 'http://localhost:8000',
      mediapipeUrl: 'http://localhost:5001',
      useProxy: false
    };
  }
  
  // Running on remote server (Vast.ai, etc.)
  // Use nginx proxy through the same origin - this avoids CORS issues!
  return {
    flexUrl: '', // Empty means same origin, use /api/flex/
    mediapipeUrl: `${protocol}//${hostname}:${port}`, // WebSocket needs full URL
    useProxy: true
  };
};

// Get URLs at module load time
const { flexUrl, mediapipeUrl, useProxy } = getBackendUrls();

// Export URLs - if useProxy is true, frontend will use /api/flex/ and /api/mediapipe/
export const FLEX_API_URL = useProxy ? '' : flexUrl;
export const MEDIAPIPE_WS_URL = mediapipeUrl;
export const USE_PROXY = useProxy;

// API endpoints
export const getFlexEndpoint = (path) => {
  if (USE_PROXY) {
    return `/api/flex${path.startsWith('/') ? path : '/' + path}`;
  }
  return `${FLEX_API_URL}${path.startsWith('/') ? path : '/' + path}`;
};

// Also export the function for dynamic reconfiguration
export { getBackendUrls };
