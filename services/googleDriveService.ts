
import { Prompt } from '../types';

// TypeScript declarations for Google API globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// --- Configuration & Helpers ---

const getEnvVar = (key: string): string => {
    try {
        // Check for process.env (Node/Webpack/Vite environments)
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key] as string;
        }
    } catch (e) {
        // Ignore errors accessing process
    }
    return '';
};

// You can hardcode these if environment variables fail, but be careful with secrets in frontend code.
const CLIENT_ID = getEnvVar('GOOGLE_CLIENT_ID'); 
const API_KEY = getEnvVar('GOOGLE_API_KEY');

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

        // Load GAPI
        const loadGapi = () => {
            const script = document.createElement('script');
            script.src = "https://apis.google.com/js/api.js";
            script.onload = () => {
                if (!window.gapi) { resolve(); return; }
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: API_KEY,
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        loadGis(); // Proceed to load GIS
                    } catch (e) {
                        console.error("GAPI Init Error:", e);
                        resolve();
                    }
                });
            };
            script.onerror = () => resolve();
            document.body.appendChild(script);
        };

        // Load GIS (Google Identity Services)
        const loadGis = () => {
            const script = document.createElement('script');
            script.src = "https://accounts.google.com/gsi/client";
            script.onload = () => {
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
            };
            script.onerror = () => resolve();
            document.body.appendChild(script);
        };

        loadGapi();
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
                    // Explicitly flag as connected in localStorage for UI sync
                    localStorage.setItem('gdrive_connected', 'true');
                }
            } else {
                signOut();
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
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        console.warn("Token client not initialized");
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

// Safe check that returns boolean without throwing
export const isSignedIn = (): boolean => {
    return !!getAccessToken();
};

// --- Drive API Operations ---

// Safe helper to check if Drive API is ready
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
        throw err;
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
