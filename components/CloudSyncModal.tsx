import React, { useState, useEffect } from 'react';
import { X, Cloud, Upload, Download, LogIn, LogOut, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { 
    initGoogleDrive, 
    handleAuthClick, 
    signOut, 
    isSignedIn, 
    uploadBackup, 
    downloadBackup, 
    getBackupMetadata,
    isDriveConfigured,
    BackupData 
} from '../services/googleDriveService';
import { Prompt } from '../types';

interface CloudSyncModalProps {
    prompts: Prompt[];
    categories: string[];
    tags: string[];
    onRestore: (data: BackupData) => void;
    onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ prompts, categories, tags, onRestore, onClose }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [configMissing, setConfigMissing] = useState(false);

    useEffect(() => {
        if (!isDriveConfigured()) {
            setConfigMissing(true);
            return;
        }

        setIsLoading(true);
        initGoogleDrive(async () => {
            setIsLoading(false);
            if (isSignedIn()) {
                setIsLoggedIn(true);
                checkLastSync();
            }
        });
    }, []);

    const checkLastSync = async () => {
        try {
            const time = await getBackupMetadata();
            setLastSyncTime(time);
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogin = () => {
        handleAuthClick();
        // Since auth is popup based, we need to poll or wait for token. 
        // For simplicity in this structure, we rely on the user clicking "Sync" or "Check" after popup closes,
        // or a timeout.
        const check = setInterval(() => {
            if (isSignedIn()) {
                setIsLoggedIn(true);
                checkLastSync();
                clearInterval(check);
            }
        }, 1000);
        setTimeout(() => clearInterval(check), 60000); // Stop checking after 1 min
    };

    const handleLogout = () => {
        signOut();
        setIsLoggedIn(false);
        setLastSyncTime(null);
    };

    const handleUpload = async () => {
        setIsLoading(true);
        setStatusMsg('Загрузка в облако...');
        try {
            const data: BackupData = {
                prompts,
                categories,
                tags,
                lastUpdated: new Date().toISOString()
            };
            const modifiedTime = await uploadBackup(data);
            setLastSyncTime(modifiedTime);
            setStatusMsg('Успешно сохранено!');
            setTimeout(() => setStatusMsg(''), 3000);
        } catch (error) {
            console.error(error);
            setStatusMsg('Ошибка загрузки');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        setIsLoading(true);
        setStatusMsg('Скачивание...');
        try {
            const data = await downloadBackup();
            if (data && data.prompts) {
                onRestore(data);
                setStatusMsg('Данные восстановлены!');
                setTimeout(() => onClose(), 1500);
            } else {
                setStatusMsg('Файл резервной копии поврежден или пуст.');
            }
        } catch (error) {
            console.error(error);
            setStatusMsg('Ошибка скачивания или файл не найден.');
        } finally {
            setIsLoading(false);
        }
    };

    if (configMissing) {
        return (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative bg-slate-900 rounded-xl border border-red-900/50 p-6 max-w-md w-full shadow-2xl">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                    <div className="flex flex-col items-center text-center">
                        <AlertCircle size={48} className="text-red-500 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Настройка не найдена</h2>
                        <div className="text-slate-400 text-sm mb-4 space-y-3">
                            <p>
                                Для работы с Google Drive необходимо настроить <code>GOOGLE_CLIENT_ID</code> и <code>GOOGLE_API_KEY</code> в переменных окружения.
                            </p>
                            <p className="text-xs bg-slate-950 p-3 rounded border border-slate-800 text-slate-500">
                                <strong>Совет для Vercel / Vite:</strong><br/>
                                Если переменные добавлены, но не видны, попробуйте добавить префикс <code>VITE_</code> к названиям переменных в настройках проекта.<br/>
                                Например: <code>VITE_GOOGLE_CLIENT_ID</code>
                            </p>
                        </div>
                        <button onClick={onClose} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700">Закрыть</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-md bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Cloud size={20} className="text-blue-400" />
                        Синхронизация Google Drive
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!isLoggedIn ? (
                        <div className="text-center py-4">
                            <p className="text-slate-400 text-sm mb-6">
                                Войдите в Google аккаунт, чтобы сохранять резервные копии и синхронизировать промпты между устройствами.
                            </p>
                            <button 
                                onClick={handleLogin}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" /> : <LogIn size={18} />}
                                Войти через Google
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-500 uppercase">Статус</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-green-400 flex items-center gap-1.5 text-sm font-medium">
                                        <CheckCircle2 size={14} /> Подключено
                                    </span>
                                    <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
                                        <LogOut size={12} /> Выйти
                                    </button>
                                </div>
                                {lastSyncTime && (
                                    <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
                                        Последняя копия в облаке: <br/>
                                        <span className="text-slate-300">{new Date(lastSyncTime).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={handleUpload}
                                    disabled={isLoading}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Upload size={24} className="text-slate-400 group-hover:text-white mb-1" />
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white">Сохранить</span>
                                </button>

                                <button 
                                    onClick={handleDownload}
                                    disabled={isLoading}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={24} className="text-slate-400 group-hover:text-white mb-1" />
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white">Загрузить</span>
                                </button>
                            </div>

                            {statusMsg && (
                                <div className={`text-center text-sm font-medium py-2 rounded ${statusMsg.includes('Ошибка') ? 'text-red-400 bg-red-900/20' : 'text-emerald-400 bg-emerald-900/20'}`}>
                                    {statusMsg}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};