import { API_URL } from '@/lib/api-config';
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Shield, Trash2, Edit2, Search, PlusCircle, Save, X, Globe, Upload, Image, Wand2, RefreshCcw } from 'lucide-react';
import { removeBackground, Config } from "@imgly/background-removal";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Player {
    id?: string;
    displayName: string;
    realName?: string;
    playerKey?: string;
    role?: string;
}

interface Tournament {
    id: string;
    name: string;
}

interface Team {
    id: string;
    name: string;
    tag: string;
    countryFlag: string;
    logoUrl: string;
    slotId: string;
    tournaments: any[];
    players: Player[];
    groupAssignments?: any[];
}

export default function TeamManager() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; teamId: string | null } | { isOpen: false; teamId: null }>({ isOpen: false, teamId: null });

    // Form state
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [countryFlag, setCountryFlag] = useState('');
    const [logoUrl, setLogoUrl] = useState(''); // existing URL (edit mode)
    const [logoFile, setLogoFile] = useState<File | null>(null); // newly selected file
    const [logoPreview, setLogoPreview] = useState<string | null>(null); // preview src
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [slotId, setSlotId] = useState('1');
    const [selectedTournamentId, setSelectedTournamentId] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [players, setPlayers] = useState<Player[]>(
        Array.from({ length: 4 }, () => ({ displayName: '', playerKey: '', realName: '' }))
    );
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    const fetchTeams = async () => {
        try {
            const res = await fetch(`${API_URL}/api/teams`);
            if (res.ok) setTeams(await res.json());
        } catch (error) {
            console.error('Failed to fetch teams', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTournaments = async () => {
        try {
            const res = await fetch(`${API_URL}/api/tournaments`);
            if (res.ok) setTournaments(await res.json());
        } catch (error) {
            console.error('Failed to fetch tournaments', error);
        }
    };

    const fetchTournamentGroups = async (tournamentId: string) => {
        if (!tournamentId) {
            setAvailableGroups([]);
            return;
        }
        setLoadingGroups(true);
        try {
            const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}`);
            if (res.ok) {
                const data = await res.json();
                // Flatten groups from all stages
                const groups: any[] = [];
                data.stages?.forEach((stage: any) => {
                    const groupCount = stage.groups?.length || 0;
                    stage.groups?.forEach((group: any) => {
                        groups.push({ ...group, stageName: stage.name, groupCount });
                    });
                });
                setAvailableGroups(groups);
            }
        } catch (error) {
            console.error('Failed to fetch groups', error);
        } finally {
            setLoadingGroups(false);
        }
    };

    useEffect(() => {
        fetchTeams();
        fetchTournaments();
    }, []);

    useEffect(() => {
        if (selectedTournamentId) {
            fetchTournamentGroups(selectedTournamentId);
        } else {
            setAvailableGroups([]);
            setSelectedGroupId('');
        }
    }, [selectedTournamentId]);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const resetForm = () => {
        setName('');
        setTag('');
        setCountryFlag('');
        setLogoUrl('');
        setLogoFile(null);
        setLogoPreview(null);
        setSlotId('1');
        setSelectedTournamentId('');
        setSelectedGroupId('');
        setAvailableGroups([]);
        setPlayers(Array.from({ length: 4 }, () => ({ displayName: '', playerKey: '', realName: '' })));
        setIsCreating(false);
        setEditingTeamId(null);
    }

    const handleEdit = (team: Team) => {
        setName(team.name);
        setTag(team.tag || '');
        setCountryFlag(team.countryFlag || '');
        setLogoUrl(team.logoUrl || '');
        setLogoFile(null);
        setLogoPreview(team.logoUrl || null);
        // SlotId format logic - check if it's digit-based
        const slotMatch = team.slotId?.match(/\d+/);
        setSlotId(slotMatch ? String(parseInt(slotMatch[0])) : '1');
        
        // Find existing tournament if any
        if (team.tournaments && team.tournaments.length > 0) {
            setSelectedTournamentId(team.tournaments[0].tournamentId || '');
        } else {
            setSelectedTournamentId('');
        }

        // Find existing group if any
        const groupAss = (team as any).groupAssignments;
        if (groupAss && groupAss.length > 0) {
            setSelectedGroupId(groupAss[0].groupId || '');
        } else {
            setSelectedGroupId('');
        }

        setPlayers(team.players 
            ? team.players.map(p => ({ 
                id: p.id, 
                displayName: p.displayName, 
                playerKey: p.playerKey, 
                realName: p.realName 
            }))
            : [{ displayName: '', playerKey: '', realName: '' }]
        );
        
        setEditingTeamId(team.id);
        setIsCreating(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        
        setIsSaving(true);
        try {
            const url = editingTeamId 
                ? `${API_URL}/api/teams/${editingTeamId}` 
                : `${API_URL}/api/teams`;
            
            const method = editingTeamId ? 'PUT' : 'POST';

            // Use FormData if a logo file is selected, otherwise use JSON
            let body: FormData | string;
            let headers: Record<string, string> = {};

            if (logoFile) {
                const fd = new FormData();
                fd.append('name', name);
                fd.append('tag', tag);
                fd.append('countryFlag', countryFlag);
                fd.append('slotId', `Team${slotId.padStart(2, '0')}`);
                fd.append('logoFile', logoFile);
                if (selectedTournamentId) fd.append('tournamentId', selectedTournamentId);
                if (selectedGroupId) fd.append('groupId', selectedGroupId);
                fd.append('players', JSON.stringify(players.filter(p => p.displayName.trim() !== '')));
                body = fd;
                // Don't set Content-Type — browser sets it with boundary automatically
            } else {
                body = JSON.stringify({ 
                    name, 
                    tag, 
                    countryFlag, 
                    logoUrl, 
                    slotId: `Team${slotId.padStart(2, '0')}`,
                    players: players.filter(p => p.displayName.trim() !== ''),
                    tournamentId: selectedTournamentId || undefined,
                    groupId: selectedGroupId || undefined
                });
                headers['Content-Type'] = 'application/json';
            }

            const res = await fetch(url, { method, headers, body });

            if (res.ok) {
                showNotification(editingTeamId ? 'Franchise updated successfully' : 'New franchise registered successfully', 'success');
                resetForm();
                fetchTeams();
            } else {
                const errData = await res.json();
                showNotification(errData.error || 'Failed to save franchise', 'error');
            }
        } catch (error) {
            console.error('Save team error', error);
            showNotification('Connection error: Failed to reach server', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmModal({ isOpen: true, teamId: id });
    }

    const executeDelete = async () => {
        if (!confirmModal.teamId) return;
        const id = confirmModal.teamId;
        setConfirmModal({ isOpen: false, teamId: null });
        
        try {
            const res = await fetch(`${API_URL}/api/teams/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showNotification('Team deleted successfully', 'success');
                fetchTeams();
            } else {
                const errData = await res.json();
                showNotification(errData.error || 'Failed to delete team', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Connection error: Failed to delete team', 'error');
        }
    }

    const exportIni = async () => {
        try {
            const res = await fetch(`${API_URL}/api/teams/export-ini`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showNotification(data.message || 'Successfully exported teams to strymx_teams.ini', 'success');
            } else {
                showNotification(data.error || 'Failed to export INI', 'error');
            }
        } catch (err) {
            console.error('Export error', err);
            showNotification('Connection error: Failed to reach server', 'error');
        }
    };

    const downloadIni = () => {
        let content = `/*** STRYMX Team Metadata Configuration ***/\n`;
        content += `/*** Generated from STRYMX Dashboard on ${new Date().toLocaleString()} ***/\n\n`;
        content += `[Script/ShadowTrackerExtra.FCustomTeamLogoAndColor]\n`;
        content += `EnableTeamLogoAndColor=1\n`;

        teams.forEach((t, index) => {
            const slotNo = t.slotId ? parseInt(t.slotId.replace(/\D/g, '')) : (index + 1);
            // Default color if missing
            const color = { r: 149, g: 193, b: 31, a: 255 }; 
            const country = t.countryFlag || 'PK';
            const logoPath = t.logoUrl || 'C:\\logo\\default.png';

            content += `TeamLogoAndColor=(TeamNo=${slotNo},TeamName=${t.name},TeamLogoPath=${logoPath},TeamColorR=${color.r},TeamColorG=${color.g},TeamColorB=${color.b},TeamColorA=255,PlayerColorR=255,PlayerColorG=255,PlayerColorB=255,PlayerColorA=0,Country=${country},fin)\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'strymx_teams.ini';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('Downloaded strymx_teams.ini for local game engine', 'success');
    };

    const handleStripBackground = async () => {
        let source: File | string | null = logoFile || logoUrl;
        if (!source) return;

        setIsProcessingAI(true);
        try {
            const config: Config = {
                model: 'isnet',
                output: {
                    format: 'image/png',
                    quality: 1,
                },
                debug: false
            };

            const resultBlob = await removeBackground(source, config);
            const processedFile = new File([resultBlob], `transparent_logo_${Date.now()}.png`, { type: 'image/png' });
            
            setLogoFile(processedFile);
            setLogoPreview(URL.createObjectURL(processedFile));
            showNotification('Neural Strip: Background removed successfully', 'success');
        } catch (err) {
            console.error('Neural Strip error:', err);
            showNotification('Neural Strip failed: Model processing error', 'error');
        } finally {
            setIsProcessingAI(false);
        }
    };

    const filteredTeams = teams.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.tag && t.tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            <div className="text-slate-500 font-mono tracking-widest text-sm uppercase">Loading Global Teams...</div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-200 space-y-8"
        >
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/50 pb-6 mb-6 gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                        <Globe className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" size={32} />
                        Global Team Database
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">Manage permanent team franchises, tags, and brand assets.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={downloadIni}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-400/50"
                        title="Download .ini for local game engine"
                    >
                        <Upload className="w-5 h-5 rotate-180" /> Download for Game
                    </button>
                    <button
                        onClick={exportIni}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-wider bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300"
                    >
                        <RefreshCcw className="w-5 h-5" /> Export to INI
                    </button>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-wider ${isCreating
                            ? "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300"
                            : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 border border-emerald-400/50"
                            }`}
                    >
                        {isCreating ? <><X className="w-5 h-5" /> Cancel</> : <><UserPlus className="w-5 h-5" /> Register Franchise</>}
                    </button>
                </div>
            </div>

            {/* Creation Form */}
            <AnimatePresence>
                {isCreating && (
                    <motion.form
                        initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        onSubmit={handleCreate}
                        className="bg-slate-900/60 backdrop-blur-xl border border-emerald-500/30 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                        
                        <h3 className="text-xl font-black text-white border-b border-emerald-900/50 pb-4 mb-8 uppercase tracking-wider text-emerald-100 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Shield size={20} className="text-emerald-400" /> {editingTeamId ? 'Edit Team Profile' : 'New Team Profile'}
                            </span>
                            {editingTeamId && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 font-mono tracking-widest">
                                    UUID: {editingTeamId.slice(0, 8)}...
                                </span>
                            )}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Organization Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
                                    placeholder="e.g. Natus Vincere"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Team Tag / Acronym</label>
                                <input
                                    type="text"
                                    value={tag}
                                    onChange={e => setTag(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner uppercase"
                                    placeholder="e.g. NAVI"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Country Code (ISO-2)</label>
                                <input
                                    type="text"
                                    value={countryFlag}
                                    onChange={e => setCountryFlag(e.target.value.toUpperCase())}
                                    maxLength={2}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner uppercase"
                                    placeholder="e.g. UA, PK, US"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Default Slot (1-25)</label>
                                <select
                                    value={slotId}
                                    onChange={e => setSlotId(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner appearance-none"
                                >
                                    {Array.from({ length: 25 }, (_, i) => (
                                        <option key={i + 1} value={i + 1} className="bg-slate-900">Slot {i + 1}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 lg:col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Team Logo</label>
                                
                                {/* Preview */}
                                {logoPreview && (
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-20 h-20 rounded-xl border border-emerald-500/30 bg-slate-950 flex items-center justify-center overflow-hidden relative group/preview">
                                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-1" />
                                            
                                            {/* AI Processing Overlay */}
                                            {isProcessingAI && (
                                                <div className="absolute inset-0 z-40 bg-indigo-900/40 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                                                    <RefreshCcw size={16} className="text-white animate-spin" />
                                                    <span className="text-[7px] font-black text-white uppercase tracking-tighter">Stripping...</span>
                                                </div>
                                            )}

                                            {/* Manual Strip Button (Overlay on hover) */}
                                            {!isProcessingAI && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); handleStripBackground(); }}
                                                    className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center z-10 gap-1 text-white"
                                                    title="Neural Background Strip"
                                                >
                                                    <Wand2 size={18} />
                                                    <span className="text-[7px] font-black uppercase tracking-widest">Neural Strip</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {logoFile ? (
                                                <span className="text-emerald-400 font-bold">{logoFile.name}</span>
                                            ) : (
                                                <span className="text-slate-500 italic">Current Database Asset</span>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-black">AI Ready</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Upload Zone */}
                                <div
                                    onClick={() => logoInputRef.current?.click()}
                                    className="relative w-full bg-slate-950/50 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl px-4 py-5 text-center cursor-pointer transition-all group"
                                >
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0] || null;
                                            setLogoFile(file);
                                            if (file) {
                                                setLogoPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                    <Upload className="w-6 h-6 text-slate-600 group-hover:text-emerald-400 mx-auto mb-2 transition-colors" />
                                    <p className="text-xs font-bold text-slate-500 group-hover:text-emerald-400 transition-colors">
                                        {logoFile ? logoFile.name : 'Click to upload logo (PNG, JPG, WebP, SVG)'}
                                    </p>
                                    <p className="text-[10px] text-slate-700 mt-1">Max 10MB</p>
                                </div>
                            </div>

                            <div className="space-y-4 lg:col-span-3">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400">Initial Tournament Assignment</label>
                                    <select
                                        value={selectedTournamentId}
                                        onChange={e => setSelectedTournamentId(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none"
                                    >
                                        <option value="" className="bg-slate-900 text-slate-500 italic">No Tournament (Global Database Only)</option>
                                        {tournaments.map(t => (
                                            <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedTournamentId && availableGroups.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2"
                                    >
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400">Assigned Group</label>
                                        <select
                                            value={selectedGroupId}
                                            onChange={e => setSelectedGroupId(e.target.value)}
                                            className="w-full bg-slate-950/20 border border-indigo-500/30 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none"
                                        >
                                            <option value="" className="bg-slate-900 text-slate-500 italic">Select a Group...</option>
                                            {availableGroups.map(g => (
                                                <option key={g.id} value={g.id} className="bg-slate-900">
                                                    {g.stageName} - {g.groupCount === 1 ? 'Lobby' : g.name}
                                                </option>
                                            ))}
                                        </select>
                                    </motion.div>
                                )}

                                {selectedTournamentId && availableGroups.length === 0 && !loadingGroups && (
                                    <p className="text-[10px] text-slate-500 italic px-1">This tournament doesn't have any groups defined yet.</p>
                                )}
                                
                                {loadingGroups && (
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-3 h-3 rounded-full border border-indigo-500 border-t-transparent animate-spin"></div>
                                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">Fetching groups...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Roster Section */}
                        <div className="mt-12 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Users size={16} className="text-indigo-400" /> Active Roster
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setPlayers([...players, { displayName: '', playerKey: '', realName: '' }])}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    <PlusCircle size={14} /> Add Player
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {players.map((p, pIdx) => (
                                    <motion.div 
                                        key={pIdx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 relative group"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setPlayers(players.filter((_, i) => i !== pIdx))}
                                            className="absolute top-2 right-2 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">In-Game Name *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={p.displayName}
                                                    onChange={e => {
                                                        const newPlayers = [...players];
                                                        newPlayers[pIdx].displayName = e.target.value;
                                                        setPlayers(newPlayers);
                                                    }}
                                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                                                    placeholder="IGN"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Player UID</label>
                                                <input
                                                    type="text"
                                                    value={p.playerKey}
                                                    onChange={e => {
                                                        const newPlayers = [...players];
                                                        newPlayers[pIdx].playerKey = e.target.value;
                                                        setPlayers(newPlayers);
                                                    }}
                                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                                                    placeholder="UID"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Real Name</label>
                                            <input
                                                type="text"
                                                value={p.realName}
                                                onChange={e => {
                                                    const newPlayers = [...players];
                                                    newPlayers[pIdx].realName = e.target.value;
                                                    setPlayers(newPlayers);
                                                }}
                                                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                                                placeholder="Full Name"
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-8 gap-4 border-t border-slate-800 mt-8 relative z-10">
                            <button type="button" onClick={resetForm} className="bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white px-6 py-3 rounded-xl font-black transition-colors uppercase tracking-wider text-sm">
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className={cn(
                                    "text-white px-8 py-3 rounded-xl font-black transition-all uppercase tracking-wider text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 border border-emerald-400/50",
                                    isSaving ? "bg-slate-700 cursor-not-allowed opacity-50" : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                                )}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} /> {editingTeamId ? 'Update Franchise' : 'Register Franchise'}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Toolbar */}
            <div className="flex items-center gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800 p-2 rounded-2xl">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search teams by name or tag..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                </div>
            </div>

            {/* Grid of Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTeams.length === 0 && !isCreating ? (
                    <div className="col-span-full py-24 text-center text-slate-500 border border-slate-800/80 border-dashed bg-slate-900/20 rounded-3xl flex flex-col items-center justify-center gap-4">
                        <Globe className="w-16 h-16 text-slate-700/50" strokeWidth={1} />
                        <span className="font-mono text-lg uppercase tracking-widest text-slate-400">No Teams Found in Global Database.</span>
                        <p className="text-sm max-w-sm mt-2 text-slate-500">Register franchises here to make them available across all tournaments and stages.</p>
                    </div>
                ) : (
                    filteredTeams.map((team, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={team.id}
                            className="group relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_12px_40px_-10px_rgba(16,185,129,0.2)] flex flex-col"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="w-16 h-16 shrink-0 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden relative">
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-1.5" />
                                    ) : team.countryFlag ? (
                                        <div className="text-2xl font-black text-slate-700">{team.countryFlag}</div>
                                    ) : (
                                        <Shield className="w-8 h-8 text-slate-600" />
                                    )}
                                </div>

                                <div className="flex gap-2 text-xs">
                                    <button
                                        onClick={() => handleEdit(team)}
                                        className="text-slate-600 hover:text-emerald-400 bg-slate-950/50 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/30 p-2.5 rounded-xl transition-all"
                                        title="Edit Team"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(team.id)}
                                        className="text-slate-600 hover:text-rose-400 bg-slate-950/50 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 p-2.5 rounded-xl transition-all"
                                        title="Delete Team"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10 flex-1">
                                <h4 className="font-black text-2xl text-white tracking-tight truncate group-hover:text-emerald-400 transition-colors" title={team.name}>
                                    {team.name.replace(/^SCOUT\s+/i, '')}
                                </h4>
                                <div className="flex items-center gap-2 mt-2">
                                    {team.tag && (
                                        <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-2.5 py-1 rounded-md font-black uppercase tracking-[0.1em]">
                                            {team.tag}
                                        </span>
                                    )}
                                    {team.slotId && (
                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md font-bold uppercase truncate">
                                            {team.slotId}
                                        </span>
                                    )}
                                    {team.groupAssignments && team.groupAssignments.length > 0 && (
                                        <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 px-2.5 py-1 rounded-md font-black uppercase tracking-[0.1em] truncate max-w-[100px]" title={team.groupAssignments[0].group?.name}>
                                            {(() => {
                                                const group = team.groupAssignments[0].group;
                                                const stage = group?.stage;
                                                // If stage has only one group, show 'Lobby'
                                                return (stage?.groups?.length === 1) ? 'Lobby' : group?.name;
                                            })()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10">
                                <span>{team.tournaments?.length || 0} Tournaments</span>
                                <span className="flex items-center gap-2 hover:text-emerald-400 cursor-pointer transition-colors group/roster">
                                    <Users className="w-4 h-4 text-emerald-500/50 group-hover/roster:text-emerald-400 transition-colors" /> {team.players?.length || 0} Players
                                </span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (() => {
                    const { message, type } = notification;
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-md"
                        >
                            <div className={cn(
                                "flex items-center gap-4 p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl",
                                type === 'success' && "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10",
                                type === 'error' && "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10",
                                type === 'info' && "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-blue-500/10"
                            )}>
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                    type === 'success' && "bg-emerald-500/20",
                                    type === 'error' && "bg-rose-500/20",
                                    type === 'info' && "bg-blue-500/20"
                                )}>
                                    {type === 'success' && <Shield size={20} />}
                                    {type === 'error' && <Shield size={20} className="text-rose-400" />}
                                    {type === 'info' && <Globe size={20} />}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">
                                        {type}
                                    </p>
                                    <p className="text-sm font-bold text-white leading-tight">
                                        {message}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setNotification(null)}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors opacity-40 hover:opacity-100"
                                >
                                    <X size={16} className="text-white" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmModal({ isOpen: false, teamId: null })}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            {/* Decorative Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="relative z-10 text-center">
                                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                                    <Trash2 className="text-rose-500" size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Confirm Deletion</h3>
                                <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                    Are you sure you want to delete this team globally? This will also remove any <span className="text-rose-400">historical match data</span> associated with this franchise.
                                </p>
                                
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={executeDelete}
                                        className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-sm transition-all shadow-lg shadow-rose-900/20"
                                    >
                                        Yes, Delete Permanently
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({ isOpen: false, teamId: null })}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black uppercase tracking-wider text-sm transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
