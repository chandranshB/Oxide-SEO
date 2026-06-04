import Database from '@tauri-apps/plugin-sql';
import { GSC_CONFIG } from '../config/gsc';

export async function refreshAccessTokenIfNeeded(): Promise<string | null> {
  const token = localStorage.getItem('gsc_access_token');
  const expiry = localStorage.getItem('gsc_token_expiry');
  const refreshToken = localStorage.getItem('gsc_refresh_token');
  const clientId = GSC_CONFIG.CLIENT_ID;
  const clientSecret = GSC_CONFIG.CLIENT_SECRET;

  if (!token) return null;

  // If token expires in less than 5 minutes, refresh it
  if (expiry && parseInt(expiry) < (new Date().getTime() + 300000)) {
    if (!refreshToken || !clientId || !clientSecret) return null;
    
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || 'Failed to refresh token');

      localStorage.setItem('gsc_access_token', data.access_token);
      const newExpiry = new Date().getTime() + (data.expires_in * 1000);
      localStorage.setItem('gsc_token_expiry', newExpiry.toString());
      
      return data.access_token;
    } catch (e) {
      console.error('Token refresh failed', e);
      return null;
    }
  }

  return token;
}

export async function fetchGscSites(): Promise<string[]> {
  const token = await refreshAccessTokenIfNeeded();
  if (!token) throw new Error('Not authenticated.');

  const response = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Failed to fetch sites');

  return (data.siteEntry || []).map((site: any) => site.siteUrl);
}

export async function fetchAndSyncGscData(siteUrl: string): Promise<void> {
  if (!siteUrl) throw new Error('Site URL is not configured.');

  const token = await refreshAccessTokenIfNeeded();
  if (!token) throw new Error('Not authenticated. Please connect GSC.');

  // Calculate dates (Last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const response = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: startStr,
      endDate: endStr,
      dimensions: ['query', 'page'],
      rowLimit: 5000,
      aggregationType: 'auto',
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      // Clear token to force re-auth
      localStorage.removeItem('gsc_access_token');
    }
    throw new Error(data.error?.message || 'Failed to fetch GSC data');
  }

  const rows = data.rows || [];
  
  // Connect to DB and clear existing data
  const db = await Database.load('sqlite:seo_kit.db');
  await db.execute('DELETE FROM gsc_metrics');

  // Insert new rows in batches of 500 to avoid SQLite limits and IPC bottlenecks
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    let placeholders = [];
    let values = [];
    let paramIndex = 1;
    
    for (const row of batch) {
      placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      values.push(
        row.keys[0], 
        row.keys[1], 
        row.clicks, 
        row.impressions, 
        row.ctr * 100, // Convert to percentage
        row.position
      );
    }

    if (placeholders.length > 0) {
      await db.execute(
        `INSERT INTO gsc_metrics (keyword, page, clicks, impressions, ctr, average_position) VALUES ${placeholders.join(',')}`,
        values
      );
    }
  }
}
