"use client"
import { API_URL } from '@/lib/api-config';


import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trophy, Users, Layers, Calendar, Settings, ArrowLeft, Plus, Save, Trash2, Activity, Play, CheckCircle, Edit, X, UserPlus, ArrowRightCircle, RefreshCcw, Zap, Radio, BarChart2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/DashboardLayout';
import TournamentSettingsTab from '@/components/TournamentSettingsTab';

export default function TournamentDetails() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [tournament, setTournament] = useState<any>(null);
    const [globalTeams, setGlobalTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, teams, stages, matches, standings, settings
    const [standings, setStandings] = useState<any[]>([]);
    const [selectedStandingsDay, setSelectedStandingsDay] = useState<number | null>(null);

    // Form states for adding items
    const [assignTeamId, setAssignTeamId] = useState('');
    const [assignSlotId, setAssignSlotId] = useState('');
    const [isAssigningTeam, setIsAssigningTeam] = useState(false);

    const [isAddingStage, setIsAddingStage] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [newStageType, setNewStageType] = useState('Group Stage');

    const [newStageDaysCount, setNewStageDaysCount] = useState(1);
    const [newStageMatchesCount, setNewStageMatchesCount] = useState(5);
    const [newStageTeamCount, setNewStageTeamCount] = useState(16);

    // Edit Stage states
    const [editingStageId, setEditingStageId] = useState<string | null>(null);
    const [editStageName, setEditStageName] = useState('');
    const [editStageType, setEditStageType] = useState('Group Stage');
    const [editStageDaysCount, setEditStageDaysCount] = useState(1);
    const [editStageMatchesCount, setEditStageMatchesCount] = useState(5);
    const [editStageTeamCount, setEditStageTeamCount] = useState(16);
    const [editStageGroups, setEditStageGroups] = useState<any[]>([]);

    // Group Team Management States
    const [isManagingGroup, setIsManagingGroup] = useState(false);
    const [managingGroup, setManagingGroup] = useState<any>(null);
    const [groupTeams, setGroupTeams] = useState<any[]>([]);
    const [isAdvancingTeams, setIsAdvancingTeams] = useState(false);
    const [advancingCount, setAdvancingCount] = useState(5);
    const [advancingTargetGroupId, setAdvancingTargetGroupId] = useState('');

    // Custom Delete State
    const [stageToDelete, setStageToDelete] = useState<any>(null);

    const fetchData = async () => {
        try {
            const [tRes, gTeamsRes] = await Promise.all([
                fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}`),
                fetch(`${API_URL}/api/teams`)
            ]);
            
            if (tRes.ok) setTournament(await tRes.json());
            if (gTeamsRes.ok) setGlobalTeams(await gTeamsRes.json());
            
            fetchStandings();
            
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleAssignTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamIds: [assignTeamId], slotId: assignSlotId })
            });
            setIsAssigningTeam(false);
            setAssignTeamId('');
            setAssignSlotId('');
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveTeam = async (teamId: string) => {
        if (!confirm('Are you sure you want to remove this team from the tournament?')) return;
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/teams/${teamId}`, {
                method: 'DELETE'
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStandings = async (dayNum: number | null = selectedStandingsDay) => {
        try {
            const query = dayNum ? `?dayNumber=${dayNum}` : '';
            const res = await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/standings${query}`);
            if (res.ok) {
                setStandings(await res.json());
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === 'standings') {
            fetchStandings(selectedStandingsDay);
        }
    }, [activeTab, selectedStandingsDay]);


    const handleCreateStage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/stages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newStageName,
                    type: newStageType,
                    order: tournament.stages.length + 1,
                    daysCount: newStageDaysCount,
                    matchesCount: newStageMatchesCount,
                    teamCount: newStageTeamCount,
                    hasGroups: false
                })
            });
            setIsAddingStage(false);
            setNewStageName('');
            setNewStageDaysCount(1);
            setNewStageMatchesCount(5);
            setNewStageTeamCount(16);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateStage = async (e: React.FormEvent, stageId: string) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/stages/${stageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editStageName,
                    type: editStageType,
                    daysCount: editStageDaysCount,
                    matchesCount: editStageMatchesCount,
                    teamCount: editStageTeamCount,
                    groups: editStageGroups
                })
            });
            setEditingStageId(null);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/stages/${stageId}`, {
                method: 'DELETE'
            });
            setStageToDelete(null);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const fetchGroupTeams = async (groupId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/groups/${groupId}/teams`);
            if (res.ok) setGroupTeams(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssignToGroup = async (teamId: string) => {
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/groups/${managingGroup.id}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamIds: [teamId] })
            });
            fetchGroupTeams(managingGroup.id);
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveFromGroup = async (teamId: string) => {
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/groups/${managingGroup.id}/teams/${teamId}`, {
                method: 'DELETE'
            });
            fetchGroupTeams(managingGroup.id);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAdvanceTeams = async () => {
        try {
            await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/groups/${managingGroup.id}/promote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetGroupId: advancingTargetGroupId, topCount: advancingCount })
            });
            setIsAdvancingTeams(false);
            setIsManagingGroup(false);
            setManagingGroup(null);
            // Re-fetch to see assignments if shown
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center p-32 space-y-4">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                <div className="text-slate-500 font-mono tracking-widest text-sm uppercase">Loading Hub...</div>
            </div>
        </DashboardLayout>
    );

    if (!tournament) return (
        <DashboardLayout>
            <div className="text-center text-slate-400 py-20 uppercase tracking-widest font-black">Tournament not found</div>
        </DashboardLayout>
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'teams', label: 'Participating Teams', icon: Users },
        { id: 'stages', label: 'Stages & Groups', icon: Layers },
        { id: 'standings', label: 'Standings', icon: Trophy },
        { id: 'teamDetails', label: 'Team Details', icon: BarChart2 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    // Filter global teams to only show those NOT currently in the tournament
    const availableTeams = globalTeams.filter(gt => !tournament.teams.some((at: any) => at.teamId === gt.id));

    return (
        <DashboardLayout>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
                
                {/* Header Back Button & Title */}
                <div className="flex items-center gap-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-4 rounded-[2rem]">
                    <button 
                        onClick={() => router.push('/tournaments')}
                        className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase">{tournament.name}</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{tournament.status} • {tournament.gameTitle}</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Vertical Tabs Sidebar */}
                    <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all duration-300 relative overflow-hidden group w-full text-left",
                                        isActive 
                                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                                            : "bg-slate-900/40 text-slate-400 border border-slate-800/60 hover:bg-slate-800/50 hover:text-slate-200"
                                    )}
                                >
                                    <Icon size={18} className={isActive ? "text-amber-500" : "text-slate-500 group-hover:text-slate-400"} />
                                    {tab.label}
                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)]" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Panels */}
                    <div className="flex-1 bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-8 min-h-[600px] overflow-hidden relative">
                        {/* Glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                        
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="relative z-10 h-full"
                            >
                                
                                {/* OVERVIEW TAB */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-8">
                                        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 pb-4 border-b border-slate-800">
                                            Tournament Dashboard
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Registered Teams</div>
                                                <div className="text-4xl font-black text-white">{tournament.teams?.length || 0}</div>
                                            </div>
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Stages</div>
                                                <div className="text-4xl font-black text-amber-400">{tournament.stages?.length || 0}</div>
                                            </div>
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Matches Scheduled</div>
                                                <div className="text-4xl font-black text-emerald-400">
                                                    {tournament.matches?.filter((m: any) => m.stageId).length || 0}
                                                </div>
                                            </div>
                                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Format Rules</div>
                                                <div className="text-xl font-black text-blue-400 mt-2">
                                                    {tournament.stages?.length > 1 ? 'MULTI-STAGE' : (tournament.stages?.[0]?.type?.toUpperCase() || 'DIRECT FINALS')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TEAMS TAB */}
                                {activeTab === 'teams' && (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                            <h3 className="text-xl font-black text-white uppercase tracking-wider">
                                                Participating Teams
                                            </h3>
                                            <button 
                                                onClick={() => setIsAssigningTeam(!isAssigningTeam)}
                                                className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2"
                                            >
                                                {isAssigningTeam ? 'Cancel' : <><Plus size={16} /> Import Team</>}
                                            </button>
                                        </div>

                                        {isAssigningTeam && (
                                            <form onSubmit={handleAssignTeam} className="bg-slate-950 border border-amber-500/30 p-6 rounded-2xl flex flex-wrap items-end gap-4">
                                                <div className="flex-1 min-w-[250px]">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Select Team from Global Database</label>
                                                    <select 
                                                        value={assignTeamId} 
                                                        onChange={e => setAssignTeamId(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                                                        required
                                                    >
                                                        <option value="">-- Choose a Team --</option>
                                                        {availableTeams.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name.replace(/^SCOUT\s+/i, '')} {t.tag ? `[${t.tag}]` : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex-1 min-w-[200px] max-w-[250px]">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Assign Team Slot</label>
                                                    <input 
                                                        type="text"
                                                        value={assignSlotId}
                                                        onChange={e => setAssignSlotId(e.target.value)}
                                                        placeholder="e.g. Slot 2, Team05"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                                                    />
                                                </div>
                                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-black text-white text-sm uppercase tracking-wider">
                                                    Assign Participant
                                                </button>
                                            </form>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {tournament.teams.length === 0 ? (
                                                <div className="col-span-full py-12 text-slate-500 text-center font-mono text-sm uppercase">No teams assigned yet.</div>
                                            ) : (
                                                tournament.teams.map((ta: any) => (
                                                    <div key={ta.teamId} className="bg-slate-950/50 border border-slate-800 hover:border-amber-500/30 transition-all rounded-xl p-4 flex items-center gap-4 relative group">
                                                        <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center font-black text-lg text-slate-600">
                                                            {ta.team.logoUrl ? <img src={ta.team.logoUrl} className="w-full h-full object-contain p-1" /> : (ta.team.countryFlag || 'TEAM')}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-black text-white text-lg tracking-tight uppercase line-clamp-1 pr-6">{ta.team.name.replace(/^SCOUT\s+/i, '')}</h4>
                                                            <div className="text-xs font-bold text-slate-500 uppercase flex gap-2 mt-1">
                                                                {ta.team.tag && <span className="text-amber-500">{ta.team.tag}</span>}
                                                                <span>{ta.team.players?.length || 0} Players</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveTeam(ta.teamId)}
                                                            className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Remove Team"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STAGES TAB */}
                                {activeTab === 'stages' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                            <h3 className="text-xl font-black text-white uppercase tracking-wider">
                                                Stage & Group Configuration
                                            </h3>
                                            <button 
                                                onClick={() => setIsAddingStage(!isAddingStage)}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2"
                                            >
                                                {isAddingStage ? 'Cancel' : <><Plus size={16} /> Create Stage</>}
                                            </button>
                                        </div>

                                        {isAddingStage && (
                                            <form onSubmit={handleCreateStage} className="bg-slate-950 border border-indigo-500/30 p-6 rounded-2xl space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400/80 mb-2">Stage Name</label>
                                                        <select 
                                                            value={newStageName} 
                                                            onChange={e => {
                                                                setNewStageName(e.target.value);
                                                                setNewStageType(e.target.value);
                                                            }}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-xs font-bold"
                                                            required
                                                        >
                                                            <option value="">-- Choose Stage Type --</option>
                                                            <option value="Group Stage">Group Stage</option>
                                                            <option value="Semi Finals">Semi Finals</option>
                                                            <option value="Grand Finals">Grand Finals</option>
                                                            <option value="Round Robin">Round Robin</option>
                                                            <option value="Knockout Stage">Knockout Stage</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400/80 mb-2">Total Days</label>
                                                        <input 
                                                            type="number" min="1" value={newStageDaysCount} onChange={e => setNewStageDaysCount(Number(e.target.value))}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-bold text-center"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400/80 mb-2">Matches/Day</label>
                                                        <select 
                                                            value={newStageMatchesCount} 
                                                            onChange={e => setNewStageMatchesCount(Number(e.target.value))}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-bold text-center"
                                                            required
                                                        >
                                                            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map(n => (
                                                                <option key={n} value={n}>{n} Matches</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400/80 mb-2">Teams</label>
                                                        <input 
                                                            type="number" min="1" value={newStageTeamCount} onChange={e => setNewStageTeamCount(Number(e.target.value))}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-bold text-center"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="md:col-span-1 flex items-end">
                                                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-black text-white text-[10px] uppercase tracking-wider">
                                                            Initialize
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        )}

                                        <div className="space-y-4">
                                            {tournament.stages.map((stage: any, index: number) => (
                                                <div key={stage.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/30 group-hover:bg-amber-500 transition-colors"></div>
                                                    
                                                    {editingStageId === stage.id ? (
                                                        <form onSubmit={(e) => handleUpdateStage(e, stage.id)} className="space-y-8">
                                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 border-b border-slate-800 pb-6">
                                                                <div className="md:col-span-2">
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Stage Name</label>
                                                                    <select 
                                                                        value={editStageName} 
                                                                        onChange={e => {
                                                                            setEditStageName(e.target.value);
                                                                            setEditStageType(e.target.value);
                                                                        }}
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 text-xs font-bold"
                                                                        required
                                                                    >
                                                                        <option value="Group Stage">Group Stage</option>
                                                                        <option value="Semi Finals">Semi Finals</option>
                                                                        <option value="Grand Finals">Grand Finals</option>
                                                                        <option value="Round Robin">Round Robin</option>
                                                                        <option value="Knockout Stage">Knockout Stage</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Total Days</label>
                                                                    <input 
                                                                        type="number" min="1" value={editStageDaysCount} 
                                                                        onChange={e => {
                                                                            const val = Number(e.target.value);
                                                                            setEditStageDaysCount(val);
                                                                            // Resize matchMaps for all groups
                                                                            setEditStageGroups(prev => prev.map(g => {
                                                                                let nm = [...g.matchMaps];
                                                                                if (val > nm.length) {
                                                                                    for (let i = nm.length; i < val; i++) nm.push(Array(editStageMatchesCount).fill('Erangel'));
                                                                                } else nm = nm.slice(0, val);
                                                                                return { ...g, matchMaps: nm };
                                                                            }));
                                                                        }}
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 font-bold text-center"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Matches/Day</label>
                                                                    <select 
                                                                        value={editStageMatchesCount} 
                                                                        onChange={e => {
                                                                            const val = Number(e.target.value);
                                                                            setEditStageMatchesCount(val);
                                                                            // Resize matchMaps for all groups
                                                                            setEditStageGroups(prev => prev.map(g => {
                                                                                const nm = g.matchMaps.map((dm: any) => {
                                                                                    let ddm = [...dm];
                                                                                    if (val > ddm.length) {
                                                                                        for (let i = ddm.length; i < val; i++) ddm.push('Erangel');
                                                                                    } else ddm = ddm.slice(0, val);
                                                                                    return ddm;
                                                                                });
                                                                                return { ...g, matchMaps: nm };
                                                                            }));
                                                                        }}
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 font-bold text-center"
                                                                        required
                                                                    >
                                                                        {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map(n => (
                                                                            <option key={n} value={n}>{n} Matches</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Teams</label>
                                                                    <input 
                                                                        type="number" min="1" value={editStageTeamCount} onChange={e => setEditStageTeamCount(Number(e.target.value))}
                                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 font-bold text-center"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="md:col-span-1 flex items-end gap-2">
                                                                    <button type="button" onClick={() => setEditingStageId(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-colors text-slate-400">
                                                                        <X size={18} />
                                                                    </button>
                                                                    <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 p-3 rounded-xl transition-colors text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                                                        <Save size={18} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Detailed Match Schedule for Groups */}
                                                            <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {editStageGroups.map((group, gIdx) => (
                                                                    <div key={gIdx} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6 relative overflow-hidden">
                                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                                                        <div className="flex items-center justify-between">
                                                                            <h6 className="text-white font-black text-sm uppercase flex items-center gap-2">
                                                                                <Layers size={14} className="text-amber-500" />
                                                                                {editStageGroups.length === 1 ? 'Lobby' : group.name}
                                                                            </h6>
                                                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                                {editStageDaysCount} Days • {editStageMatchesCount} Match/Day
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 gap-6">
                                                                            {group.matchMaps.map((dayMaps: string[], dIdx: number) => (
                                                                                <div key={dIdx} className="space-y-3">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Day {dIdx + 1}</span>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                                                                        {dayMaps.map((currentMap, mIdx) => (
                                                                                            <div key={mIdx} className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/50">
                                                                                                <span className="text-[8px] uppercase font-black text-slate-500 mb-1 block">Match {mIdx + 1}</span>
                                                                                                <select 
                                                                                                    value={currentMap} 
                                                                                                    onChange={e => {
                                                                                                        const nGroups = [...editStageGroups];
                                                                                                        nGroups[gIdx].matchMaps[dIdx][mIdx] = e.target.value;
                                                                                                        setEditStageGroups(nGroups);
                                                                                                    }}
                                                                                                    className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-1 text-white font-bold text-[9px] focus:border-amber-500 outline-none"
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
                                                        </form>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h4 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
                                                                        <span className="text-slate-600">STAGE {index + 1}</span> 
                                                                        {stage.name}
                                                                    </h4>
                                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex gap-4">
                                                                        <span>{stage.type}</span>
                                                                        <span>{stage.daysCount} Days</span>
                                                                        <span>{stage.matchesCount} Matches/Day</span>
                                                                        <span className="text-amber-500">{stage.teamCount || 16} Teams</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditStageName(stage.name);
                                                                            setEditStageType(stage.type);
                                                                            setEditStageDaysCount(stage.daysCount);
                                                                            setEditStageMatchesCount(stage.matchesCount);
                                                                            setEditStageTeamCount(stage.teamCount || 16);
                                                                            
                                                                            // Prepare Groups with MatchMaps for editing
                                                                            const mappedGroups = (stage.groups || []).map((g: any) => {
                                                                                // Extract maps from existing matches for this group
                                                                                const groupMatches = (tournament.matches || []).filter((m: any) => m.groupId === g.id);
                                                                                
                                                                                // Initialize empty grid [days][matches]
                                                                                const maps: string[][] = Array.from({ length: stage.daysCount }, () => Array(stage.matchesCount).fill('Erangel'));
                                                                                
                                                                                // Populate from existing matches
                                                                                groupMatches.forEach((m: any) => {
                                                                                    if (m.dayNumber <= stage.daysCount && m.matchNumber <= stage.matchesCount) {
                                                                                        maps[m.dayNumber - 1][m.matchNumber - 1] = m.mapName;
                                                                                    }
                                                                                });
                                                                                
                                                                                return {
                                                                                    ...g,
                                                                                    matchMaps: maps
                                                                                };
                                                                            });
                                                                            setEditStageGroups(mappedGroups);
                                                                            setEditingStageId(stage.id);
                                                                        }}
                                                                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                                        title="Edit Stage"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setStageToDelete(stage)}
                                                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                                        title="Delete Stage"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {stage.groups && stage.groups.length > 0 && (
                                                                <div className="mt-4 pt-4 border-t border-slate-800/60">
                                                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Associated Groups</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {stage.groups.map((g: any) => (
                                                                            <div key={g.id} className="group/item flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-amber-500/50 px-3 py-1.5 rounded-lg transition-all">
                                                                                <span className="text-xs font-bold text-slate-300">
                                                                                    {stage.groups.length === 1 ? 'Lobby' : g.name}
                                                                                </span>
                                                                                <button 
                                                                                    onClick={() => {
                                                                                        setManagingGroup(g);
                                                                                        fetchGroupTeams(g.id);
                                                                                        setIsManagingGroup(true);
                                                                                    }}
                                                                                    className="p-1 text-slate-500 hover:text-amber-500 rounded transition-colors"
                                                                                    title="Manage Group Teams"
                                                                                >
                                                                                    <UserPlus size={14} />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                            {tournament.stages.length === 0 && (
                                                <div className="py-12 text-slate-500 text-center font-mono text-sm uppercase">No stages configured.</div>
                                            )}
                                        </div>
                                    </div>
                                 )}

                                {/* STANDINGS TAB */}
                                {activeTab === 'standings' && (
                                    <div className="space-y-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
                                            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                                                <Trophy className="text-yellow-500" /> 
                                                {selectedStandingsDay ? `Day ${selectedStandingsDay} Standings` : 'Overall Standings'}
                                            </h3>

                                            {/* Day Selector */}
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setSelectedStandingsDay(null)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                        selectedStandingsDay === null 
                                                            ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                                                            : "bg-slate-800 text-slate-400 hover:text-white"
                                                    )}
                                                >
                                                    Overall
                                                </button>
                                                {Array.from({ length: Math.max(...(tournament.stages?.map((s: any) => s.daysCount) || [1])) }, (_, i) => i + 1).map(day => (
                                                    <button
                                                        key={day}
                                                        onClick={() => setSelectedStandingsDay(day)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            selectedStandingsDay === day 
                                                                ? "bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]" 
                                                                : "bg-slate-800 text-slate-400 hover:text-white"
                                                        )}
                                                    >
                                                        Day {day}
                                                    </button>
                                                ))}

                                                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
                                                    <button 
                                                        onClick={() => {
                                                            const params = new URLSearchParams({ tournamentId: id });
                                                            if (selectedStandingsDay) params.append('dayNumber', selectedStandingsDay.toString());
                                                            window.open(`/overlays/overall-standings?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                                        }}
                                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-yellow-600 hover:bg-yellow-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-yellow-950/20"
                                                    >
                                                        <Zap size={12} /> Standard Overlay
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const params = new URLSearchParams({ tournamentId: id, transparent: 'true' });
                                                            if (selectedStandingsDay) params.append('dayNumber', selectedStandingsDay.toString());
                                                            window.open(`/overlays/overall-standings?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                                        }}
                                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 hover:bg-white text-slate-900 transition-all flex items-center gap-2 shadow-lg"
                                                    >
                                                        <Radio size={12} /> Transparent
                                                    </button>

                                                    <button
                                                        onClick={() => window.open(`/overlay-studio?type=overall-rankings&tournamentId=${id}`, '_blank')}
                                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 transition-all flex items-center gap-2"
                                                    >
                                                        Edit Overlay
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const params = new URLSearchParams({ tournamentId: id, edit: 'true', design: 'premium' });
                                                            if (selectedStandingsDay) params.append('dayNumber', selectedStandingsDay.toString());
                                                            window.open(`/overlays/overall-standings?${params.toString()}`, '_blank');
                                                        }}
                                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 transition-all flex items-center gap-2"
                                                    >
                                                        Edit Layout
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {standings.length === 0 ? (
                                            <div className="text-center py-20 px-6 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20 max-w-2xl mx-auto">
                                                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                                <h3 className="text-2xl font-bold text-white mb-2 tracking-wide uppercase">No Standings Yet</h3>
                                                <p className="text-slate-400 font-medium tracking-wide text-sm">Results will appear here automatically once live match data is saved to a scheduled match.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-900 overflow-hidden border border-slate-800 shadow-2xl rounded-2xl">
                                                <table className="w-full text-left text-sm text-slate-300">
                                                    <thead className="bg-slate-950/80 text-xs uppercase text-slate-500 font-black tracking-wider border-b border-slate-800/80">
                                                        <tr>
                                                            <th className="px-6 py-5">Rank</th>
                                                            <th className="px-6 py-5">Team</th>
                                                            <th className="px-6 py-5 text-center">Matches</th>
                                                            <th className="px-6 py-5 text-center text-yellow-500/80">WWCD</th>
                                                            <th className="px-6 py-5 text-center text-rose-400/80">Elims</th>
                                                            <th className="px-6 py-5 text-center text-blue-400/80">Place Pts</th>
                                                            <th className="px-6 py-5 text-center text-indigo-400 font-black">Total Pts</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        {standings.map((team, idx) => (
                                                            <tr key={team.teamId} className="hover:bg-slate-800/30 transition-colors group">
                                                                <td className="px-6 py-4 font-black">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={team.rank <= 3 ? "text-white text-lg" : "text-slate-500"}>#{team.rank}</span>
                                                                        {team.rank === 1 && <Trophy size={18} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-lg bg-slate-950/50 border border-slate-700 flex items-center justify-center overflow-hidden group-hover:border-slate-500 transition-colors">
                                                                            {team.logoUrl ? (
                                                                                <img src={team.logoUrl} alt={team.teamName} className="w-full h-full object-contain p-1" />
                                                                            ) : (
                                                                                <Users size={18} className="text-slate-500" />
                                                                            )}
                                                                        </div>
                                                                        <span className="font-bold text-white uppercase tracking-wider text-base">{team.teamName.replace(/^SCOUT\s+/i, '')}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center font-bold text-slate-400">{team.matchesPlayed}</td>
                                                                <td className="px-6 py-4 text-center font-bold text-yellow-500">{team.wwcd}</td>
                                                                <td className="px-6 py-4 text-center font-bold text-rose-400">{team.killPoints}</td>
                                                                <td className="px-6 py-4 text-center font-bold text-blue-400">{team.placementPoints}</td>
                                                                <td className="px-6 py-4 text-center font-black text-indigo-300 text-xl">{team.totalPoints}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TEAM DETAILS TAB */}
                                {activeTab === 'teamDetails' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                                                <BarChart2 className="text-emerald-500" /> 
                                                Team Overall Stats & Details
                                            </h3>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        const headers = ['RANK', 'Team Name', 'Tags', 'WWCD', 'Team Slot', 'Placement Points', 'Total Kills', 'Total Points'];
                                                        const rows = standings.map((team, index) => {
                                                            const tTeam = tournament?.teams?.find((t: any) => t.teamId === team.teamId);
                                                            const tag = (team.tag || tTeam?.team?.tag || '').toUpperCase();
                                                            const wwcd = team.wwcd > 0 ? team.wwcd : '';
                                                            
                                                            // Extract only numbers/characters after the word "Team" or "Slot"
                                                            let rawSlot = team.slotId || tTeam?.team?.slotId || '';
                                                            let slot = rawSlot.replace(/^(team|slot)\s*/i, '').trim();

                                                            return [
                                                                index + 1,
                                                                `"${team.teamName.replace(/^SCOUT\s+/i, '').replace(/"/g, '""')}"`,
                                                                `"${tag.replace(/"/g, '""')}"`,
                                                                wwcd,
                                                                `"${slot.replace(/"/g, '""')}"`,
                                                                team.placementPoints,
                                                                team.killPoints,
                                                                team.totalPoints
                                                            ].join(',');
                                                        });
                                                        const csvContent = [headers.join(','), ...rows].join('\r\n');
                                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                        const url = URL.createObjectURL(blob);
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.setAttribute('download', `${tournament?.name || 'Tournament'}_Team_Details.csv`);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
                                                    title="Export Team Standings as CSV"
                                                >
                                                    <Download size={16} /> Team Export
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`${API_URL}/api/tournaments/${encodeURIComponent(id)}/player-standings`);
                                                            if (!res.ok) throw new Error('Failed to fetch player standings');
                                                            const data = await res.json();
                                                            
                                                            const headers = [
                                                                'Player Name', 'Matches', 'Kills', 'Damage', 'Avg Survival Time', 
                                                                'Assists', 'Knockouts', 'Heal', 'Headshots', 'March Distance', 
                                                                'Rescue Times', 'Airdrops', 'Vehicle Kills', 'Grenade Kills', 
                                                                'In-Damage', 'teamName'
                                                            ];
                                                            
                                                            const rows = data.map((p: any) => [
                                                                `"${p.playerName.replace(/"/g, '""')}"`,
                                                                p.matches,
                                                                p.kills,
                                                                Math.round(p.damage),
                                                                p.avgSurvivalTime,
                                                                p.assists,
                                                                p.knockouts,
                                                                Math.round(p.heal),
                                                                p.headshots,
                                                                Math.round(p.marchDistance),
                                                                p.rescueTimes,
                                                                p.airdrops,
                                                                p.vehicleKills,
                                                                p.grenadeKills,
                                                                Math.round(p.inDamage),
                                                                `"${p.teamName.replace(/"/g, '""')}"`
                                                            ].join(','));
                                                            
                                                            const csvContent = [headers.join(','), ...rows].join('\r\n');
                                                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                            const url = URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.setAttribute('download', `${tournament?.name || 'Tournament'}_Player_Stats.csv`);
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        } catch (error) {
                                                            console.error(error);
                                                            alert('Failed to export player stats');
                                                        }
                                                    }}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
                                                    title="Export Player Stats as CSV"
                                                >
                                                    <Download size={16} /> Player Export
                                                </button>
                                            </div>
                                        </div>

                                        {standings.length === 0 ? (
                                            <div className="text-center py-20 px-6 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20 max-w-2xl mx-auto">
                                                <BarChart2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                                <h3 className="text-2xl font-bold text-white mb-2 tracking-wide uppercase">No Stats Yet</h3>
                                                <p className="text-slate-400 font-medium tracking-wide text-sm">Team statistics will appear here automatically once live match data is processed.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                {standings.map((team, index) => {
                                                    const tTeam = tournament?.teams?.find((t: any) => t.teamId === team.teamId);
                                                    return (
                                                    <div key={team.teamId} className="bg-slate-950/50 border border-slate-800 hover:border-emerald-500/30 transition-all rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                                        <div className="absolute top-4 right-4 text-xs font-black text-slate-800 group-hover:text-emerald-500/20 transition-colors text-6xl pointer-events-none">
                                                            #{index + 1}
                                                        </div>

                                                        <div className="flex items-center gap-4 border-b border-slate-800/60 pb-4 relative z-10">
                                                            <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                                                                {team.logoUrl ? (
                                                                    <img src={team.logoUrl} alt={team.teamName} className="w-full h-full object-contain p-1" />
                                                                ) : (
                                                                    <Users size={20} className="text-slate-500" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-white text-lg tracking-tight uppercase leading-tight line-clamp-1">
                                                                    {team.teamName.replace(/^SCOUT\s+/i, '')}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                    {/* Tag Badge */}
                                                                    {(team.tag || tTeam?.team?.tag) && (
                                                                        <div className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-900/50 text-[10px] font-black text-emerald-400 tracking-wider uppercase">
                                                                            {team.tag || tTeam?.team?.tag}
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Slot Badge */}
                                                                    {team.slotId && (
                                                                        <div className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-[10px] font-black text-slate-300 tracking-wider uppercase">
                                                                            {team.slotId}
                                                                        </div>
                                                                    )}

                                                                    {/* Add a Lobby indicator placeholder if we had group info - currently using Rank for info */}
                                                                    <div className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-900/50 text-[10px] font-black text-indigo-400 tracking-wider uppercase">
                                                                        Rank #{index + 1}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-4 gap-2 relative z-10">
                                                            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/40 text-center flex flex-col justify-center">
                                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Matches</div>
                                                                <div className="text-sm font-black text-slate-300">{team.matchesPlayed}</div>
                                                            </div>
                                                            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/40 text-center flex flex-col justify-center">
                                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">WWCD</div>
                                                                <div className="text-sm font-black text-yellow-500">{team.wwcd}</div>
                                                            </div>
                                                            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/40 text-center flex flex-col justify-center">
                                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Elims</div>
                                                                <div className="text-sm font-black text-rose-400">{team.killPoints}</div>
                                                            </div>
                                                            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/40 text-center flex flex-col justify-center">
                                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Place</div>
                                                                <div className="text-sm font-black text-blue-400">{team.placementPoints}</div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2 relative z-10 pt-2 border-t border-slate-800/40">
                                                            <div className="bg-slate-900/30 rounded-lg p-2 flex justify-between items-center text-left">
                                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dmg</div>
                                                                <div className="text-sm font-black text-emerald-400/80">{Math.round(team.totalDamage)}</div>
                                                            </div>
                                                            <div className="bg-slate-900/30 rounded-lg p-2 flex justify-between items-center text-left">
                                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Knocks</div>
                                                                <div className="text-sm font-black text-amber-500/80">{team.totalKnocks}</div>
                                                            </div>
                                                            <div className="bg-emerald-900/10 rounded-lg p-2 border border-emerald-900/30 flex justify-between items-center text-left">
                                                                <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Total</div>
                                                                <div className="text-base font-black text-emerald-400">{team.totalPoints}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SETTINGS TAB */}
                                {activeTab === 'settings' && (
                                    <TournamentSettingsTab tournament={tournament} onRefresh={fetchData} />
                                )}                             </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* CUSTOM DELETE MODAL */}
                <AnimatePresence>
                    {stageToDelete && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setStageToDelete(null)}
                                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-slate-900 border border-slate-800 p-8 rounded-[2rem] max-w-md w-full shadow-2xl"
                            >
                                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Trash2 className="text-rose-500" size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white text-center uppercase tracking-tight mb-2">Delete Stage?</h3>
                                <p className="text-slate-400 text-center text-sm font-medium mb-8">
                                    Are you sure you want to remove <span className="text-white font-bold">{stageToDelete.name}</span>? 
                                    This action cannot be undone and may affect scheduled matches.
                                </p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setStageToDelete(null)}
                                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-black uppercase tracking-wider text-xs transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteStage(stageToDelete.id)}
                                        className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider text-xs transition-colors shadow-lg shadow-rose-900/20"
                                    >
                                        Yes, Delete
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            {/* GROUP TEAM MANAGEMENT MODAL */}
            <AnimatePresence>
                {isManagingGroup && managingGroup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManagingGroup(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                            
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        <Users className="text-amber-500" /> 
                                        {/* Find the stage this group belongs to check if it's a single group */}
                                        Manage {(() => {
                                            const stage = tournament.stages.find((s: any) => s.id === managingGroup.stageId);
                                            return (stage?.groups?.length === 1) ? 'Lobby' : `Group: ${managingGroup.name}`;
                                        })()}
                                    </h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Assign participants for this specific stage group</p>
                                </div>
                                <button onClick={() => setIsManagingGroup(false)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full transition-colors"><X size={20}/></button>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                                {/* Left Side: Currently Assigned */}
                                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-slate-800 bg-slate-950/30">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-6 flex justify-between items-center">
                                        Current Members ({groupTeams.length})
                                        {!isAdvancingTeams && (
                                            <button 
                                                onClick={() => setIsAdvancingTeams(true)}
                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                            >
                                                <ArrowRightCircle size={14} /> Promote/Advance Teams
                                            </button>
                                        )}
                                    </h4>

                                    {isAdvancingTeams ? (
                                        <div className="space-y-6 bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl">
                                            <div className="flex items-center gap-3 text-blue-400">
                                                <RefreshCcw size={18} className="animate-spin-slow" />
                                                <h5 className="font-black uppercase text-sm tracking-widest">Promotion Logic</h5>
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium">Select a target group to advance the top performing teams from the current group's standings.</p>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Target Group</label>
                                                    <select 
                                                        value={advancingTargetGroupId} 
                                                        onChange={e => setAdvancingTargetGroupId(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-blue-500 outline-none"
                                                    >
                                                        <option value="">-- Choose Target Group --</option>
                                                        {tournament.stages.flatMap((s: any) => s.groups).filter((g: any) => g.id !== managingGroup.id).map((g: any) => {
                                                            const stage = tournament.stages.find((s: any) => s.id === g.stageId);
                                                            const groupDisplayName = (stage?.groups?.length === 1) ? 'Lobby' : g.name;
                                                            return (
                                                                <option key={g.id} value={g.id}>
                                                                    Stage {stage?.name} - {groupDisplayName}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Advance Top X</label>
                                                        <input 
                                                            type="number" min="1" value={advancingCount} onChange={e => setAdvancingCount(Number(e.target.value))}
                                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-blue-500 outline-none text-center"
                                                        />
                                                    </div>
                                                    <div className="flex items-end gap-2">
                                                        <button onClick={() => setIsAdvancingTeams(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                                                        <button onClick={handleAdvanceTeams} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-900/20">Confirm</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {groupTeams.length === 0 ? (
                                                <div className="py-12 text-center text-slate-600 font-mono text-xs uppercase border-2 border-dashed border-slate-800 rounded-2xl">No teams assigned.</div>
                                            ) : (
                                                groupTeams.map(team => (
                                                    <div key={team.id} className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl flex items-center justify-between group/team transition-all hover:border-slate-700">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                                                                {team.logoUrl ? (
                                                                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-0.5" />
                                                                ) : (
                                                                    <Users size={14} className="text-slate-700" />
                                                                )}
                                                            </div>
                                                            <span className="font-black text-white text-xs uppercase">{team.name.replace(/^SCOUT\s+/i, '')}</span>
                                                        </div>
                                                        <button onClick={() => handleRemoveFromGroup(team.id)} className="p-2 text-slate-600 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all opacity-0 group-team/team:opacity-100">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Assignable Teams */}
                                <div className="w-full md:w-80 p-8 overflow-y-auto custom-scrollbar bg-slate-900/20">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Available (Tournament)</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {tournament.teams.filter((ta: any) => !groupTeams.some(gt => gt.id === ta.teamId)).map((ta: any) => (
                                            <button 
                                                key={ta.teamId} 
                                                onClick={() => handleAssignToGroup(ta.teamId)}
                                                className="w-full p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-left hover:border-amber-500/50 transition-all group/add flex items-center justify-between"
                                            >
                                                <span className="text-[11px] font-bold text-slate-400 group-hover/add:text-white transition-colors">{ta.team.name.replace(/^SCOUT\s+/i, '')}</span>
                                                <Plus size={12} className="text-slate-700 group-hover/add:text-amber-500 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            </motion.div>
        </DashboardLayout>
    );
}
