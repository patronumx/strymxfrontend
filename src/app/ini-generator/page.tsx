"use client"
import { API_URL } from '@/lib/api-config';

import React, { useState, useRef, useCallback } from 'react';
import { removeBackground, Config } from "@imgly/background-removal";
import {
    Upload, CheckCircle, Download, ArrowRight, ArrowLeft,
    Trash2, Layers, Zap, Shield, RefreshCcw, X, Settings,
    FileJson, Archive, Cpu, FolderOpen, AlertTriangle,
    ChevronRight, FileCode2, Package, Wand2, Pipette,
    Tag, Copy, Eye, EyeOff, Palette, Hash, Target, Users, Image as ImageIcon, Rocket, Leaf, Sparkles,
    Check, Info, PackageOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/DashboardLayout';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamEntry {
    id: string;
    teamNo: number;
    name: string;
    slug: string;          // auto-generated filename slug: "3x", "fma"
    manualSlug?: boolean;  // whether user has manually edited the slug
    logo?: File;
    logoUrl?: string;
    colorR: number;
    colorG: number;
    colorB: number;
    status: 'pending' | 'matched' | 'missing';
    isProcessingAI?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZES = [512, 256, 128, 64] as const;

const STEPS = [
    { id: 1, name: 'Select level', icon: Target, color: 'from-blue-500 to-indigo-600' },
    { id: 2, name: 'Add Teams', icon: Users, color: 'from-blue-500 to-cyan-600' },
    { id: 3, name: 'Add Logos', icon: ImageIcon, color: 'from-sky-500 to-blue-600' },
    { id: 4, name: 'Preview', icon: Eye, color: 'from-emerald-500 to-teal-600' },
    { id: 5, name: 'Generate', icon: Rocket, color: 'from-amber-500 to-orange-600' },
];

const DEFAULT_COLORS = [
    [13, 71, 161], [183, 6, 15], [225, 98, 9], [32, 150, 209],
    [74, 20, 140], [159, 43, 20], [72, 106, 0], [198, 26, 86],
    [156, 102, 34], [130, 0, 69], [213, 177, 21], [74, 179, 175],
    [107, 130, 141], [243, 151, 0], [55, 71, 79], [224, 100, 142],
    [0, 115, 109], [138, 72, 3], [127, 176, 23], [133, 75, 161],
    [15, 85, 193], [45, 120, 200], [200, 50, 50], [80, 160, 80], [100, 80, 180]
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSlug = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);

const isFuzzyMatch = (teamName: string, slug: string, fileName: string): boolean => {
    const cleanFile = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const firstWord = teamName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (!cleanFile) return false;
    // 1. Exact slug match
    if (cleanFile === cleanSlug) return true;
    // 2. FileName matches first word of team name
    if (firstWord.length >= 3 && (cleanFile.startsWith(firstWord) || firstWord.startsWith(cleanFile))) return true;
    // 3. FileName is contained in team name
    if (cleanFile.length >= 4 && teamName.toLowerCase().replace(/\s/g, '').includes(cleanFile)) return true;
    
    return false;
};

const buildIni = (teams: TeamEntry[]): string => {
    const active = teams.filter(t => t.name && t.slug);
    const header = [
        `/*** Use info ***/`,
        `/*** Set EnableTeamLogoAndColor equals to 1 to enable ***/`,
        `/*** TeamNo ***/`,
        `/*** TeamName No (=) or (,) chars inside ***/`,
        `/*** TeamLogoPath Picture file full path name***/`,
        `/*** KillInfoPath Picture file full path name***/`,
        `/*** TeamColorR，TeamColorG, TeamColorB, TeamColorA for team color RGBA setting. Use ingame setting when TeamColorA equals to 0 ***/`,
        `/*** PlayerColorR，PlayerColorG, PlayerColorB, PlayerColorA for player color RGBA setting. Use ingame setting when PlayerColorA equals to 0 ***/`,
        `/*** CornerMarkPath ***/`,
        ``,
        `[/Script/ShadowTrackerExtra.FCustomTeamLogoAndColor]`,
        `EnableTeamLogoAndColor=1`,
    ].join('\n');

    const entries = active.map(t =>
        `TeamLogoAndColor=(TeamNo=${t.teamNo},TeamName=${t.name},TeamLogoPath=C:/LOGO/${t.slug}.png,KillInfoPath=C:/LOGO/${t.slug}.png,TeamColorR=${t.colorR},TeamColorG=${t.colorG},TeamColorB=${t.colorB},TeamColorA=255,PlayerColorR=0,PlayerColorG=255,PlayerColorB=0,PlayerColorA=255,CornerMarkPath=,fin)`
    ).join('\n');

    const footer = [
        ``,
        `/*** Set EnableTeammatePic equals to 1 to enable ShowKillTips ***/`,
        `/*** PlayerName ***/`,
        `/*** PicPath Use Team Logo when path empty ***/`,
        ``,
        `[/Script/ShadowTrackerExtra.FCustomTeammatePic]`,
        `EnableTeammatePic=1`,
        `TeammatePic=(PlayerName=,PicPath=,fin)`,
    ].join('\n');

    return `${header}\n${entries}\n${footer}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IniGenerator() {
    const [currentStep, setCurrentStep] = useState(1);
    const [mode, setMode] = useState<'manual' | 'bulk'>('manual');
    const [teams, setTeams] = useState<TeamEntry[]>(
        Array.from({ length: 25 }, (_, i) => ({
            id: `slot-${i + 1}`,
            teamNo: i + 1,
            name: '',
            slug: '',
            colorR: DEFAULT_COLORS[i][0],
            colorG: DEFAULT_COLORS[i][1],
            colorB: DEFAULT_COLORS[i][2],
            status: 'pending',
        }))
    );
    const [bulkInput, setBulkInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [iniPreview, setIniPreview] = useState('');
    const [showIniPreview, setShowIniPreview] = useState(false);
    const [copiedIni, setCopiedIni] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const teamFileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedTeamIdx, setSelectedTeamIdx] = useState<number | null>(null);
    const [isLoadingLogos, setIsLoadingLogos] = useState(false);

    // ── Notifications ──────────────────────────────────────────────────────────
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // ── Navigation ─────────────────────────────────────────────────────────────
    const handleNext = async () => {
        if (currentStep === 2) {
            if (mode === 'bulk') parseBulkInput();
            await fetchLogosFromDb();
        }
        if (currentStep === 4) setIniPreview(buildIni(teams));
        if (currentStep < 5) setCurrentStep(s => s + 1);
    };
    const handleBack = () => { if (currentStep > 1) setCurrentStep(s => s - 1); };

    // ── Bulk CSV parse ─────────────────────────────────────────────────────────
    const parseBulkInput = () => {
        const lines = bulkInput.split('\n').filter(l => l.trim());
        setTeams(prev => {
            const next = [...prev];
            lines.slice(0, 25).forEach((line, idx) => {
                const parts = line.split(';').map(s => s.trim());
                const name = parts[0] || '';
                const slug = parts[1] ? parts[1].toLowerCase().replace(/[^a-z0-9]/g, '') : toSlug(name);
                if (name) {
                    next[idx] = {
                        ...next[idx],
                        name,
                        slug,
                        status: 'pending',
                    };
                }
            });
            return next;
        });
    };

    // ── Team update helpers ────────────────────────────────────────────────────
    const updateTeam = (idx: number, patch: Partial<TeamEntry>) => {
        setTeams(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    };

    const clearTeam = (idx: number) => {
        setTeams(prev => {
            const next = [...prev];
            if (next[idx].logoUrl) URL.revokeObjectURL(next[idx].logoUrl!);
            next[idx] = {
                ...next[idx],
                name: '', slug: '', logo: undefined, logoUrl: undefined, status: 'pending',
                colorR: DEFAULT_COLORS[idx][0], colorG: DEFAULT_COLORS[idx][1], colorB: DEFAULT_COLORS[idx][2],
            };
            return next;
        });
    };

    // ── Dominant color extraction ──────────────────────────────────────────────
    const extractDominantColor = (file: File): Promise<[number, number, number]> =>
        new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 32; canvas.height = 32; // small sample
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, 32, 32);
                const data = ctx.getImageData(0, 0, 32, 32).data;
                let rSum = 0, gSum = 0, bSum = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 128) { // skip transparent
                        rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]; count++;
                    }
                }
                resolve(count > 0 ? [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)] : [255, 255, 255]);
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });

    // ── Database Sync ─────────────────────────────────────────────────────────
    const fetchLogosFromDb = async () => {
        setIsLoadingLogos(true);
        try {
            const res = await fetch(`${API_URL}/api/teams`);
            if (!res.ok) throw new Error('Failed to fetch teams');
            const dbTeams = await res.json();
            
            setTeams(prev => {
                const next = [...prev];
                next.forEach((team, idx) => {
                    if (!team.name) return;
                    
                    // Match by name or slug
                    const match = dbTeams.find((t: any) => 
                        t.name.toLowerCase() === team.name.toLowerCase() || 
                        (t.tag && t.tag.toLowerCase() === team.slug.toLowerCase())
                    );

                    if (match && match.logoUrl) {
                        next[idx] = {
                            ...next[idx],
                            logoUrl: match.logoUrl,
                            slug: match.tag || next[idx].slug,
                            status: 'matched'
                        };
                    }
                });
                return next;
            });
            showNotification('Database lookup complete', 'success');
        } catch (err) {
            console.error('Lookup failed:', err);
            showNotification('Could not sync with database', 'error');
        } finally {
            setIsLoadingLogos(false);
        }
    };

    const handleTeamUpload = useCallback(async (idx: number, file: File) => {
        const team = teams[idx];
        const formData = new FormData();
        formData.append('name', team.name);
        formData.append('tag', team.slug);
        formData.append('logoFile', file);

        try {
            // First check if team exists to pick POST vs PUT
            const allRes = await fetch(`${API_URL}/api/teams`);
            const allTeams = await allRes.json();
            const existing = allTeams.find((t: any) => t.name.toLowerCase() === team.name.toLowerCase());

            let res;
            if (existing) {
                res = await fetch(`${API_URL}/api/teams/${existing.id}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                res = await fetch(`${API_URL}/api/teams`, {
                    method: 'POST',
                    body: formData
                });
            }

            if (!res.ok) throw new Error('Upload failed');
            const updated = await res.json();
            
            // Extract dominant color safely
            const [r, g, b] = await extractDominantColor(file);

            updateTeam(idx, {
                logoUrl: updated.logoUrl,
                logo: file,
                colorR: r,
                colorG: g,
                colorB: b,
                status: 'matched'
            });
            
            showNotification(`Logo uploaded for ${team.name}`);
        } catch (err) {
            console.error('Upload failed:', err);
            showNotification('Upload failed', 'error');
        }
    }, [teams]);

    const triggerTeamUpload = (idx: number) => {
        setSelectedTeamIdx(idx);
        teamFileInputRef.current?.click();
    };

    const handleTeamFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedTeamIdx !== null) {
            handleTeamUpload(selectedTeamIdx, file);
            e.target.value = ''; // Reset
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(Array.from(e.target.files || []));
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        processFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
    };

    // ── Logo processing ────────────────────────────────────────────────────────
    const processFiles = useCallback(async (files: File[]) => {
        let matchedCount = 0;
        for (const file of files) {
            const fileName = file.name.split('.')[0].toLowerCase();
            const matchIdx = teams.findIndex(t =>
                t.name && isFuzzyMatch(t.name, t.slug, fileName)
            );

            if (matchIdx !== -1) {
                await handleTeamUpload(matchIdx, file);
                matchedCount++;
            }
        }
        if (matchedCount > 0) {
            showNotification(`Neural Sync: Auto-matched ${matchedCount} assets`);
        }
    }, [teams, handleTeamUpload]);

    const handleStripBackground = async (idx: number) => {
        const team = teams[idx];
        let source: File | Blob | string | undefined = team.logo;
        if (!source && team.logoUrl) source = team.logoUrl;
        if (!source) return;

        updateTeam(idx, { isProcessingAI: true });
        try {
            const config: Config = {
                progress: (id, progress) => {
                    // Could link to a global progress bar if needed
                },
                model: 'isnet', // balanced speed/quality
                output: {
                    format: 'image/png',
                    quality: 1,
                },
                debug: false
            };

            const resultBlob = await removeBackground(source, config);
            
            // Create a new file from the blob to maintain compatibility
            const processedFile = new File([resultBlob], `${team.slug}_stripped.png`, { type: 'image/png' });
            
            // Upload the processed logo to the asset server
            await handleTeamUpload(idx, processedFile);
            
            showNotification(`Neural Strip complete for ${team.name}`);
        } catch (err) {
            console.error('Neural Strip failed:', err);
            showNotification('Neural Strip failed (Model Error)', 'error');
        } finally {
            updateTeam(idx, { isProcessingAI: false });
        }
    };

    const handleStripAllBackgrounds = async () => {
        const toProcess = teams
            .map((t, i) => ({ ...t, index: i }))
            .filter(t => t.name && (t.logo || t.logoUrl) && !t.isProcessingAI);
        
        if (toProcess.length === 0) return;
        
        showNotification(`Starting bulk Neural Strip for ${toProcess.length} slots...`);
        for (const team of toProcess) {
            await handleStripBackground(team.index);
        }
    };

    // ── Canvas resize ──────────────────────────────────────────────────────────
    const resizeImage = (file: File, size: number): Promise<Blob> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return reject('no canvas');
                const ctx = canvas.getContext('2d')!;
                canvas.width = size; canvas.height = size;
                ctx.clearRect(0, 0, size, size);
                const scale = Math.min(size / img.width, size / img.height);
                const x = (size - img.width * scale) / 2;
                const y = (size - img.height * scale) / 2;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                canvas.toBlob(blob => blob ? resolve(blob) : reject('blob failed'), 'image/png');
                URL.revokeObjectURL(img.src);
            };
            img.onerror = () => reject('img load failed');
            img.src = URL.createObjectURL(file);
        });

    // ── Generate & download ────────────────────────────────────────────────────
    const generatePackage = async () => {
        const active = teams.filter(t => t.name && t.slug && (t.logo || t.logoUrl));
        if (active.length === 0) return showNotification('No teams with logos to export', 'error');

        setIsGenerating(true);
        setGenerationProgress(0);
        try {
            const zip = new JSZip();
            const logoFolder = zip.folder('LOGO')!;
            const configFolder = zip.folder('CONFIG')!;

            let processed = 0;
            for (const team of active) {
                // If we only have a URL (from DB), fetch the blob
                let logoBlob: Blob | File | undefined = team.logo;
                if (!logoBlob && team.logoUrl) {
                    try {
                        const res = await fetch(team.logoUrl);
                        logoBlob = await res.blob();
                    } catch (e) {
                        console.error(`Failed to fetch remote logo for ${team.name}`, e);
                        continue; // Skip if fetch fails
                    }
                }

                if (!logoBlob) continue;

                for (const size of SIZES) {
                    const blob = await resizeImage(logoBlob as File, size);
                    const suffix = size === 512 ? '' : `_${size}`;
                    logoFolder.file(`${team.slug}${suffix}.png`, blob);
                }
                processed++;
                setGenerationProgress(Math.round((processed / active.length) * 88));
            }

            setGenerationProgress(92);
            configFolder.file('TeamLogoAndColor.ini', buildIni(teams));
            setGenerationProgress(97);

            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, 'STRYMX_PCOB_Package.zip');
            setGenerationProgress(100);
            showNotification(`Package built! ${active.length} teams · ${active.length * 4} logo files`);
        } catch (err) {
            console.error(err);
            showNotification('Package generation failed', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyIni = () => {
        navigator.clipboard.writeText(iniPreview);
        setCopiedIni(true);
        setTimeout(() => setCopiedIni(false), 2000);
    };

    // ── Derived values ─────────────────────────────────────────────────────────
    const activeTeams = teams.filter(t => t.name);
    const matchedTeams = teams.filter(t => t.logo || t.logoUrl);
    const missingTeams = activeTeams.filter(t => !(t.logo || t.logoUrl));

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto h-[820px] flex flex-col bg-[#121212] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">

                {/* ── TOOL HEADER ── */}
                <div className="bg-black py-7 px-10 border-b border-white/10 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-blue-600/5" />

                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* ── SIDEBAR NAVIGATION ── */}
                    <div className="w-80 bg-[#181818] p-8 border-r border-white/5 space-y-3 flex flex-col">
                        {STEPS.map((step) => {
                            const isActive = currentStep === step.id;
                            const isDone = currentStep > step.id;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => (isDone || isActive) && setCurrentStep(step.id)}
                                    className={cn(
                                        "w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-500 group relative",
                                        isActive
                                            ? (mode === 'bulk'
                                                ? "bg-emerald-600 shadow-[0_0_40px_rgba(16,185,129,0.3)] text-white"
                                                : "bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.3)] text-white")
                                            : "text-slate-500 hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-11 h-11 rounded-1.5xl flex items-center justify-center transition-all duration-500",
                                        isActive ? "bg-white/20" : isDone ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800/40"
                                    )}>
                                        {isDone && !isActive ? <CheckCircle size={20} /> : <step.icon size={20} />}
                                    </div>
                                    <span className={cn(
                                        "text-[11px] font-black uppercase tracking-[0.15em]",
                                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-300"
                                    )}>
                                        {step.name}
                                    </span>
                                    {isActive && <motion.div layoutId="active-nav" className="absolute left-0 w-1 h-6 bg-white rounded-full ml-1" />}
                                </button>
                            );
                        })}

                        <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</div>
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", activeTeams.length > 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-600")} />
                                <span className="text-[10px] font-black text-slate-400">{activeTeams.length} Teams Active</span>
                            </div>
                        </div>
                    </div>

                    {/* ── MAIN CONTENT AREA ── */}
                    <div className="flex-1 bg-[#1e1e1e] p-12 overflow-y-auto custom-scrollbar relative">
                        <AnimatePresence mode="wait">
                            {/* STEP 1 — Select level */}
                            {currentStep === 1 && (
                                <motion.div key="s1"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col items-center justify-center"
                                >


                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                                        {[
                                            {
                                                id: 'manual' as const,
                                                title: 'Beginner',
                                                desc: 'Simple team entry with guided form',
                                                icon: Leaf,
                                                activeColor: 'bg-blue-600',
                                                glowColor: 'rgba(37,99,235,0.2)',
                                                features: ['Up to 25 teams', 'Auto Team Tag', 'Color picker']
                                            },
                                            {
                                                id: 'bulk' as const,
                                                title: 'Advanced',
                                                desc: 'Bulk team import using CSV format',
                                                icon: Rocket,
                                                activeColor: 'bg-emerald-600',
                                                glowColor: 'rgba(16,185,129,0.3)',
                                                features: ['Unlimited teams', 'Paste Name;Tag', 'Instant processing']
                                            },
                                        ].map(card => {
                                            const isSelected = mode === card.id;
                                            return (
                                                <div
                                                    key={card.id}
                                                    onClick={() => setMode(card.id)}
                                                    className={cn(
                                                        "group relative flex flex-col items-center text-center p-12 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden cursor-pointer",
                                                        isSelected
                                                            ? (card.id === 'manual'
                                                                ? "bg-[#1a1a1a] border-blue-600 shadow-[0_0_60px_rgba(37,99,235,0.15)]"
                                                                : "bg-[#1a1a1a] border-emerald-600 shadow-[0_0_60px_rgba(5,150,105,0.15)]")
                                                            : "bg-[#252525]/40 border-white/5 hover:border-white/10 hover:bg-[#252525]"
                                                    )}
                                                >
                                                    {/* Glow Background */}
                                                    {isSelected && (
                                                        <div className={cn("absolute inset-0 animate-pulse opacity-20", card.id === 'manual' ? 'bg-blue-600' : 'bg-emerald-600')} />
                                                    )}

                                                    <div className={cn(
                                                        "w-20 h-20 rounded-3xl mb-8 flex items-center justify-center transition-all duration-500 relative z-10",
                                                        isSelected
                                                            ? (card.id === 'manual' ? "bg-blue-600 shadow-[0_15px_40px_rgba(37,99,235,0.4)]" : "bg-emerald-600 shadow-[0_15px_40px_rgba(5,150,105,0.4)]")
                                                            : "bg-slate-800 group-hover:scale-105"
                                                    )}>
                                                        <card.icon className="text-white" size={32} />
                                                    </div>

                                                    <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter relative z-10">{card.title}</h3>
                                                    <p className="text-slate-500 text-sm font-medium max-w-[200px] leading-relaxed mb-8 relative z-10">{card.desc}</p>

                                                    <div className="flex flex-wrap justify-center gap-2 mt-auto relative z-10">
                                                        {card.features.map(f => (
                                                            <span key={f} className={cn(
                                                                "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border transition-colors",
                                                                isSelected ? "text-white bg-white/5 border-white/10" : "text-slate-600 bg-black/40 border-white/5"
                                                            )}>
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Footer Action */}
                                                    <div className="h-16 mt-6 flex items-center justify-center relative z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMode(card.id);
                                                                handleNext();
                                                            }}
                                                            className={cn(
                                                                "px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl transition-all active:scale-95",
                                                                card.id === 'manual'
                                                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                                                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                                                            )}
                                                        >
                                                            Start Workflow
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <p className="mt-16 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span>Select your experience level</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                                        <span>Click Start Workflow to begin</span>
                                    </p>
                                </motion.div>
                            )}

                            {/* STEP 2 — Teams */}
                            {currentStep === 2 && (
                                <motion.div key="s2"
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                >
                                    {mode === 'bulk' ? (
                                        <div className="bg-slate-900/40 border-2 border-emerald-500/20 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(16,185,129,0.05)]">
                                            <div className="flex items-center justify-between px-10 py-6 border-b border-emerald-500/10 bg-emerald-600/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                                        <Zap size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-white uppercase tracking-widest text-base">Bulk Data Entry</h3>
                                                        <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Advanced Mode Active</p>
                                                    </div>
                                                </div>
                                                <code className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">NAME;TAG (one per line)</code>
                                            </div>
                                            <div className="p-8">
                                                <textarea
                                                    value={bulkInput}
                                                    onChange={e => setBulkInput(e.target.value)}
                                                    className="w-full h-80 bg-slate-950/60 border-2 border-slate-800 rounded-3xl p-8 text-white font-mono text-sm focus:border-emerald-500/40 outline-none resize-none leading-7 placeholder:text-slate-700 transition-all shadow-inner"
                                                    placeholder={"3X ESPORTS;3x\nFMA Esports;fma\nGaming Hub;gh\nTeam Oxy;oxy"}
                                                />
                                                <div className="mt-4 flex justify-between items-center px-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span>{bulkInput.split('\n').filter(l => l.trim()).length} parsed entities</span>
                                                    </div>
                                                    <button onClick={() => setBulkInput('')} className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-700/50">Clear Terminal</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-[0_15px_30px_rgba(37,99,235,0.25)]">
                                                        <Layers size={22} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-white uppercase tracking-[0.2em] text-xl">Team Matrix</h3>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">{activeTeams.length} / 25 positions initialized</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setTeams(Array.from({ length: 25 }, (_, i) => ({
                                                        id: `slot-${i + 1}`, teamNo: i + 1, name: '', slug: '',
                                                        colorR: DEFAULT_COLORS[i][0], colorG: DEFAULT_COLORS[i][1], colorB: DEFAULT_COLORS[i][2],
                                                        status: 'pending'
                                                    })))}
                                                    className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-400 border-2 border-slate-800 hover:border-rose-500/20 rounded-2xl transition-all bg-slate-900/40"
                                                >
                                                    Format All Slots
                                                </button>
                                            </div>

                                            {/* Grid of Team Cards */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-h-[640px] overflow-y-auto px-1 py-1 custom-scrollbar pr-4 pb-8">
                                                {teams.map((team, idx) => (
                                                    <motion.div
                                                        key={team.id}
                                                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.015 }}
                                                        className={cn(
                                                            "group relative border-[1px] rounded-[2rem] p-7 transition-all duration-300 hover:scale-[1.01] overflow-hidden min-h-[160px]",
                                                            team.name
                                                                ? "bg-blue-600/[0.04] border-blue-500/30 shadow-[0_15px_40px_rgba(37,99,235,0.06)]"
                                                                : "bg-slate-900/40 border-white/5 hover:border-slate-800"
                                                        )}
                                                    >
                                                        {/* --- CARD HEADER --- */}
                                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center font-black font-mono text-base shadow-inner",
                                                                    team.name
                                                                        ? (mode === 'manual' ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30")
                                                                        : "bg-slate-800/50 text-slate-500 border border-white/5"
                                                                )}>
                                                                    {idx + 1}
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Team Slot</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-6 relative z-10">
                                                            {/* --- ROW 1: ORB & NAME --- */}
                                                            <div className="flex items-center gap-5">
                                                                <div
                                                                    className="w-12 h-12 rounded-2xl border-2 border-white/10 shrink-0 relative flex items-center justify-center overflow-hidden shadow-2xl transition-transform group-hover:scale-105"
                                                                    style={{ background: `rgb(${team.colorR},${team.colorG},${team.colorB})` }}
                                                                >
                                                                    <div className="absolute inset-0 animate-pulse bg-white/10" />
                                                                    <div
                                                                        className="absolute inset-0"
                                                                        style={{ boxShadow: `inset 0 0 15px rgba(0,0,0,0.7), 0 0 25px rgba(${team.colorR},${team.colorG},${team.colorB},0.5)` }}
                                                                    />
                                                                </div>

                                                                <input
                                                                    type="text"
                                                                    value={team.name}
                                                                    onChange={e => updateTeam(idx, { name: e.target.value })}
                                                                    className={cn(
                                                                        "flex-1 bg-slate-950/60 border-2 rounded-2xl px-6 py-3.5 text-base font-black transition-all outline-none",
                                                                        team.name
                                                                            ? "text-white border-blue-500/30 focus:border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.08)]"
                                                                            : "text-slate-400 border-slate-800 focus:border-slate-600"
                                                                    )}
                                                                    placeholder={`ENTER TEAM NAME ${idx + 1}`}
                                                                />
                                                            </div>

                                                            {/* ROW 2: Tag & RGB (Increased height) */}
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center bg-slate-950/60 border-2 border-slate-800 rounded-2xl flex-1 overflow-hidden group-focus-within:border-blue-500/40 transition-all">
                                                                    <div className="pl-4 pr-1 text-slate-600">
                                                                        <Tag size={16} />
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={team.slug}
                                                                        onChange={e => updateTeam(idx, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                                                        className={cn(
                                                                            "w-full bg-transparent px-3 py-3 text-[14px] font-mono font-black transition-all outline-none uppercase tracking-wider",
                                                                            team.name ? "text-blue-400" : "text-slate-600"
                                                                        )}
                                                                        placeholder="TEAM TAG"
                                                                    />
                                                                </div>

                                                                <div className="flex gap-2 items-center bg-slate-950/60 rounded-2xl px-4 py-2.5 border-2 border-slate-800 shadow-inner">
                                                                    {['colorR', 'colorG', 'colorB'].map((key, i) => (
                                                                        <React.Fragment key={key}>
                                                                            <div className="flex flex-col items-center">
                                                                                <span className="text-[7px] font-black text-slate-600 uppercase mb-0.5">{key.slice(-1)}</span>
                                                                                <input type="number" min={0} max={255}
                                                                                    value={team[key as keyof typeof team] as number}
                                                                                    onChange={e => updateTeam(idx, { [key]: +e.target.value })}
                                                                                    className={cn(
                                                                                        "w-8 bg-transparent text-[12px] font-mono font-black border-none focus:ring-0 outline-none p-0 text-center",
                                                                                        i === 0 ? "text-rose-500" : i === 1 ? "text-emerald-500" : "text-blue-500"
                                                                                    )}
                                                                                />
                                                                            </div>
                                                                            {i < 2 && <div className="w-[1px] h-4 bg-slate-800 mx-1" />}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* --- FOOTER ACTION: CLEAR BUTTON --- */}
                                                            {team.name && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="flex justify-center pt-2 border-t border-white/5 mt-2"
                                                                >
                                                                    <button
                                                                        onClick={() => clearTeam(idx)}
                                                                        className="flex items-center justify-center gap-3 px-10 py-2.5 w-fit mx-auto rounded-xl bg-rose-500/5 border-2 border-rose-500/10 hover:bg-rose-500 hover:border-rose-500 hover:text-white text-rose-500 font-black uppercase text-[10px] tracking-[0.2em] transition-all group/clear shadow-lg"
                                                                    >
                                                                        <Trash2 size={14} className="group-hover/clear:rotate-12 transition-transform" />
                                                                        <span>Clear Roster Slot</span>
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* STEP 3 — Logos (Pro Asset Manager) */}
                            {currentStep === 3 && (
                                <motion.div key="s3"
                                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                                    className="relative h-full flex flex-col gap-6"
                                    onDrop={handleDrop}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                >
                                    {/* --- PRO SYNC OVERLAY --- */}
                                    <AnimatePresence>
                                        {isDragging && (
                                            <motion.div 
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="absolute inset-0 z-[100] bg-blue-600/10 backdrop-blur-md border-4 border-dashed border-blue-500/50 rounded-[2rem] flex flex-col items-center justify-center gap-6 shadow-[inset_0_0_100px_rgba(37,99,235,0.2)]"
                                            >
                                                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.6)]">
                                                    <Upload size={40} className="text-white animate-bounce" />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Ready for Synchronization</h3>
                                                    <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mt-2">Drop assets to trigger neural mapping</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* --- ASSET CONTROL BAR --- */}
                                    <div className="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-3xl backdrop-blur-xl">
                                        <div className="flex items-center gap-6 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Asset Manager v1.2</span>
                                            </div>
                                            <div className="h-4 w-[1px] bg-white/10" />
                                            <div className="flex gap-4">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    Matched <span className={cn("px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", matchedTeams.length > 0 && "animate-pulse")}>{matchedTeams.length}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    Pending <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{missingTeams.length}</span>
                                                </div>
                                            </div>
                                        </div>

                                            <div className="flex items-center gap-3">
                                                {isLoadingLogos && (
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mr-4">
                                                        <RefreshCcw size={12} className="animate-spin" />
                                                        Syncing DB
                                                    </div>
                                                )}

                                                {/* Navigation Cluster */}
                                                <div className="flex items-center gap-2 mr-4 bg-white/5 p-1 rounded-xl border border-white/5">
                                                    <button 
                                                        onClick={handleBack}
                                                        className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
                                                    >
                                                        <ArrowLeft size={16} />
                                                    </button>
                                                    <div className="h-4 w-[1px] bg-white/10" />
                                                    <button 
                                                        onClick={handleNext}
                                                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                                    >
                                                        Next Step <ArrowRight size={14} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2 mr-2">
                                                    <button 
                                                        onClick={handleStripAllBackgrounds}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-[10px] font-black text-indigo-400 uppercase tracking-widest transition-all active:scale-95 group/strip"
                                                    >
                                                        <Wand2 size={14} className="group-hover/strip:rotate-12 transition-transform" /> Neural Strip All
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all active:scale-95"
                                                >
                                                    <PackageOpen size={14} className="text-blue-500" /> Bulk Drop Terminal
                                                </button>
                                                <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />
                                            </div>
                                    </div>

                                    {/* --- HIGH DENSITY ASSET GRID --- */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                            {/* Hidden Global Team File Input */}
                                            <input
                                                ref={teamFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleTeamFileSelect}
                                            />

                                            {activeTeams.map((team, idx) => (
                                                <motion.div 
                                                    key={team.id}
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.01 }}
                                                    className={cn(
                                                        "group relative bg-[#0a0a0a] border rounded-2xl transition-all duration-300 hover:z-20 flex flex-col",
                                                        team.logo || team.logoUrl 
                                                            ? "border-emerald-500/20 hover:border-emerald-500/50 shadow-[0_15px_30px_rgba(0,0,0,0.4)]" 
                                                            : "border-white/5 hover:border-blue-500/40"
                                                    )}
                                                >
                                                    {/* Top Section: Logo Canvas */}
                                                    <div className="aspect-square p-2 relative shrink-0">
                                                        {/* Status Icon (Corner) */}
                                                        <div className="absolute top-4 right-4 z-30">
                                                            {team.logo || team.logoUrl ? (
                                                                <div className="w-5 h-5 rounded-full bg-black border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl group-hover:scale-110 transition-transform">
                                                                    <Check size={10} />
                                                                </div>
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center text-slate-700 shadow-xl group-hover:border-blue-500/40 transition-colors">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div 
                                                            className="relative w-full h-full rounded-xl overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer group/canvas"
                                                            onClick={() => triggerTeamUpload(idx)}
                                                        >
                                                            {/* Subtle Dynamic Glow (only on hover) */}
                                                            <div 
                                                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl pointer-events-none"
                                                                style={{ background: `rgb(${team.colorR},${team.colorG},${team.colorB})` }}
                                                            />

                                                            {team.logoUrl ? (
                                                                <img 
                                                                    src={team.logoUrl} 
                                                                    className="w-full h-full object-contain p-4 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-500" 
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-1.5 opacity-20 group-hover:opacity-60 transition-opacity">
                                                                    <Shield size={24} className="text-slate-500" />
                                                                    <span className="text-[6px] font-black uppercase tracking-widest text-slate-600">Pending</span>
                                                                </div>
                                                            )}

                                                            {/* Upload Overlay */}
                                                            <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex flex-col items-center justify-center z-10 gap-1">
                                                                <Upload size={18} className="text-white" />
                                                                <span className="text-[7px] font-black text-white uppercase tracking-widest text-center px-2">Inject Asset</span>
                                                            </div>

                                                            {/* AI Processing Overlay */}
                                                            {team.isProcessingAI && (
                                                                <div className="absolute inset-0 z-40 bg-indigo-900/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                                                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                                                                    <span className="text-[8px] font-black text-white uppercase tracking-tighter animate-pulse">Stripping...</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* AI Action Overlay (Floating Wand) */}
                                                    {(team.logo || team.logoUrl) && !team.isProcessingAI && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleStripBackground(idx); }}
                                                            className="absolute bottom-20 right-4 z-50 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-2xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white/20"
                                                            title="Neural Background Strip"
                                                        >
                                                            <Wand2 size={16} />
                                                        </button>
                                                    )}

                                                    {/* Bottom Section: Asset Metadata Strip */}
                                                    <div className="flex-1 px-3 py-2.5 border-t border-white/5 bg-white/[0.01] rounded-b-2xl flex flex-col justify-center min-h-[50px]">
                                                        <p className="text-[9px] font-black text-white truncate leading-none mb-1 uppercase tracking-tight">
                                                            {team.name || `Slot ${idx+1}`}
                                                        </p>
                                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                <span className="text-[7px] font-mono font-bold text-blue-500 uppercase tracking-widest truncate">
                                                                    {team.slug || 'tag'}.png
                                                                </span>
                                                            </div>
                                                            <div className="w-2 h-2 rounded-full border border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.1)] shrink-0" 
                                                                style={{ background: `rgb(${team.colorR},${team.colorG},${team.colorB})` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* --- PRO TIP BAR --- */}
                                    <div className="flex items-center gap-3 px-6 py-3 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                                        <Info size={14} className="text-blue-500" />
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                            Neural Auto-Matching: <span className="text-slate-400">Drag files anywhere on this surface to trigger name/tag cloud synchronization.</span>
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                                    {/* STEP 4 — Manifest Inspector */}
                            {currentStep === 4 && (
                                <motion.div key="s4"
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                    className="space-y-6"
                                >
                                    {/* --- VERIFICATION HEADER --- */}
                                    <div className="flex items-center justify-between bg-black/40 border border-white/5 p-5 rounded-3xl backdrop-blur-xl">
                                        <div className="flex items-center gap-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Manifest Verification v1.2</span>
                                            </div>
                                            <div className="h-4 w-[1px] bg-white/10" />
                                            <div className="flex gap-6">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    Rosters <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">{activeTeams.length}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    Assets Linked <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{matchedTeams.length * 4}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    Critical Errors <span className={cn("px-2 py-0.5 rounded-full border", missingTeams.length > 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-white/5 text-slate-500 border-white/10")}>{missingTeams.length}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={handleBack}
                                                className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
                                            >
                                                <ArrowLeft size={16} />
                                            </button>
                                            <div className="h-4 w-[1px] bg-white/10" />
                                            <button 
                                                onClick={handleNext}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                            >
                                                Next Step <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* --- DUAL PANE WORKSPACE --- */}
                                    <div className="grid grid-cols-12 gap-6 items-start h-[500px]">
                                        {/* Left Side: Manifest Explorer */}
                                        <div className="col-span-12 lg:col-span-7 bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-full">
                                            <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Layers size={14} className="text-blue-500" />
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Roster Data Manifest</h3>
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-600 tracking-tighter uppercase italic">Proof Verified</span>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                                                        <tr className="border-b border-white/5">
                                                            <th className="px-6 py-3 text-[9px] font-black text-slate-700 uppercase tracking-widest">Slot</th>
                                                            <th className="px-4 py-3 text-[9px] font-black text-slate-700 uppercase tracking-widest">Identity</th>
                                                            <th className="px-4 py-3 text-[9px] font-black text-slate-700 uppercase tracking-widest">Source Path</th>
                                                            <th className="px-6 py-3 text-right text-[9px] font-black text-slate-700 uppercase tracking-widest">Config Proof</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {activeTeams.map((team, idx) => (
                                                            <tr 
                                                                key={team.id} 
                                                                className="group hover:bg-white/[0.02] transition-colors"
                                                                onMouseEnter={() => {
                                                                    setIniPreview(`[Team${team.teamNo}]\nTeamName=${team.name || 'Slot ' + (idx+1)}\nTeamTag=${team.slug || 'Tag'}\nTeamColor=${team.colorR},${team.colorG},${team.colorB}\nTeamLogo=C:/LOGO/${team.slug || 'Tag'}.png\n`);
                                                                }}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <span className="text-[10px] font-mono text-slate-700">#{team.teamNo.toString().padStart(2, '0')}</span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-black border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-inner">
                                                                            {team.logoUrl ? (
                                                                                <img src={team.logoUrl} className="w-full h-full object-contain" />
                                                                            ) : (
                                                                                <Shield size={14} className="text-slate-800" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{team.name || `Slot ${idx+1}`}</p>
                                                                            <p className="text-[8px] font-mono text-blue-500 uppercase tracking-widest">{team.slug || 'tag'}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <p className="text-[9px] font-mono text-slate-600 truncate max-w-[140px]">C:/LOGO/{team.slug || '...'}.png</p>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-widest",
                                                                        (team.logo || team.logoUrl) ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20")}>
                                                                        {(team.logo || team.logoUrl) ? <Check size={8} /> : <AlertTriangle size={8} />}
                                                                        {(team.logo || team.logoUrl) ? "Valid" : "Empty"}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Right Side: Live INI Inspector */}
                                        <div className="col-span-12 lg:col-span-5 flex flex-col h-full gap-6">
                                            {/* Live Code Node */}
                                            <div className="flex-1 bg-black border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                                                <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <FileCode2 size={14} className="text-blue-500" />
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live INI Content</h4>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(iniPreview);
                                                            setNotification({ message: 'Roster proof copied to clipboard', type: 'success' });
                                                        }}
                                                        className="text-slate-600 hover:text-white transition-colors"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                                <div className="flex-1 p-6 relative">
                                                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/40 border-r border-white/5 flex flex-col items-center py-6 gap-2 pt-8">
                                                        {[1,2,3,4,5,6,7].map(n => <span key={n} className="text-[9px] font-mono text-slate-800">{n}</span>)}
                                                    </div>
                                                    <pre className="pl-10 text-[10px] font-mono leading-relaxed h-full overflow-hidden">
                                                        {iniPreview.split('\n').map((line, lidx) => (
                                                            <div key={lidx} className="flex">
                                                                <span className={cn(
                                                                    "truncate",
                                                                    line.startsWith('[') ? "text-amber-500 font-bold" : "text-slate-400",
                                                                    line.includes('=') && "text-blue-400"
                                                                )}>
                                                                    {line.split('=').map((part, pidx) => (
                                                                        <span key={pidx}>
                                                                            {part}{pidx === 0 && line.includes('=') ? '=' : ''}
                                                                            {pidx === 1 && <span className="text-emerald-400 font-bold">{part}</span>}
                                                                        </span>
                                                                    ))}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {iniPreview === '' && (
                                                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center opacity-30">
                                                                <Cpu size={32} className="animate-pulse" />
                                                                <p className="text-[9px] uppercase font-black tracking-widest max-w-[150px]">Select a roster to inspect generated config proof</p>
                                                            </div>
                                                        )}
                                                    </pre>
                                                </div>
                                            </div>

                                            {/* Visual Build Tree */}
                                            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-xl">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Archive size={14} className="text-slate-500" />
                                                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Build Tree Topology</h4>
                                                </div>
                                                <div className="font-mono text-[9px] space-y-1.5 overflow-hidden">
                                                    <div className="flex items-center gap-2 text-white/80">
                                                        <Archive size={11} className="text-blue-500 shrink-0" />
                                                        <span>STRYMX_PCOB_Package.zip</span>
                                                    </div>
                                                    <div className="pl-4 flex items-center gap-2 text-slate-500 border-l border-white/10 ml-1.5 pb-1">
                                                        <FolderOpen size={11} className="shrink-0 text-amber-500" />
                                                        <span>LOGO/</span>
                                                    </div>
                                                    <div className="pl-8 flex items-end gap-2 text-slate-700 border-l border-white/10 ml-1.5 pb-1">
                                                        <div className="w-2 h-[1px] bg-white/10 mb-1" />
                                                        <span>{matchedTeams.length * 4} Multi-Resolution Assets</span>
                                                    </div>
                                                    <div className="pl-4 flex items-center gap-2 text-slate-500 border-l border-white/10 ml-1.5">
                                                        <FolderOpen size={11} className="shrink-0 text-blue-500" />
                                                        <span>CONFIG/</span>
                                                    </div>
                                                    <div className="pl-8 flex items-end gap-2 text-slate-400 border-l border-white/10 ml-1.5">
                                                        <div className="w-2 h-[1px] bg-white/10 mb-1" />
                                                        <FileJson size={11} className="shrink-0 text-emerald-500" />
                                                        <span>TeamLogoAndColor.ini</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* --- AUTO VALIDATION WARNING --- */}
                                    {missingTeams.length > 0 && (
                                        <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                            <AlertTriangle size={14} className="text-amber-500" />
                                            <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest">
                                                System Warning: <span className="text-amber-500/60">{missingTeams.length} teams have no logos linked. They will appear as generic shields in-game.</span>
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* STEP 5 — Compile */}
                            {currentStep === 5 && (
                                <motion.div key="s5"
                                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                                    className="flex flex-col items-center gap-8 py-12"
                                >
                                    <div className="relative">
                                        <div className={cn("absolute inset-0 blur-[80px] rounded-full", isGenerating ? "bg-amber-500/30 animate-pulse" : "bg-violet-500/20")} />
                                        <motion.div
                                            animate={isGenerating ? { rotate: 360 } : {}}
                                            transition={isGenerating ? { repeat: Infinity, duration: 3, ease: "linear" } : {}}
                                            className="relative w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex items-center justify-center border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                                        >
                                            <Package className="text-white w-14 h-14 drop-shadow-lg" />
                                        </motion.div>
                                    </div>

                                    <div className="text-center space-y-2 max-w-lg">
                                        <h2 className="text-4xl font-black text-white tracking-tight">{isGenerating ? "Compiling..." : "Ready to Build"}</h2>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            {isGenerating
                                                ? `Processing logos... ${generationProgress}%`
                                                : `${matchedTeams.length} teams · ${matchedTeams.length * 4} logo files · 1 INI config`
                                            }
                                        </p>
                                    </div>

                                    {isGenerating && (
                                        <div className="w-full max-w-md">
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
                                                    animate={{ width: `${generationProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-center text-[10px] font-mono text-slate-600 mt-2 uppercase tracking-widest">Resizing to 512 · 256 · 128 · 64px</p>
                                        </div>
                                    )}

                                    {/* Output preview */}
                                    {!isGenerating && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                                            {[
                                                { name: '/LOGO/', desc: `${matchedTeams.length * 4} PNG files (4 sizes × ${matchedTeams.length} teams)`, icon: FolderOpen, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
                                                { name: '/CONFIG/TeamLogoAndColor.ini', desc: 'Full PCOB broadcast config', icon: FileCode2, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
                                            ].map(pkg => (
                                                <div key={pkg.name} className={cn("flex items-center gap-4 p-4 rounded-2xl border", pkg.border, pkg.bg)}>
                                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                                                        <pkg.icon className={pkg.color} size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-white font-mono">{pkg.name}</p>
                                                        <p className="text-[9px] text-slate-600 mt-0.5">{pkg.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={generatePackage}
                                        disabled={isGenerating || matchedTeams.length === 0}
                                        className={cn(
                                            "relative px-14 py-5 rounded-2xl font-black uppercase tracking-[0.15em] text-sm flex items-center gap-4 transition-all duration-300 overflow-hidden",
                                            isGenerating || matchedTeams.length === 0
                                                ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                                : "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(124,58,237,0.4)] active:scale-95"
                                        )}
                                    >
                                        {isGenerating
                                            ? <><RefreshCcw className="animate-spin" size={18} /> Compiling...</>
                                            : <><Download size={18} /> Build PCOB Package</>
                                        }
                                    </button>

                                    <p className="text-[10px] text-slate-600 font-mono text-center max-w-sm leading-relaxed">
                                        <Settings size={10} className="inline mr-1 mb-0.5" />
                                        Extract ZIP → copy <span className="text-slate-400">LOGO/</span> to <span className="text-slate-400">C:\LOGO\</span> and <span className="text-slate-400">CONFIG/</span> to <span className="text-slate-400">ShadowTrackerExtra\Saved\</span>
                                    </p>
                                </motion.div>
                            )}

                        </AnimatePresence>

                        {/* ── INTERNAL FOOTER NAV ── */}
                        {(currentStep > 1 && currentStep !== 3) && (
                            <div className="flex items-center justify-between pt-12 mt-12 border-t border-white/5">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <ArrowLeft size={14} /> Back to Step {currentStep - 1}
                                </button>

                                {currentStep < 5 && (
                                    <button
                                        onClick={handleNext}
                                        className={cn(
                                            "flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95",
                                            mode === 'bulk'
                                                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20"
                                                : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20"
                                        )}
                                    >
                                        {currentStep === 4 ? "Review Summary & Build" : "Next Step"} <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 60, scale: 0.95 }}
                        className={cn(
                            "fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 px-8 py-4 rounded-2xl border backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.5)]",
                            notification.type === 'success' ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300" : "bg-rose-950/80 border-rose-500/30 text-rose-300"
                        )}
                    >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", notification?.type === 'success' ? "bg-emerald-500/20" : "bg-rose-500/20")}>
                            {notification?.type === 'success' ? <CheckCircle size={18} /> : <X size={18} />}
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">{notification?.type}</p>
                            <p className="text-sm font-bold">{notification?.message}</p>
                        </div>
                        <button onClick={() => setNotification(null)} className="ml-2 opacity-40 hover:opacity-100 transition-opacity"><X size={16} /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
