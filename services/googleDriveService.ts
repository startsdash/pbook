
import { Prompt, Structure } from '../types';

// TypeScript declarations for Google API globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// --- Configuration & Helpers ---

const getClientId = (): string => {
  let key = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      // @ts-ignore
      key = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
  } catch (e) {}

  if (key) return key;

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
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) {
      // @ts-ignore
      key = import.meta.env.VITE_GOOGLE_API_KEY;
    }
  } catch (e) {}

  if (key) return key;

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
// Queue for token refresh promises to prevent parallel refresh requests
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
                resolve(); // Non-fatal, just sync won't work
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
        
        if (savedToken && expiry) {
            const now = Date.now();
            // If token is valid (with 5 min buffer), set it
            if (now < parseInt(expiry) - 300000) {
                if (window.gapi && window.gapi.client) {
                    window.gapi.client.setToken({ access_token: savedToken });
                    localStorage.setItem('gdrive_connected', 'true');
                    return true;
                }
            }
        }
        return false;
    } catch (e) {
        console.error("Session restore error", e);
        return false;
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

export const ensureValidToken = async (): Promise<void> => {
    if (!tokenClient) return Promise.reject("Google Auth not initialized");

    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const now = Date.now();
    
    // Check if expired or expiring soon (5 min buffer)
    if (!expiry || now > parseInt(expiry) - 300000) {
        // Prevent multiple simultaneous refresh requests
        if (refreshPromise) return refreshPromise;

        refreshPromise = new Promise((resolve, reject) => {
            try {
                // Temporarily override callback for this specific request
                tokenClient.callback = (resp: any) => {
                     if (resp.error) {
                         refreshPromise = null;
                         reject(resp);
                     } else {
                         saveToken(resp);
                         refreshPromise = null;
                         resolve();
                     }
                };
                
                // Silent refresh
                tokenClient.requestAccessToken({ prompt: '' });
            } catch (e) {
                refreshPromise = null;
                reject(e);
            }
        });
        
        return refreshPromise;
    }
    
    // Ensure GAPI has the token set
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken && window.gapi && window.gapi.client && !window.gapi.client.getToken()) {
        window.gapi.client.setToken({ access_token: savedToken });
    }

    return Promise.resolve();
};

export const handleAuthClick = () => {
    if (tokenClient) {
        // We use the default callback defined in init
        tokenClient.callback = (resp: any) => {
            if (resp.access_token) saveToken(resp);
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
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
    const token = getAccessToken();
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return false;
    return Date.now() < parseInt(expiry);
};

// --- Drive API Operations ---

const isDriveApiReady = () => {
    return isInitialized && window.gapi && window.gapi.client && window.gapi.client.drive;
};

const findBackupFile = async (): Promise<DriveFile | null> => {
    if (!isDriveApiReady()) throw new Error("Drive API not ready");
    await ensureValidToken();
    
    // We throw error here if API call fails so caller knows it's an error, not just "not found"
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
    // This allows errors to propagate so App.tsx knows sync is broken
    const file = await findBackupFile();
    if (file) {
        return { exists: true, modifiedTime: file.modifiedTime };
    }
    return { exists: false };
};
