import { Prompt } from '../types';

// TypeScript declarations for Google API globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
declare var gapi: any;
declare var google: any;

// Helper to safely get env vars from various sources (Vite, CRA, Next.js, plain process.env)
const getEnvVar = (baseKey: string): string => {
    let val = '';
    
    // 1. Try import.meta.env (Vite standard)
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            val = import.meta.env[baseKey] || 
                  // @ts-ignore
                  import.meta.env[`VITE_${baseKey}`] ||
                  // @ts-ignore
                  import.meta.env[`NEXT_PUBLIC_${baseKey}`] || 
                  // @ts-ignore
                  import.meta.env[`REACT_APP_${baseKey}`];
        }
    } catch (e) {
        // ignore
    }

    if (val) return val;

    // 2. Try process.env (Webpack/CRA/Next/Polymorph)
    try {
        if (typeof process !== 'undefined' && process.env) {
            val = process.env[baseKey] || 
                  process.env[`VITE_${baseKey}`] ||
                  process.env[`NEXT_PUBLIC_${baseKey}`] || 
                  process.env[`REACT_APP_${baseKey}`];
        }
    } catch (e) {
        // ignore
    }
    
    return val || '';
};

const CLIENT_ID = getEnvVar('GOOGLE_CLIENT_ID');
const API_KEY = getEnvVar('GOOGLE_API_KEY');

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const BACKUP_FILENAME = 'prompt_book_backup.json';

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

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let accessToken: string | null = null;

// Helper to check if configuration is present
export const isDriveConfigured = () => {
    return !!CLIENT_ID && !!API_KEY;
};

// Initialize Google Identity Services
export const initGoogleDrive = (onInitComplete: () => void) => {
    if (!isDriveConfigured()) {
        console.warn("Google Drive Sync: CLIENT_ID or API_KEY missing.");
        return;
    }

    const script = document.createElement('script');
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            if (gisInited) onInitComplete();
        });
    };
    document.body.appendChild(script);

    // GIS is already loaded via index.html script tag, but we need to configure it
    const checkGis = setInterval(() => {
        if (window.google && window.google.accounts) {
            clearInterval(checkGis);
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        accessToken = tokenResponse.access_token;
                    }
                },
            });
            gisInited = true;
            if (gapiInited) onInitComplete();
        }
    }, 500);
};

export const handleAuthClick = () => {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({ prompt: '' });
    // Note: The actual callback defined in initTokenClient handles the token storage
};

export const getAccessToken = () => {
    return accessToken || (gapi.client.getToken() ? gapi.client.getToken().access_token : null);
};

export const isSignedIn = () => {
    return !!getAccessToken();
};

export const signOut = () => {
    const token = getAccessToken();
    if (token) {
        window.google.accounts.oauth2.revoke(token, () => {});
        gapi.client.setToken(null);
        accessToken = null;
    }
};

// --- Drive Operations ---

// 1. Find existing backup file
const findBackupFile = async (): Promise<DriveFile | null> => {
    try {
        const response = await gapi.client.drive.files.list({
            q: `name = '${BACKUP_FILENAME}' and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive',
        });
        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0] as DriveFile;
        }
        return null;
    } catch (err) {
        console.error("Error finding file:", err);
        throw err;
    }
};

// 2. Upload (Create or Update)
export const uploadBackup = async (data: BackupData): Promise<string> => {
    if (!isSignedIn()) throw new Error("Not signed in");

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
        // Update existing file
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = 'PATCH';
    }

    const response = await fetch(url, {
        method: method,
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form,
    });

    if (!response.ok) {
        throw new Error('Upload failed: ' + response.statusText);
    }

    const json = await response.json();
    return json.modifiedTime || new Date().toISOString();
};

// 3. Download (Load)
export const downloadBackup = async (): Promise<BackupData> => {
    if (!isSignedIn()) throw new Error("Not signed in");

    const existingFile = await findBackupFile();
    if (!existingFile) {
        throw new Error("Backup file not found in Google Drive.");
    }

    const response = await gapi.client.drive.files.get({
        fileId: existingFile.id,
        alt: 'media',
    });

    // gapi.client.drive.files.get with alt='media' returns the body in .body or .result
    // However, GAPI behavior can vary. Safe bet is parsing the result.
    return typeof response.result === 'string' ? JSON.parse(response.result) : response.result;
};

// 4. Get File Metadata (Last Modified)
export const getBackupMetadata = async (): Promise<string | null> => {
    if (!isSignedIn()) return null;
    const file = await findBackupFile();
    return file ? file.modifiedTime || null : null;
};