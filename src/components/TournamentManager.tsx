"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trophy, Calendar, Users, Activity, FileText, Check, Save, X, Edit2, Trash2, Cpu, Palette, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Tournament {
    id: string;
    name: string;
    status: string;
    organizer?: string;
    gameTitle?: string;
    createdAt: string;
    stages: any[];
    teams: any[];
    matches: any[];
}

interface CreationGroup {
    name: string;
    teamsCount: number;
    daysCount: number;
    matchesPerDay: number;
    matchMaps: string[][]; // [dayIndex][matchIndex]
}

interface CreationStage {
    name: string;
    type: string;
    groups: CreationGroup[];
}

export default function TournamentManager() {
    const router = useRouter();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [creationStep, setCreationStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; tournamentId: string | null }>({ isOpen: false, tournamentId: null });
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [organizer, setOrganizer] = useState('');
    const [gameTitle, setGameTitle] = useState('PUBG Mobile');
    
    // Advanced Form State
    const [creationStages, setCreationStages] = useState<CreationStage[]>([
        {
            name: 'Group Stage',
            type: 'Group',
            groups: [
                { 
                    name: 'Group A', 
                    teamsCount: 16, 
                    daysCount: 3, 
                    matchesPerDay: 4, 
                    matchMaps: [['Erangel', 'Miramar', 'Rondo', 'Erangel'], ['Erangel', 'Miramar', 'Rondo', 'Erangel'], ['Erangel', 'Miramar', 'Rondo', 'Erangel']] 
                },
                { 
                    name: 'Group B', 
                    teamsCount: 16, 
                    daysCount: 3, 
                    matchesPerDay: 4, 
                    matchMaps: [['Erangel', 'Miramar', 'Rondo', 'Erangel'], ['Erangel', 'Miramar', 'Rondo', 'Erangel'], ['Erangel', 'Miramar', 'Rondo', 'Erangel']] 
                }
            ]
        }
    ]);

    const fetchTournaments = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.TOURNAMENTS);
            if (res.ok) {
                const data = await res.json();
                setTournaments(data);
            } else {
                showNotification('Failed to retrieve tournaments from engine', 'error');
            }
        } catch (error) {
            console.warn('Backend reachability error', error);
            showNotification('Connection Refused: Ensure backend is running on port 4000', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (creationStep < 3) return;
        
        try {
            const res = await fetch(API_ENDPOINTS.TOURNAMENTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    organizer, 
                    gameTitle, 
                    type: 'Invitational', 
                    formatHasGroups: creationStages.length > 1 || creationStages.some(s => s.groups.length > 1),
                    stagesData: creationStages.map(s => ({
                        ...s,
                        daysCount: s.groups[0]?.daysCount || 1,
                        matchesCount: s.groups[0]?.matchesPerDay || 4,
                        teamCount: s.groups[0]?.teamsCount || 16,
                        hasGroups: s.groups.length > 1
                    }))
                })
            });

            if (res.ok) {
                resetForm();
                fetchTournaments();
            }
        } catch (error) {
            console.error('Save error', error);
        }
    };

    const addStage = () => {
        setCreationStages([...creationStages, {
            name: 'New Stage',
            type: 'Group',
            groups: [{ 
                name: 'Group A', 
                teamsCount: 16, 
                daysCount: 1, 
                matchesPerDay: 4, 
                matchMaps: [['Erangel', 'Miramar', 'Rondo', 'Erangel']] 
            }]
        }]);
    };

    const removeStage = (idx: number) => {
        setCreationStages(creationStages.filter((_, i) => i !== idx));
    };

    const updateStage = (idx: number, field: string, value: any) => {
        const newStages = [...creationStages];
        newStages[idx] = { ...newStages[idx], [field]: value };
        setCreationStages(newStages);
    };

    const addGroup = (stageIdx: number) => {
        const newStages = [...creationStages];
        const groupCount = newStages[stageIdx].groups.length;
        const groupLetter = String.fromCharCode(65 + groupCount); // A, B, C...
        newStages[stageIdx].groups.push({ 
            name: `Group ${groupLetter}`, 
            teamsCount: 16, 
            daysCount: 1, 
            matchesPerDay: 4, 
            matchMaps: [['Erangel', 'Miramar', 'Rondo', 'Erangel']] 
        });
        setCreationStages(newStages);
    };

    const removeGroup = (stageIdx: number) => {
        const newStages = [...creationStages];
        if (newStages[stageIdx].groups.length > 1) {
            newStages[stageIdx].groups.pop();
            setCreationStages(newStages);
        }
    };

    const updateGroup = (stageIdx: number, groupIdx: number, field: string, value: any) => {
        const newStages = [...creationStages];
        const group = { ...newStages[stageIdx].groups[groupIdx], [field]: value };
        
        // Always sync 2D matchMaps array
        const days = field === 'daysCount' ? parseInt(value) || 0 : group.daysCount;
        const matches = field === 'matchesPerDay' ? parseInt(value) || 0 : group.matchesPerDay;
        
        let currentMaps = [...group.matchMaps];
        
        // Update days (rows)
        if (days > currentMaps.length) {
            for (let i = currentMaps.length; i < days; i++) {
                currentMaps.push(Array(matches).fill('Erangel'));
            }
        } else {
            currentMaps = currentMaps.slice(0, days);
        }
        
        // Update matches per day (cols)
        currentMaps = currentMaps.map(dayMaps => {
            let dm = [...dayMaps];
            if (matches > dm.length) {
                for (let i = dm.length; i < matches; i++) {
                    dm.push(['Erangel', 'Miramar', 'Rondo'][i % 3]);
                }
            } else {
                dm = dm.slice(0, matches);
            }
            return dm;
        });
        
        group.matchMaps = currentMaps;
        newStages[stageIdx].groups[groupIdx] = group;
        setCreationStages(newStages);
    };

    const updateMatchMap = (sIdx: number, gIdx: number, dIdx: number, mIdx: number, map: string) => {
        const newStages = [...creationStages];
        newStages[sIdx].groups[gIdx].matchMaps[dIdx][mIdx] = map;
        setCreationStages(newStages);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmModal({ isOpen: true, tournamentId: id });
    };

    const confirmDelete = async () => {
        if (!confirmModal.tournamentId || isDeleting) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_ENDPOINTS.TOURNAMENTS}/${confirmModal.tournamentId}`, { method: 'DELETE' });
            if (res.ok) {
                showNotification('Tournament and all associated data deleted successfully', 'success');
                setConfirmModal({ isOpen: false, tournamentId: null });
                fetchTournaments();
            } else {
                const errData = await res.json();
                showNotification(errData.error || 'Failed to delete tournament', 'error');
            }
        } catch (error) {
            console.error('Delete error', error);
            showNotification('Connection error: Failed to reach server', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const resetForm = () => {
        setName('');
        setOrganizer('');
        setGameTitle('PUBG Mobile');
        setCreationStages([{
            name: 'Group Stage',
            type: 'Group',
            groups: [
                { 
                    name: 'Group A', 
                    teamsCount: 16, 
                    daysCount: 3, 
                    matchesPerDay: 6, 
                    matchMaps: Array.from({ length: 3 }, () => ['Erangel', 'Miramar', 'Rondo', 'Erangel', 'Miramar', 'Rondo']) 
                },
                { 
                    name: 'Group B', 
                    teamsCount: 16, 
                    daysCount: 3, 
                    matchesPerDay: 6, 
                    matchMaps: Array.from({ length: 3 }, () => ['Erangel', 'Miramar', 'Rondo', 'Erangel', 'Miramar', 'Rondo']) 
                }
            ]
        }]);
        setCreationStep(1);
        setIsCreating(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'LIVE': return 'text-rose-400 bg-rose-500/10 border border-rose-500/30';
            case 'UPCOMING': return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
            case 'COMPLETED': return 'text-slate-400 bg-slate-500/10 border border-slate-500/30';
            case 'DRAFT': return 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30';
            default: return 'text-slate-400';
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
            <div className="text-slate-500 font-mono tracking-widest text-sm uppercase">Loading Database...</div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-200 space-y-8"
        >

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeleting && setConfirmModal({ isOpen: false, tournamentId: null })}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            {/* Decorative Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="relative z-10 text-center">
                                <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                                    <Trophy className="text-amber-500" size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Wipe Tournament?</h3>
                                <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                    Are you sure? This will <span className="text-orange-400 font-bold">permanently erase</span> all stages, groups, match records, and historical analytics for this tournament engine.
                                </p>
                                
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={confirmDelete}
                                        disabled={isDeleting}
                                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-sm transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                                Wiping Data...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={18} /> Confirm Destruction
                                            </>
                                        )}
                                    </button>
                                    <button
                                        disabled={isDeleting}
                                        onClick={() => setConfirmModal({ isOpen: false, tournamentId: null })}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black uppercase tracking-wider text-sm transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header Area */}
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-6 mb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                        <Trophy className="text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" size={32} />
                        Tournament Master List
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">Create and manage multi-stage esports tournaments.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            if (isCreating) resetForm();
                            else setIsCreating(true);
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 border shadow-xl ${isCreating
                            ? "bg-slate-800 border-slate-700/50 text-slate-300 hover:bg-slate-700"
                            : "bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-400/50 text-white hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                            }`}
                    >
                        {isCreating ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Initialize Tournament</>}
                    </button>
                </div>
            </div>

            {/* Creation Wizard */}
            <AnimatePresence>
                {isCreating && (
                    <motion.form
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        onSubmit={handleSave}
                        className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        {/* Wizard Header / Steps */}
                        <div className="flex items-center gap-4 mb-10 border-b border-slate-800/50 pb-6">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all",
                                        creationStep === s ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]" : 
                                        creationStep > s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700/50"
                                    )}>
                                        {creationStep > s ? <Check size={14} /> : s}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] uppercase font-black tracking-widest transition-colors",
                                        creationStep === s ? "text-white" : "text-slate-500"
                                    )}>
                                        {s === 1 ? 'General' : s === 2 ? 'Stages' : 'Schedule'}
                                    </span>
                                    {s < 3 && <div className="w-8 h-px bg-slate-800" />}
                                </div>
                            ))}
                        </div>

                        {/* Step 1: General Info */}
                        {creationStep === 1 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80">Tournament Name *</label>
                                    <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-amber-500 transition-all shadow-inner placeholder:text-slate-700" placeholder="e.g. STRYMX PRO LEAGUE" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80">Organizer</label>
                                    <input type="text" value={organizer} onChange={e => setOrganizer(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner placeholder:text-slate-700" placeholder="e.g. Patronum Esports" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80">Game Title</label>
                                    <select value={gameTitle} onChange={e => setGameTitle(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner">
                                        <option value="PUBG Mobile">PUBG Mobile</option>
                                    </select>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Stage Builder */}
                        {creationStep === 2 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Tournament Stages</h4>
                                    <button type="button" onClick={addStage} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold">
                                        <Plus size={14} /> Add Stage
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {creationStages.map((stage, idx) => (
                                        <div key={idx} className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6 flex flex-wrap items-end gap-6 relative group">
                                            <button type="button" onClick={() => removeStage(idx)} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-red-500/20">
                                                <X size={14} />
                                            </button>
                                            <div className="flex-1 space-y-2 min-w-[200px]">
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Stage Name</label>
                                                <input type="text" value={stage.name} onChange={e => updateStage(idx, 'name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-amber-500/50 outline-none transition-all" />
                                            </div>
                                            <div className="w-[180px] space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Format</label>
                                                <select value={stage.type} onChange={e => updateStage(idx, 'type', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-amber-500/50 outline-none transition-all">
                                                    <option value="Group">Group Stage</option>
                                                    <option value="KnockOut">Knock Out Stage</option>
                                                    <option value="RoundRobin">Round Robin</option>
                                                    <option value="Finals">Grand Finals</option>
                                                </select>
                                            </div>
                                            <div className="w-[160px] space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Groups</label>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => removeGroup(idx)} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors disabled:opacity-30" disabled={stage.groups.length <= 1}><Minus size={16} /></button>
                                                    <span className="text-white font-mono bg-slate-800 px-4 py-2.5 rounded-xl border border-white/5 text-sm">{stage.groups.length}</span>
                                                    <button type="button" onClick={() => addGroup(idx)} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors"><Plus size={16} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Detailed Schedule */}
                        {creationStep === 3 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                {creationStages.map((stage, sIdx) => (
                                    <div key={sIdx} className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-px flex-1 bg-slate-800" />
                                            <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">{stage.name} Settings</h5>
                                            <div className="h-px flex-1 bg-slate-800" />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {stage.groups.map((group, gIdx) => (
                                                <div key={gIdx} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <h6 className="text-white font-black text-sm uppercase">{group.name}</h6>
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[8px] uppercase font-black text-slate-500 tracking-tighter">Teams</span>
                                                                <input type="number" value={group.teamsCount} onChange={e => updateGroup(sIdx, gIdx, 'teamsCount', parseInt(e.target.value))} className="w-16 bg-transparent border-b border-slate-700 focus:border-amber-500 outline-none text-white font-bold text-center" />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[8px] uppercase font-black text-slate-500 tracking-tighter">Days</span>
                                                                <input type="number" value={group.daysCount} onChange={e => updateGroup(sIdx, gIdx, 'daysCount', parseInt(e.target.value))} className="w-16 bg-transparent border-b border-slate-700 focus:border-amber-500 outline-none text-white font-bold text-center" />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[8px] uppercase font-black text-slate-500 tracking-tighter">Matches / Day</span>
                                                                <input type="number" value={group.matchesPerDay} onChange={e => updateGroup(sIdx, gIdx, 'matchesPerDay', parseInt(e.target.value))} className="w-16 bg-transparent border-b border-slate-700 focus:border-amber-500 outline-none text-white font-bold text-center" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-8">
                                                        {group.matchMaps.map((dayMaps, dIdx) => (
                                                            <div key={dIdx} className="space-y-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Day {dIdx + 1} Schedule</span>
                                                                </div>
                                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                                    {dayMaps.map((currentMap, mIdx) => (
                                                                        <div key={mIdx} className="space-y-1.5 p-3 bg-slate-950/40 rounded-xl border border-slate-800/50">
                                                                            <span className="text-[8px] uppercase font-black text-slate-600 block">Match #{mIdx + 1}</span>
                                                                            <select 
                                                                                value={currentMap} 
                                                                                onChange={e => updateMatchMap(sIdx, gIdx, dIdx, mIdx, e.target.value)}
                                                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-bold text-[10px] focus:border-amber-500 outline-none transition-all cursor-pointer"
                                                                            >
                                                                                {['Erangel', 'Miramar', 'Rondo'].map(m => (
                                                                                    <option key={m} value={m}>{m.toUpperCase()}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        <div className="flex justify-end pt-8 gap-4 border-t border-slate-800 mt-8 relative z-10">
                            {creationStep > 1 && (
                                <button type="button" onClick={(e) => { e.preventDefault(); setCreationStep(creationStep - 1); }} className="bg-transparent hover:bg-slate-800 text-slate-300 px-8 py-3 rounded-2xl font-black transition-colors uppercase tracking-widest text-xs border border-slate-800">
                                    Back
                                </button>
                            )}
                            <button type="button" onClick={(e) => { e.preventDefault(); resetForm(); }} className="bg-transparent hover:bg-slate-800 text-slate-400 px-6 py-3 rounded-2xl font-black transition-colors uppercase tracking-widest text-xs">
                                Cancel
                            </button>
                            {creationStep < 3 ? (
                                <button type="button" onClick={(e) => { e.preventDefault(); setCreationStep(creationStep + 1); }} className="bg-white text-slate-950 px-8 py-3 rounded-2xl font-black transition-all uppercase tracking-widest text-xs hover:bg-amber-400 flex items-center gap-2 shadow-xl shadow-white/5">
                                    Next Phase <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button type="submit" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-10 py-3 rounded-2xl font-black transition-all uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-0.5">
                                    <Cpu size={18} /> Initialize Engine
                                </button>
                            )}
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {tournaments.length === 0 && !isCreating ? (
                    <div className="col-span-full py-20 text-center text-slate-500 border border-slate-800 bg-slate-900/30 rounded-3xl flex flex-col items-center justify-center gap-4">
                        <Trophy className="w-16 h-16 text-slate-700/50" strokeWidth={1}/>
                        <span className="font-mono text-lg uppercase tracking-widest text-slate-400">No Tournaments Registered.</span>
                        <p className="text-sm max-w-md mt-2 text-slate-500">Initialize a new tournament engine to begin setting up stages, groups, and matches.</p>
                    </div>
                ) : (
                    tournaments.map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => router.push(`/tournaments/${t.id}`)}
                            className="group relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 transition-all duration-300 hover:border-amber-500/30 hover:shadow-[0_12px_40px_-5px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="absolute top-4 right-4 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full">
                                    <ArrowRight size={20} />
                                </div>
                            </div>

                            <button
                                onClick={(e) => handleDeleteClick(e, t.id)}
                                className="absolute bottom-6 right-6 p-2.5 bg-red-950/40 border border-red-900/30 hover:bg-red-900/60 hover:border-red-500/50 rounded-xl text-red-500 hover:text-red-300 transition-all shadow-sm z-20"
                                title="Delete Tournament"
                            >
                                <Trash2 size={16} />
                            </button>

                            <div className="flex flex-col mb-8 relative z-10 w-[90%]">
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase drop-shadow-md truncate">{t.name}</h3>
                                {t.organizer && <span className="text-sm font-bold text-slate-400 mt-1">{t.organizer}</span>}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider", getStatusColor(t.status))}>
                                        {t.status}
                                    </span>
                                    <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-md text-[10px] uppercase font-black tracking-wider">
                                        {t.gameTitle}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-auto relative z-10 w-[90%]">
                                <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex flex-col justify-center">
                                    <div className="flex justify-between items-center text-slate-500 mb-1">
                                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Stages</span>
                                        <Trophy className="w-3 h-3 text-amber-500/70" />
                                    </div>
                                    <div className="text-xl font-black text-white tracking-tighter">
                                        {t.stages?.length || 0}
                                    </div>
                                </div>

                                <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex flex-col justify-center">
                                    <div className="flex justify-between items-center text-slate-500 mb-1">
                                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Teams</span>
                                        <Users className="w-3 h-3 text-blue-500/70" />
                                    </div>
                                    <div className="text-xl font-black text-white tracking-tighter">
                                        {t.teams?.length || 0}
                                    </div>
                                </div>

                                <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex flex-col justify-center">
                                    <div className="flex justify-between items-center text-slate-500 mb-1">
                                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Matches</span>
                                        <Calendar className="w-3 h-3 text-emerald-500/70" />
                                    </div>
                                    <div className="text-xl font-black text-white tracking-tighter">
                                        {t.matches?.filter((m: any) => m.matchNumber > 0).length || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
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
                                type === 'success' && "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10",
                                type === 'error' && "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10",
                                type === 'info' && "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-blue-500/10"
                            )}>
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                    type === 'success' && "bg-amber-500/20",
                                    type === 'error' && "bg-rose-500/20",
                                    type === 'info' && "bg-blue-500/20"
                                )}>
                                    {type === 'success' && <Trophy size={20} />}
                                    {type === 'error' && <Activity size={20} className="text-rose-400" />}
                                    {type === 'info' && <Calendar size={20} />}
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
        </motion.div>
    );
}
