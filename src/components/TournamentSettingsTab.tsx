"use client"

import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, CheckCircle, XCircle, AlertCircle, RefreshCcw, ExternalLink, Layers, BarChart2, Sparkles, Link, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    tournament: any;
    onRefresh: () => void;
}

export default function TournamentSettingsTab({ tournament, onRefresh }: Props) {
    const [organizerEmail, setOrganizerEmail] = useState('');
    const [sheetUrl, setSheetUrl] = useState(tournament?.sheetUrl || '');
    const [isReady, setIsReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [showManualLink, setShowManualLink] = useState(false);

    useEffect(() => {
        fetch('http://localhost:4000/api/sheets/write-status')
            .then(r => r.json())
            .then(data => setIsReady(data.ready))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (tournament?.sheetUrl) setSheetUrl(tournament.sheetUrl);
    }, [tournament?.sheetUrl]);

    const showMsg = (text: string, type: 'success' | 'error' | 'info') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 6000);
    };

    const handleAutoCreate = async () => {
        if (!organizerEmail.trim() || !organizerEmail.includes('@')) {
            showMsg('Enter a valid email address', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:4000/api/sheets/create/${tournament.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizerEmail: organizerEmail.trim() })
            });
            const data = await res.json();
            if (data.success) {
                showMsg(`Sheet created and shared with ${organizerEmail}! Check your inbox.`, 'success');
                onRefresh();
            } else {
                showMsg(data.error || 'Failed to create sheet', 'error');
            }
        } catch {
            showMsg('Backend not reachable', 'error');
        }
        setLoading(false);
    };

    const handleManualSave = async () => {
        if (!sheetUrl.trim()) { showMsg('Paste a sheet URL', 'error'); return; }
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:4000/api/tournaments/${tournament.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetUrl: sheetUrl.trim() })
            });
            if (res.ok) {
                showMsg('Sheet URL saved!', 'success');
                onRefresh();
            }
        } catch { showMsg('Backend not reachable', 'error'); }
        setLoading(false);
    };

    const handleSetupSheet = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:4000/api/sheets/setup/${tournament.id}`, { method: 'POST' });
            const data = await res.json();
            showMsg(data.success ? `${data.tabsCreated} tabs created!` : (data.error || 'Setup failed'), data.success ? 'success' : 'error');
        } catch { showMsg('Backend not reachable', 'error'); }
        setLoading(false);
    };

    const handleUpdateStructure = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:4000/api/sheets/update-structure/${tournament.id}`, { method: 'POST' });
            const data = await res.json();
            showMsg(data.success ? (data.tabsAdded > 0 ? `Added ${data.tabsAdded} new tabs!` : 'Already up to date.') : (data.error || 'Failed'), data.success ? 'success' : 'error');
        } catch { showMsg('Backend not reachable', 'error'); }
        setLoading(false);
    };

    const handleSyncStandings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:4000/api/sheets/sync-standings/${tournament.id}`, { method: 'POST' });
            const data = await res.json();
            showMsg(data.success ? 'Standings synced!' : (data.error || 'Failed'), data.success ? 'success' : 'error');
        } catch { showMsg('Backend not reachable', 'error'); }
        setLoading(false);
    };

    const hasSheet = !!tournament?.sheetUrl;
    const matchCount = tournament?.matches?.length || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                    Tournament Settings
                </h3>
            </div>

            {/* Google Sheets Section */}
            <div className="border border-slate-800/60 bg-slate-900/40 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${hasSheet ? 'bg-emerald-500/10 border border-emerald-500/20' : isReady ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                        <FileSpreadsheet size={20} className={hasSheet ? 'text-emerald-400' : isReady ? 'text-blue-400' : 'text-amber-400'} />
                    </div>
                    <div>
                        <h4 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
                            Google Sheets
                            {hasSheet ? (
                                <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Connected</span>
                            ) : isReady ? (
                                <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Ready</span>
                            ) : (
                                <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Not Configured</span>
                            )}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            Auto-managed tournament data sheet -- PCOB data syncs automatically
                        </p>
                    </div>
                </div>

                <div className="p-5 space-y-5">

                    {/* NOT READY — setup instructions */}
                    {!isReady && (
                        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-3">
                            <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-wider">One-Time Setup Required</h5>
                            <ol className="text-[9px] text-slate-400 font-bold space-y-1.5 list-decimal list-inside leading-relaxed">
                                <li>Go to <span className="text-blue-400">Google Cloud Console</span> → create a Service Account</li>
                                <li>Enable <span className="text-blue-400">Google Sheets API</span> and <span className="text-blue-400">Google Drive API</span></li>
                                <li>Download the JSON key → place at <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">backend/config/google-service-account.json</code></li>
                                <li>Restart the backend</li>
                            </ol>
                        </div>
                    )}

                    {/* READY BUT NO SHEET — auto-create flow */}
                    {isReady && !hasSheet && (
                        <div className="space-y-4">
                            {/* Auto Create — Primary Action */}
                            <div className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20 rounded-xl p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-blue-400" />
                                    <h5 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Auto-Create Sheet</h5>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                                    Enter the organizer's email. STRYMX will create a Google Sheet with all match tabs
                                    and share it automatically. The sheet appears in their Google Drive — no manual setup.
                                </p>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="email"
                                            value={organizerEmail}
                                            onChange={e => setOrganizerEmail(e.target.value)}
                                            placeholder="organizer@email.com"
                                            className="w-full pl-9 pr-4 py-2.5 text-[11px] font-bold text-white bg-slate-950/60 border border-slate-700/50 rounded-xl focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600"
                                            disabled={loading}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAutoCreate}
                                        disabled={loading || !organizerEmail.trim()}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Sparkles size={13} />
                                        {loading ? 'Creating...' : 'Create & Share'}
                                    </button>
                                </div>
                            </div>

                            {/* Manual Link — Secondary */}
                            <div className="text-center">
                                <button
                                    onClick={() => setShowManualLink(!showManualLink)}
                                    className="text-[9px] font-bold text-slate-500 hover:text-slate-400 uppercase tracking-widest transition-colors"
                                >
                                    {showManualLink ? 'Hide manual option' : 'Or link an existing sheet manually'}
                                </button>
                            </div>

                            {showManualLink && (
                                <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                                        Existing Google Sheet URL
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={sheetUrl}
                                            onChange={e => setSheetUrl(e.target.value)}
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            className="flex-1 px-4 py-2.5 text-[11px] font-bold text-white bg-slate-950/60 border border-slate-700/50 rounded-xl focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600"
                                            disabled={loading}
                                        />
                                        <button
                                            onClick={handleManualSave}
                                            disabled={loading || !sheetUrl.trim()}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 border border-slate-600/30 disabled:opacity-40"
                                        >
                                            <Link size={13} /> Save
                                        </button>
                                    </div>
                                    <p className="text-[8px] text-slate-600 font-bold">
                                        Make sure the sheet is shared with the service account email (Editor access).
                                        Then click "Setup Sheet" after saving.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SHEET CONNECTED — management actions */}
                    {hasSheet && (
                        <div className="space-y-4">
                            {/* Sheet info */}
                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    <div>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sheet Connected</span>
                                        <p className="text-[9px] font-mono text-slate-500 truncate max-w-[400px] mt-0.5">{tournament.sheetUrl}</p>
                                    </div>
                                </div>
                                <a
                                    href={tournament.sheetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    <ExternalLink size={12} /> Open Sheet
                                </a>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button
                                    onClick={handleSetupSheet}
                                    disabled={loading}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                                >
                                    <Layers size={20} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        {loading ? 'Working...' : 'Setup Sheet'}
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-bold text-center">
                                        Create tabs for {matchCount} matches
                                    </span>
                                </button>

                                <button
                                    onClick={handleUpdateStructure}
                                    disabled={loading}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all disabled:opacity-40"
                                >
                                    <RefreshCcw size={20} className="text-blue-400" />
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                        {loading ? 'Working...' : 'Update Structure'}
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-bold text-center">
                                        Add tabs for new matches
                                    </span>
                                </button>

                                <button
                                    onClick={handleSyncStandings}
                                    disabled={loading}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all disabled:opacity-40"
                                >
                                    <BarChart2 size={20} className="text-purple-400" />
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                                        {loading ? 'Working...' : 'Sync Standings'}
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-bold text-center">
                                        Push rankings to sheet
                                    </span>
                                </button>
                            </div>

                            {/* Structure Preview */}
                            <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 space-y-2">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sheet Tabs</h5>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Overview</span>
                                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Live Match</span>
                                    {tournament?.stages?.map((stage: any) => (
                                        <span key={stage.id} className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                            {stage.name}
                                        </span>
                                    ))}
                                    <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Overall Standings</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* How it works */}
                    {!hasSheet && isReady && (
                        <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 space-y-2">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">How it works</h5>
                            <ol className="text-[9px] text-slate-500 font-bold space-y-1.5 list-decimal list-inside leading-relaxed">
                                <li>Enter the organizer's email and click <span className="text-blue-400">Create & Share</span></li>
                                <li>A fully structured Google Sheet appears in their Drive</li>
                                <li>During live matches, PCOB data <span className="text-emerald-400">auto-syncs</span> to the correct tab every 15 seconds</li>
                                <li>Overall Standings update automatically after each match</li>
                            </ol>
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
                </div>
            </div>
        </div>
    );
}
