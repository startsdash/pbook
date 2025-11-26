
import { Prompt, Structure } from '../types';

// TypeScript declarations for Google API globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// --- Configuration & Helpers ---

// CRITICAL FIX: Bundlers (Vite, Webpack) only replace environment variables that are EXPLICITLY typed out.
// Dynamic access like process.env[key] or import.meta.env[key] often resolves to undefined in production.

const getClientId = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }
  if (typeof process !== 'undefined' && process.env) {
    // Explicitly check strict prefixes for CRA/Next.js/etc
    if (process.env.REACT_APP_GOOGLE_CLIENT_ID) return process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (process.env.GOOGLE_CLIENT_ID) return process.env.GOOGLE_CLIENT_ID;
  }
  return '';
};

const getApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_GOOGLE_API_KEY) return process.env.REACT_APP_GOOGLE_API_KEY;
    if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) return process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  }
  return '';
};

const getClientSecret = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_SECRET) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_GOOGLE_CLIENT_SECRET) return process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET) return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
    if (process.env.GOOGLE_CLIENT_SECRET) return process.env.GOOGLE_CLIENT_SECRET;
  }
  return '';
};

const CLIENT_ID = getClientId();
const API_KEY = getApiKey();
const CLIENT_SECRET = getClientSecret();

// Debug logs to verify keys are present (safe length check only)
console.log(`Drive Config: ID=${CLIENT_ID ? 'OK' : 'MISSING'}, API=${API_KEY ? 'OK' : 'MISSING'}, SECRET=${CLIENT_SECRET ? 'OK' : 'MISSING (Implicit Flow Only)'}`);

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILENAME = 'prompt_book_backup.json';

const TOKEN_STORAGE_KEY = 'gdrive_access_token';
const TOKEN_EXPIRY_KEY = 'gdrive_token_expiry';
const REFRESH_TOKEN_KEY = 'gdrive_refresh_token';

let tokenClient: any; // For Implicit Flow (fallback)
let codeClient: any;  // For Auth Code Flow (Refresh Token)
let isInitialized = false;
let refreshPromise: Promise<void> | null = null;

// --- Interfaces ---

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface BackupData {
  prompts: Prompt[];
  categories: string[];
  tags: string[];
  structures: Structure[];
  lastUpdated: string;
}

// --- Initialization ---

export const isDriveConfigured = (): boolean => {
    return !!(CLIENT_ID && API_KEY);
};

export const initGoogleDrivePromise = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!isDriveConfigured()) {
            console.warn("Google Drive Sync: CLIENT_ID or API_KEY missing.");
            resolve();
            return;
        }

        if (isInitialized) {
            resolve();
            return;
        }

        const loadScript = (src: string, onLoad: () => void) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                onLoad();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = onLoad;
            script.onerror = () => {
                console.error(`Failed to load script: ${src}`);
                resolve();
            };
            document.body.appendChild(script);
        };

        loadScript("https://apis.google.com/js/api.js", () => {
            if (!window.gapi) { resolve(); return; }
            
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    
                    loadScript("https://accounts.google.com/gsi/client", () => {
                        if (!window.google || !window.google.accounts) { resolve(); return; }

                        try {
                            // Initialize standard Token Client (Implicit Flow) as fallback
                            tokenClient = window.google.accounts.oauth2.initTokenClient({
                                client_id: CLIENT_ID,
                                scope: SCOPES,
                                callback: (tokenResponse: any) => {
                                    if (tokenResponse && tokenResponse.access_token) {
                                        saveToken(tokenResponse);
                                    }
                                },
                            });

                            // Initialize Code Client (Auth Code Flow) if Secret is present
                            if (CLIENT_SECRET) {
                                codeClient = window.google.accounts.oauth2.initCodeClient({
                                    client_id: CLIENT_ID,
                                    scope: SCOPES,
                                    ux_mode: 'popup',
                                    // @ts-ignore - 'prompt' and 'access_type' are critical for getting refresh_token
                                    prompt: 'consent',
                                    access_type: 'offline', 
                                    callback: (response: any) => {
                                        if (response.code) {
                                            exchangeCodeForToken(response.code);
                                        }
                                    },
                                });
                            }
                            
                            isInitialized = true;
                            // Attempt to restore session without prompting
                            restoreSession();
                            resolve();
                        } catch (e) {
                            console.error("GIS Init Error:", e);
                            resolve();
                        }
                    });

                } catch (e) {
                    console.error("GAPI Init Error:", e);
                    resolve();
                }
            });
        });
    });
};

const restoreSession = (): boolean => {
    try {
        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        
        // If we have a valid access token loaded in GAPI, we are good
        if (savedToken && expiry) {
            const now = Date.now();
            if (now < parseInt(expiry) - 60000) { // 1 min buffer
                if (window.gapi && window.gapi.client) {
                    window.gapi.client.setToken({ access_token: savedToken });
                    localStorage.setItem('gdrive_connected', 'true');
                    return true;
                }
            }
        }
        // If access token expired but we have refresh token, ensureValidToken will handle it later
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
             localStorage.setItem('gdrive_connected', 'true');
             return true;
        }

        return false;
    } catch (e) {
        console.error("Session restore error", e);
        return false;
    }
};

const saveToken = (tokenResponse: any, refreshToken?: string) => {
    if (tokenResponse.access_token) {
        const expiresIn = tokenResponse.expires_in || 3599;
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
        localStorage.setItem('gdrive_connected', 'true');
        
        if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: tokenResponse.access_token });
        }
    }
    if (refreshToken) {
        console.log("Saving new refresh token");
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
};

// --- Auth Code Flow Exchange ---

const exchangeCodeForToken = async (code: string) => {
    try {
        const params = new URLSearchParams();
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        // CRITICAL FIX: For ux_mode: 'popup', redirect_uri MUST be 'postmessage'
        params.append('redirect_uri', 'postmessage');

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();
        if (data.access_token) {
            saveToken(data, data.refresh_token);
        } else {
            console.error("Failed to exchange code", data);
        }
    } catch (e) {
        console.error("Token exchange error", e);
    }
};

const refreshAccessToken = async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken || !CLIENT_SECRET) {
        throw new Error("No refresh token or client secret available");
    }

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    const data = await response.json();
    if (data.access_token) {
        // data.refresh_token is usually undefined here unless rotated
        saveToken(data, data.refresh_token); 
    } else {
        // If refresh failed (e.g. revoked), clear storage
        if (data.error === 'invalid_grant' || data.error === 'unauthorized_client') {
            console.warn("Refresh token invalid, logging out.");
            signOut();
        }
        throw new Error(data.error_description || "Refresh failed");
    }
};

// --- Auth Methods ---

export const ensureValidToken = async (): Promise<void> => {
    // 1. Check if we have a valid Access Token currently
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const now = Date.now();
    
    // Valid if expiry exists and is in the future (> 5 min buffer)
    const isValid = expiry && (now < parseInt(expiry) - 300000);

    if (isValid) {
        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (savedToken && window.gapi && window.gapi.client && !window.gapi.client.getToken()) {
            window.gapi.client.setToken({ access_token: savedToken });
        }
        return Promise.resolve();
    }

    // 2. Prevent multiple simultaneous refresh requests
    if (refreshPromise) return refreshPromise;

    refreshPromise = new Promise(async (resolve, reject) => {
        try {
            // 3. Try Refresh Token Flow first (Preferred)
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (refreshToken && CLIENT_SECRET) {
                console.log("Refreshing access token via Refresh Token...");
                await refreshAccessToken();
                refreshPromise = null;
                resolve();
                return;
            }

            // 4. Fallback to Silent Refresh (Implicit Flow) - works only if 3rd party cookies allowed
            if (tokenClient) {
                console.log("Attempting silent implicit refresh (fallback)...");
                // Temporarily override callback
                const originalCallback = tokenClient.callback;
                tokenClient.callback = (resp: any) => {
                     tokenClient.callback = originalCallback; // Restore
                     if (resp.error) {
                         refreshPromise = null;
                         reject(resp);
                     } else {
                         saveToken(resp);
                         refreshPromise = null;
                         resolve();
                     }
                };
                tokenClient.requestAccessToken({ prompt: 'none' });
            } else {
                refreshPromise = null;
                reject("Auth not initialized");
            }
        } catch (e) {
            console.error("Token refresh failed", e);
            refreshPromise = null;
            reject(e);
        }
    });
    
    return refreshPromise;
};

export const handleAuthClick = () => {
    // Prefer Code Flow if Secret is available (supports Refresh Tokens)
    if (codeClient && CLIENT_SECRET) {
        // Code flow with explicit 'consent' prompt ensures we get a refresh_token
        codeClient.requestCode();
    } else if (tokenClient) {
        console.warn("CLIENT_SECRET missing: Falling back to Implicit Flow (1 hour session only).");
        // Fallback to Implicit Flow
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        console.error("Auth client not initialized. Check your API Keys.");
    }
};

export const signOut = () => {
    try {
        const token = getAccessToken();
        if (token && window.google) {
            window.google.accounts.oauth2.revoke(token, () => {});
        }
        if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken(null);
        }
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem('gdrive_connected');
    } catch (e) {
        console.error("Sign out error", e);
    }
};

export const getAccessToken = (): string | null => {
    if (typeof window.gapi !== 'undefined' && window.gapi.client) {
        return window.gapi.client.getToken()?.access_token || null;
    }
    return null;
};

export const isSignedIn = (): boolean => {
    // Consider signed in if we have a valid access token OR a refresh token
    const token = getAccessToken();
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    const isAccessValid = !!(token && expiry && Date.now() < parseInt(expiry));
    return isAccessValid || !!refreshToken;
};

// --- Drive API Operations ---

const isDriveApiReady = () => {
    return isInitialized && window.gapi && window.gapi.client && window.gapi.client.drive;
};

const findBackupFile = async (): Promise<DriveFile | null> => {
    if (!isDriveApiReady()) throw new Error("Drive API not ready");
    await ensureValidToken();
    
    const response = await window.gapi.client.drive.files.list({
        q: `name = '${BACKUP_FILENAME}' and trashed = false`,
        fields: 'files(id, name, modifiedTime)',
        spaces: 'drive',
    });
    const files = response.result.files;
    return (files && files.length > 0) ? files[0] as DriveFile : null;
};

export const uploadBackup = async (data: BackupData): Promise<string> => {
    if (!isDriveApiReady()) throw new Error("Not connected to Drive");
    await ensureValidToken();

    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/json',
    };

    let existingFile = null;
    try {
        existingFile = await findBackupFile();
    } catch (e) {
        console.warn("Could not check for existing file, creating new one.", e);
    }

    const accessToken = getAccessToken();
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFile) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = 'PATCH';
    }

    const response = await fetch(url, {
        method: method,
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form,
    });

    if (!response.ok) throw new Error('Upload failed: ' + response.statusText);

    const json = await response.json();
    return json.modifiedTime || new Date().toISOString();
};

export const downloadBackup = async (): Promise<BackupData> => {
    if (!isDriveApiReady()) throw new Error("Not connected to Drive");
    await ensureValidToken();

    const existingFile = await findBackupFile();
    if (!existingFile) throw new Error("Backup file not found in Google Drive.");

    const response = await window.gapi.client.drive.files.get({
        fileId: existingFile.id,
        alt: 'media',
    });

    let result = response.result;
    if (typeof result === 'string') {
        try {
            result = JSON.parse(result);
        } catch (e) {
            console.error("Failed to parse backup JSON", e);
            throw new Error("Invalid backup file format");
        }
    }
    return result;
};

export const getBackupMetadata = async (): Promise<string | null> => {
    try {
        const file = await findBackupFile();
        return file ? (file.modifiedTime || null) : null;
    } catch (e) {
        return null;
    }
};

export const checkForRemoteBackup = async (): Promise<{ exists: boolean, modifiedTime?: string } | null> => {
    const file = await findBackupFile();
    if (file) {
        return { exists: true, modifiedTime: file.modifiedTime };
    }
    return { exists: false };
};
