import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { FileSpreadsheet, Link, Unlink, RefreshCcw, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SheetStatus {
    connected: boolean;
    url: string | null;
    pollInterval: number;
    lastPlayerCount: number;
    errors: number;
}

/**
 * SheetDataManager
 * ────────────────
 * Dashboard widget for connecting/disconnecting a Google Sheet
 * as a backup/alternative data source. Completely separate from PCOB.
 *
 * Shows: connection status, player count, error count, URL input.
 */
export default function SheetDataManager() {
    const [status, setStatus] = useState<SheetStatus | null>(null);
    const [sheetUrl, setSheetUrl] = useState('');
    const [pollInterval, setPollInterval] = useState(5);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/sheets/status`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
                if (data.url && !sheetUrl) setSheetUrl(data.url);
            }
        } catch {}
    }, [sheetUrl]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleConnect = async () => {
        if (!sheetUrl.trim()) {
            setMessage({ text: 'Please paste a Google Sheet URL', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/sheets/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: sheetUrl, pollInterval: pollInterval * 1000 }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ text: `Connected! Polling every ${pollInterval}s`, type: 'success' });
                fetchStatus();
            } else {
                setMessage({ text: data.error || 'Connection failed', type: 'error' });
            }
        } catch {
            setMessage({ text: 'Backend not reachable', type: 'error' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 4000);
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/api/sheets/disconnect`, { method: 'POST' });
            setMessage({ text: 'Disconnected from Google Sheet', type: 'info' });
            fetchStatus();
        } catch {
            setMessage({ text: 'Backend not reachable', type: 'error' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 4000);
    };

    const isConnected = status?.connected ?? false;

    return (
        <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/50 border border-slate-700/50'}`}>
                        <FileSpreadsheet size={20} className={isConnected ? 'text-emerald-400' : 'text-slate-500'} />
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase tracking-widest flex items-center gap-2 text-sm">
                            Google Sheets
                            {isConnected && (
                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                                </span>
                            )}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            Backup Data Source — Separate from PCOB
                        </p>
                    </div>
                </div>

                {isConnected && (
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider">
                        <div className="flex flex-col items-center">
                            <span className="text-emerald-400 text-lg font-black">{status?.lastPlayerCount || 0}</span>
                            <span className="text-slate-500">Players</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-blue-400 text-lg font-black">{(status?.pollInterval || 5000) / 1000}s</span>
                            <span className="text-slate-500">Interval</span>
                        </div>
                        {(status?.errors || 0) > 0 && (
                            <div className="flex flex-col items-center">
                                <span className="text-red-400 text-lg font-black">{status?.errors}</span>
                                <span className="text-slate-500">Errors</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
                {/* URL input */}
                <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                        Google Sheet URL
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={sheetUrl}
                            onChange={e => setSheetUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                            className="flex-1 px-4 py-2.5 text-[11px] font-bold text-white bg-slate-950/60 border border-slate-700/50 rounded-xl focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                            disabled={loading}
                        />
                        {!isConnected ? (
                            <button
                                onClick={handleConnect}
                                disabled={loading || !sheetUrl.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Link size={13} />
                                {loading ? 'Connecting...' : 'Connect'}
                            </button>
                        ) : (
                            <button
                                onClick={handleDisconnect}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                            >
                                <Unlink size={13} />
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>

                {/* Poll interval */}
                {!isConnected && (
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                            Poll Interval (seconds)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={2}
                                max={30}
                                step={1}
                                value={pollInterval}
                                onChange={e => setPollInterval(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-slate-800 rounded-full accent-blue-500 cursor-pointer"
                            />
                            <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg min-w-[50px] text-center">
                                {pollInterval}s
                            </span>
                        </div>
                        <p className="text-[8px] text-slate-600 mt-1.5">
                            Lower = faster updates but more requests. 5 seconds recommended.
                        </p>
                    </div>
                )}

                {/* Instructions */}
                {!isConnected && (
                    <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">How to connect</h4>
                        <ol className="text-[9px] text-slate-500 font-bold space-y-1.5 list-decimal list-inside leading-relaxed">
                            <li>Open your Google Sheet with team/player data</li>
                            <li>Go to <span className="text-blue-400">File → Share → Publish to web</span></li>
                            <li>Select the sheet tab → choose <span className="text-blue-400">Comma-separated values (.csv)</span></li>
                            <li>Click Publish and copy the URL</li>
                            <li>Paste the URL above and click Connect</li>
                        </ol>
                        <p className="text-[8px] text-slate-600 mt-2 border-t border-slate-800/50 pt-2">
                            Required columns: <span className="text-slate-400">name, team (or teamName), kills (or killNum)</span><br />
                            Optional: damage, headshots, knockouts, survivalTime, rank, placement, logoUrl, photoUrl
                        </p>
                    </div>
                )}

                {/* Status message */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                                message.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                                'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                            }`}
                        >
                            {message.type === 'success' ? <CheckCircle size={14} /> :
                             message.type === 'error' ? <XCircle size={14} /> :
                             <AlertCircle size={14} />}
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active connection info */}
                {isConnected && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Sheet Active</span>
                            <span className="text-[8px] font-mono text-slate-500 truncate max-w-[300px]">{status?.url}</span>
                        </div>
                        <p className="text-[8px] text-slate-500 leading-relaxed">
                            Data flows through the same pipeline as PCOB. All overlays that show player/team
                            stats will automatically use sheet data when PCOB is not connected.
                            Both sources can run simultaneously — the most recent update wins.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
