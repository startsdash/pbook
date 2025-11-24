
import { Prompt } from '../types';

// TypeScript declarations for Google API globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// --- Configuration & Helpers ---

/**
 * Robust way to retrieve API keys across different build environments (Vite, Webpack, CRA, Next.js).
 * Bundlers replace 'process.env.VAR' or 'import.meta.env.VAR' with string literals at build time.
 * Dynamic access (e.g. process.env[key]) usually FAILS in production builds.
 */
const getClientId = (): string => {
  let key = '';
  
  // 1. Try Vite standard (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      // @ts-ignore
      key = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
  } catch (e) {}

  if (key) return key;

  // 2. Try Node/Webpack/CRA (process.env)
  // We must access properties DIRECTLY for the bundler to replace them.
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_GOOGLE_CLIENT_ID) return process.env.VITE_GOOGLE_CLIENT_ID;
      if (process.env.REACT_APP_GOOGLE_CLIENT_ID) return process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (process.env.GOOGLE_CLIENT_ID) return process.env.GOOGLE_CLIENT_ID;
      if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    }
  } catch (e) {}

  return '';
};

const getApiKey = (): string => {
  let key = '';

  // 1. Try Vite standard
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) {
      // @ts-ignore
      key = import.meta.env.VITE_GOOGLE_API_KEY;
    }
  } catch (e) {}

  if (key) return key;

  // 2. Try Node/Webpack/CRA
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_GOOGLE_API_KEY) return process.env.VITE_GOOGLE_API_KEY;
      if (process.env.REACT_APP_GOOGLE_API_KEY) return process.env.REACT_APP_GOOGLE_API_KEY;
      if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
      if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) return process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    }
  } catch (e) {}

  return '';
};

const CLIENT_ID = getClientId();
const API_KEY = getApiKey();

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILENAME = 'prompt_book_backup.json';
const TOKEN_STORAGE_KEY = 'gdrive_access_token';
const TOKEN_EXPIRY_KEY = 'gdrive_token_expiry';

let tokenClient: any;
let isInitialized = false;

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
  lastUpdated: string;
}

// --- Initialization ---

export const isDriveConfigured = (): boolean => {
    return !!(CLIENT_ID && API_KEY);
};

export const initGoogleDrivePromise = (): Promise<void> => {
    return new Promise((resolve) => {
        if (!isDriveConfigured()) {
            console.warn("Google Drive Sync: CLIENT_ID or API_KEY missing.");
            resolve();
            return;
        }

        if (isInitialized) {
            resolve();
            return;
        }

        // Helper to load script safely
        const loadScript = (src: string, onLoad: () => void) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = onLoad;
            script.onerror = () => {
                console.error(`Failed to load script: ${src}`);
                resolve(); // Resolve anyway to prevent app hang
            };
            document.body.appendChild(script);
        };

        // 1. Load GAPI
        loadScript("https://apis.google.com/js/api.js", () => {
            if (!window.gapi) { resolve(); return; }
            
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    
                    // 2. Load GIS (Identity Services) after GAPI
                    loadScript("https://accounts.google.com/gsi/client", () => {
                        if (!window.google || !window.google.accounts) { resolve(); return; }

                        try {
                            tokenClient = window.google.accounts.oauth2.initTokenClient({
                                client_id: CLIENT_ID,
                                scope: SCOPES,
                                callback: (tokenResponse: any) => {
                                    if (tokenResponse && tokenResponse.access_token) {
                                        saveToken(tokenResponse);
                                    }
                                },
                            });
                            
                            isInitialized = true;
                            tryRestoreSession();
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

const tryRestoreSession = () => {
    try {
        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        
        if (savedToken && expiry) {
            const now = Date.now();
            if (now < parseInt(expiry)) {
                if (window.gapi && window.gapi.client) {
                    window.gapi.client.setToken({ access_token: savedToken });
                    localStorage.setItem('gdrive_connected', 'true');
                }
            } else {
                signOut(); // Token expired
            }
        }
    } catch (e) {
        console.error("Session restore error", e);
    }
};

const saveToken = (tokenResponse: any) => {
    if (tokenResponse.access_token) {
        const expiresIn = tokenResponse.expires_in || 3599;
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
        localStorage.setItem('gdrive_connected', 'true');
    }
};

// --- Auth Methods ---

export const handleAuthClick = () => {
    if (tokenClient) {
        // Use prompt: 'consent' to force showing account chooser if needed, or empty for auto
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        console.warn("Token client not initialized. Check your network or API Keys.");
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
    return !!getAccessToken();
};

// --- Drive API Operations ---

const isDriveApiReady = () => {
    return isInitialized && 
           window.gapi && 
           window.gapi.client && 
           window.gapi.client.drive;
};

const findBackupFile = async (): Promise<DriveFile | null> => {
    if (!isDriveApiReady()) return null;
    
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${BACKUP_FILENAME}' and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive',
        });
        const files = response.result.files;
        return (files && files.length > 0) ? files[0] as DriveFile : null;
    } catch (err) {
        console.error("Error finding file:", err);
        return null;
    }
};

export const uploadBackup = async (data: BackupData): Promise<string> => {
    if (!isSignedIn() || !isDriveApiReady()) throw new Error("Not connected to Drive");

    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/json',
    };

    const existingFile = await findBackupFile();
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
    if (!isSignedIn() || !isDriveApiReady()) throw new Error("Not connected to Drive");

    const existingFile = await findBackupFile();
    if (!existingFile) throw new Error("Backup file not found in Google Drive.");

    const response = await window.gapi.client.drive.files.get({
        fileId: existingFile.id,
        alt: 'media',
    });

    return typeof response.result === 'string' ? JSON.parse(response.result) : response.result;
};

export const getBackupMetadata = async (): Promise<string | null> => {
    if (!isSignedIn()) return null;
    try {
        const file = await findBackupFile();
        return file ? file.modifiedTime || null : null;
    } catch (e) {
        return null;
    }
};

export const checkForRemoteBackup = async (): Promise<{ exists: boolean, modifiedTime?: string } | null> => {
    if (!isSignedIn()) return null;
    try {
        const file = await findBackupFile();
        if (file) {
            return { exists: true, modifiedTime: file.modifiedTime };
        }
    } catch (e) {
        // Silently fail for auto-checks
    }
    return { exists: false };
};
