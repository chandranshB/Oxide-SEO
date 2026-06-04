/**
 * Google Search Console API Configuration
 * 
 * DEVELOPER INSTRUCTIONS:
 * 1. Go to Google Cloud Console (console.cloud.google.com)
 * 2. Create a new Project (or select an existing one)
 * 3. Go to APIs & Services > Enable APIs and Services
 * 4. Enable the "Google Search Console API"
 * 5. Go to Credentials > Create Credentials > OAuth client ID
 * 6. Application Type: "Desktop app"
 * 7. Copy the Client ID and Client Secret and paste them below:
 */

export const GSC_CONFIG = {
  // Replace these with your actual Desktop OAuth credentials before building for production
  // or set VITE_GSC_CLIENT_ID and VITE_GSC_CLIENT_SECRET in a .env file
  CLIENT_ID: import.meta.env.VITE_GSC_CLIENT_ID || '',
  CLIENT_SECRET: import.meta.env.VITE_GSC_CLIENT_SECRET || '',
  
  // Scopes required for the app to function
  SCOPES: 'https://www.googleapis.com/auth/webmasters.readonly',
  
  // The redirect URI for Desktop applications (Loopback IP)
  REDIRECT_URI: 'http://127.0.0.1:34852',
};
