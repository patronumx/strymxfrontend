"use client"
import React, { useState, useEffect } from 'react';
import { Save, Layers, Palette, Search, Plus, Code, Image as ImageIcon, Trash2, CheckCircle2, ChevronRight, X, MousePointer2, Eye, EyeOff } from 'lucide-react';
import { Rnd } from 'react-rnd';

const BASE_TELEMETRY = [
    { id: 'match_number', label: 'Match Number', defaultVal: '1/16' },
    { id: 'match_total_kills', label: 'Match Total Kills', defaultVal: '142' },
    { id: 'match_total_headshots', label: 'Match Total Headshots', defaultVal: '45' },
    { id: 'match_total_knocks', label: 'Match Total Knocks', defaultVal: '109' },
    { id: 'top_fragger_name', label: 'Top Fragger Name', defaultVal: 'SCOUTOP' },
    { id: 'top_fragger_kills', label: 'Top Fragger Kills', defaultVal: '12' },
];

const TELEMETRY_VARIABLES = [...BASE_TELEMETRY];
for (let i = 1; i <= 16; i++) {
    TELEMETRY_VARIABLES.push({ id: `team_${i}_rank`, label: `Team ${i} Rank`, defaultVal: String(i) });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_name`, label: `Team ${i} Name`, defaultVal: `TEAM ${i}` });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_place_pts`, label: `Team ${i} Place Pts`, defaultVal: '10' });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_elims`, label: `Team ${i} Elims`, defaultVal: '14' });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_total_pts`, label: `Team ${i} Total Pts`, defaultVal: '24' });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_wwcd`, label: `Team ${i} WWCD`, defaultVal: '1' });
}
for (let i = 1; i <= 4; i++) {
    TELEMETRY_VARIABLES.push({ id: `top_team_player_${i}_name`, label: `Top Team Player ${i} Name`, defaultVal: `PLAYER ${i}` });
    TELEMETRY_VARIABLES.push({ id: `top_team_player_${i}_kills`, label: `Top Team Player ${i} Kills`, defaultVal: '5' });
    TELEMETRY_VARIABLES.push({ id: `top_team_player_${i}_damage`, label: `Top Team Player ${i} Damage`, defaultVal: '1200' });
}

export interface OverlayField {
    id: string;
    variable: string; // The telemetry ID it binds to
    x: number;
    y: number;
    width: number | string;
    height: number | string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: string | number;
    textAlign: 'left' | 'center' | 'right';
    isUppercase: boolean;
    prefix: string;
    suffix: string;
    visible: boolean;
    colorType: 'primary' | 'secondary' | 'accent' | 'white' | 'custom';
}

export interface OverlayTheme {
    primary: string;
    secondary: string;
    accent: string;
}

const COLOR_MODES: Record<string, OverlayTheme> = {
    gold: { primary: '#f59e0b', secondary: '#78350f', accent: '#fef3c7' },
    green: { primary: '#22c55e', secondary: '#064e3b', accent: '#dcfce7' },
    pink: { primary: '#ec4899', secondary: '#701a75', accent: '#fdf2f8' },
    crimson: { primary: '#ef4444', secondary: '#7f1d1d', accent: '#fee2e2' },
    ocean: { primary: '#3b82f6', secondary: '#1e3a8a', accent: '#dbeafe' },
    monochrome: { primary: '#ffffff', secondary: '#000000', accent: '#f3f4f6' },
};

const PREMIUM_DESIGNS = [
    { id: 'valorant_neon', name: 'Neon Protocol', price: '$4.99', locked: true, previewUrl: 'https://placehold.co/600x400/000000/00ffcc?text=NEON+PROTOCOL' },
    { id: 'cs_tactical', name: 'Tactical Strike', price: '$5.99', locked: true, previewUrl: 'https://placehold.co/600x400/111827/ffffff?text=TACTICAL+STRIKE' },
];

export interface OverlayTemplate {
    id: string;
    name: string;
    backgroundUrl: string;
    overlayType: string;
    fields: OverlayField[];
    theme: OverlayTheme;
}

export default function OverlayDesignerMapper() {
    const [templateName, setTemplateName] = useState('Match Rankings V1');
    const [backgroundUrl, setBackgroundUrl] = useState('/assets/ramadan_wwcd.png'); // Default tester
    const [overlayType, setOverlayType] = useState('match_ranking');
    
    
    const [fields, setFields] = useState<OverlayField[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [theme, setTheme] = useState<OverlayTheme>(COLOR_MODES.gold);
    const [activeTab, setActiveTab] = useState<'branding' | 'layers'>('branding');

    const [scale, setScale] = useState(0.5);

    // Save Modal
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const handleResize = () => {
            const canvasWrapper = document.getElementById('canvas-wrapper');
            if (canvasWrapper) {
                const availableWidth = canvasWrapper.clientWidth - 64; 
                setScale(Math.min(availableWidth / 1920, 1));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // AUTO-POPULATION LOGIC
    useEffect(() => {
        if (overlayType === 'match_ranking' && fields.length === 0) {
            const newFields: OverlayField[] = [];
            let currentId = 0;

            const makeField = (variable: string, x: number, y: number, width: number | string, fontSize = 24, align: 'left'|'center'|'right' = 'left', colorType: OverlayField['colorType'] = 'primary'): OverlayField => {
                currentId++;
                return {
                    id: `node_${Date.now()}_${currentId}`,
                    variable, x, y, width, height: 40,
                    fontSize, fontFamily: 'Inter', color: '#ffffff', fontWeight: 800, textAlign: align, isUppercase: true, prefix: '', suffix: '', visible: true,
                    colorType: colorType
                };
            };

            // Globals
            newFields.push(makeField('match_number', 50, 50, 150, 48, 'left', 'white'));
            newFields.push(makeField('top_fragger_name', 250, 50, 300, 48, 'center', 'primary'));
            newFields.push(makeField('match_total_kills', 600, 50, 150, 48, 'right', 'white'));

            // Roster 16 Teams (Spreadsheet-like layout)
            const startY = 150;
            for (let i = 1; i <= 16; i++) {
                const yOff = startY + ((i - 1) * 45); // Compact rows
                newFields.push(makeField(`team_${i}_rank`, 50, yOff, 60, 24, 'center', 'white'));
                newFields.push(makeField(`team_${i}_name`, 120, yOff, 250, 24, 'left', 'white'));
                newFields.push(makeField(`team_${i}_place_pts`, 380, yOff, 80, 24, 'center', 'primary'));
                newFields.push(makeField(`team_${i}_elims`, 470, yOff, 80, 24, 'center', 'primary'));
                newFields.push(makeField(`team_${i}_total_pts`, 560, yOff, 80, 24, 'center', 'primary'));
            }

            setFields(newFields);
        }
    }, [overlayType]);

    const updateField = (id: string, updates: Partial<OverlayField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const toggleFieldVisibility = (id: string) => {
        setFields(fields.map(f => f.id === id ? { ...f, visible: !f.visible } : f));
    };

    const handleSave = () => {
        const templateData: OverlayTemplate = {
            id: `tpl_${Date.now()}`,
            name: templateName,
            backgroundUrl,
            overlayType,
            fields: fields.filter(f => f.visible),
            theme
        };
        
        console.log("Saving template:", templateData);
        setShowSaveModal(true);
    };

    const selectedField = fields.find(f => f.id === selectedFieldId);

    const filteredLayers = fields.filter(f => f.variable.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
            
            {/* Sidebar Inspector / Layers Panel */}
            <div className="w-[380px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden relative">
                <div className="p-6 border-b border-slate-800 bg-slate-900 z-10 shadow-sm relative shrink-0">
                    <h1 className="text-2xl font-black text-white italic tracking-tighter shadow-sm mb-1 uppercase">
                        Overlay Mapper
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                        Auto-Populating Grid Engine
                    </p>
                </div>

                <div className="flex-1 w-full relative overflow-hidden bg-slate-900">
                    <div className={`absolute inset-0 w-full h-full bg-slate-900 transition-transform duration-300 ${selectedField ? '-translate-x-full' : 'translate-x-0'} flex flex-col`}>
                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-800 shrink-0">
                            <button 
                                onClick={() => setActiveTab('branding')}
                                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'branding' ? 'text-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <Palette size={16} />
                                    Branding
                                </div>
                            </button>
                            <button 
                                onClick={() => setActiveTab('layers')}
                                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'layers' ? 'text-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <Layers size={16} />
                                    Layers
                                </div>
                            </button>
                        </div>

                        {activeTab === 'branding' ? (
                            <div className="p-6 h-full flex flex-col overflow-y-auto custom-scrollbar">
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                                    Universal Design Skins
                                </h3>
                                <p className="text-[11px] text-slate-400 mb-6 leading-relaxed italic shrink-0">
                                    This is our <strong>Signature Design</strong>. Switch colors below to match your tournament branding perfectly.
                                </p>

                                <div className="grid grid-cols-2 gap-3 mb-8 shrink-0">
                                    {Object.entries(COLOR_MODES).map(([key, value]) => (
                                        <button
                                            key={key}
                                            onClick={() => setTheme(value)}
                                            className={`group p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${theme === value ? 'bg-blue-600/10 border-blue-500 shadow-lg' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}
                                        >
                                            <div className="flex gap-1">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: value.primary }} />
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: value.accent }} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter text-slate-300 group-hover:text-white">{key}</span>
                                        </button>
                                    ))}
                                </div>

                                <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                                    Premium Store (Coming Soon)
                                </h3>
                                <div className="space-y-3 shrink-0">
                                    {PREMIUM_DESIGNS.map(design => (
                                        <div key={design.id} className="relative group overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 opacity-75">
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-transform">
                                                <div className="bg-amber-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-xl tracking-widest">
                                                    ONE TIME PURCHASE: {design.price}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-10 rounded border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden">
                                                    <img src={design.previewUrl} className="w-full h-full object-cover opacity-50 gray-scale" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black uppercase text-slate-400 italic tracking-tight">{design.name}</span>
                                                    <span className="text-[9px] text-slate-600 font-bold uppercase">Multi-Color Enabled</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 h-full flex flex-col overflow-hidden">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                                    Data Nodes
                                </h3>
                                
                                <div className="relative mb-4 shrink-0">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input 
                                        type="text"
                                        placeholder="Search nodes (e.g., team_1)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 pl-9 pr-3 py-2 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-2 custom-scrollbar">
                                    {filteredLayers.map(f => (
                                        <div
                                            key={f.id}
                                            onClick={() => setSelectedFieldId(f.id)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-all group flex items-center cursor-pointer ${
                                                !f.visible ? 'opacity-40 hover:opacity-80 bg-slate-800/10' : (selectedFieldId === f.id ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-slate-800/40 hover:bg-slate-700')
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-blue-400 truncate tracking-tight">{f.variable}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleFieldVisibility(f.id); }}
                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 shrink-0"
                                            >
                                                {f.visible ? <Eye size={14} className="text-blue-500"/> : <EyeOff size={14} className="text-slate-50" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`absolute inset-0 w-full h-full bg-slate-900 transition-transform duration-300 ${selectedField ? 'translate-x-0' : 'translate-x-full'}`}>
                        {/* PROPERTIES PANEL */}
                        {selectedField && (
                        <div className="p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between shrink-0 mb-6">
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <Palette size={14} /> Node Inspector
                                </h3>
                                <button 
                                    onClick={() => setSelectedFieldId(null)}
                                    className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"
                                >
                                    Cancel <ChevronRight size={14} />
                                </button>
                            </div>

                            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 mb-6 shrink-0">
                                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Bound Data Variable</div>
                                <div className="font-mono text-sm text-amber-400 truncate">{selectedField.variable}</div>
                            </div>

                            <div className="space-y-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0 pr-2 pb-10 custom-scrollbar">
                                
                                {/* Precision Positioning */}
                                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800/60">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 flex justify-between"><span>X Pos</span> <span className="text-slate-700">px</span></label>
                                        <input 
                                            type="number" 
                                            value={selectedField.x}
                                            onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })}
                                            className="w-full bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-white font-mono outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 flex justify-between"><span>Y Pos</span> <span className="text-slate-700">px</span></label>
                                        <input 
                                            type="number" 
                                            value={selectedField.y}
                                            onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })}
                                            className="w-full bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-white font-mono outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 flex justify-between"><span>Width</span> <span className="text-slate-700">px</span></label>
                                        <input 
                                            type="number" 
                                            value={typeof selectedField.width === 'number' ? selectedField.width : parseInt(selectedField.width as string) || 0}
                                            onChange={(e) => updateField(selectedField.id, { width: Number(e.target.value) })}
                                            className="w-full bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-white font-mono outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 flex justify-between"><span>Height</span> <span className="text-slate-700">px</span></label>
                                        <input 
                                            type="number" 
                                            value={typeof selectedField.height === 'number' ? selectedField.height : parseInt(selectedField.height as string) || 0}
                                            onChange={(e) => updateField(selectedField.id, { height: Number(e.target.value) })}
                                            className="w-full bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-white font-mono outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Color Logic</label>
                                    <select 
                                        value={selectedField.colorType}
                                        onChange={(e) => updateField(selectedField.id, { colorType: e.target.value as any })}
                                        className="w-full bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-amber-400 font-bold uppercase outline-none mb-3"
                                    >
                                        <option value="primary">PRIMARY THEME</option>
                                        <option value="secondary">SECONDARY THEME</option>
                                        <option value="accent">ACCENT THEME</option>
                                        <option value="white">STATIC WHITE</option>
                                        <option value="custom">CUSTOM OVERRIDE</option>
                                    </select>

                                    {selectedField.colorType === 'custom' && (
                                        <div className="flex gap-3 items-center animate-in fade-in duration-300">
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                                                <input 
                                                    type="color" 
                                                    value={selectedField.color}
                                                    onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                                />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={selectedField.color}
                                                onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                                                className="flex-1 bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-white font-mono outline-none transition-colors"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Font Size</label>
                                        <input 
                                            type="number" 
                                            value={selectedField.fontSize}
                                            onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })}
                                            className="w-full bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-white font-mono outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Weight</label>
                                        <select 
                                            value={selectedField.fontWeight}
                                            onChange={(e) => updateField(selectedField.id, { fontWeight: e.target.value })}
                                            className="w-full bg-slate-950 rounded-lg border border-slate-800 focus:border-blue-500 px-3 py-2 text-sm text-white font-sans outline-none transition-colors"
                                        >
                                            <option value="400">Regular</option>
                                            <option value="600">SemiBold</option>
                                            <option value="800">ExtraBold</option>
                                            <option value="900">Black</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Alignment</label>
                                    <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1">
                                        {['left', 'center', 'right'].map((align) => (
                                            <button
                                                key={align}
                                                onClick={() => updateField(selectedField.id, { textAlign: align as any })}
                                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${selectedField.textAlign === align ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                {align}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedField.isUppercase}
                                            onChange={(e) => updateField(selectedField.id, { isUppercase: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-500 bg-slate-800 border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-300">Force Uppercase</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Prefix</label>
                                        <input 
                                            type="text" 
                                            value={selectedField.prefix}
                                            placeholder="e.g. #"
                                            onChange={(e) => updateField(selectedField.id, { prefix: e.target.value })}
                                            className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">Suffix</label>
                                        <input 
                                            type="text" 
                                            value={selectedField.suffix}
                                            placeholder="e.g. pts"
                                            onChange={(e) => updateField(selectedField.id, { suffix: e.target.value })}
                                            className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
                {/* Topbar Settings */}
                <div className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 flex items-center justify-between shrink-0 z-20">
                    <div className="flex items-center gap-6">
                        <div>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">Overlay Type</label>
                            <select 
                                value={overlayType}
                                onChange={(e) => {
                                    if(confirm("Changing Overlay Type will wipe all current nodes. Proceed?")) {
                                        setFields([]); // Allows auto-pop logic to re-trigger
                                        setOverlayType(e.target.value);
                                    }
                                }}
                                className="bg-transparent border-b border-slate-700 focus:border-blue-500 text-sm font-bold uppercase text-blue-400 px-1 py-0.5 outline-none cursor-pointer"
                            >
                                <option value="match_ranking">Match Ranking</option>
                                <option value="match_summary">Match Summary [WIP]</option>
                                <option value="top_fragger">Top Fragger [WIP]</option>
                            </select>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-800"/>
                        <div>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">Background Asset (URL)</label>
                            <div className="flex items-center gap-2">
                                <ImageIcon size={14} className="text-slate-500" />
                                <input 
                                    type="text"
                                    value={backgroundUrl}
                                    placeholder="/assets/my-bg.png"
                                    onChange={(e) => setBackgroundUrl(e.target.value)}
                                    className="bg-transparent border-b border-slate-700 focus:border-blue-500 text-sm font-mono text-slate-300 px-1 py-0.5 outline-none w-80"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end mr-4">
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">Canvas Scale</label>
                            <span className="text-xs text-blue-400 font-mono font-bold bg-blue-900/20 px-2 py-0.5 rounded border border-blue-500/20">{Math.round(scale * 100)}%</span>
                        </div>
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg border border-blue-400/20 flex items-center gap-2 transition-all"
                        >
                            <Save size={18} />
                            Save Template
                        </button>
                    </div>
                </div>

                {/* Canvas Workspace */}
                <div id="canvas-wrapper" className="flex-1 overflow-auto bg-black p-8 flex items-center justify-center relative" onClick={() => setSelectedFieldId(null)}>
                    {/* The Native 1920x1080 Output Frame */}
                    <div 
                        className="relative overflow-hidden ring-4 ring-slate-800 bg-slate-900 shadow-2xl shrink-0"
                        style={{ 
                            width: 1920, 
                            height: 1080, 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'center center',
                            backgroundImage: `url(${backgroundUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}
                    >
                        {/* Editor Guidelines/Helpers */}
                        <div className="absolute inset-0 pointer-events-none border border-slate-800 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

                        {fields.map(field => {
                            if (!field.visible && selectedFieldId !== field.id) return null; // Hide if invisible unless selected

                            const isSelected = selectedFieldId === field.id;
                            
                            // Get sample data to preview
                            const sampleData = TELEMETRY_VARIABLES.find(v => v.id === field.variable)?.defaultVal || 'DATA';
                            const displayStr = `${field.prefix}${field.isUppercase ? sampleData.toUpperCase() : sampleData}${field.suffix}`;

                            // Resolved style based on theme
                            const resolvedColor = field.colorType === 'primary' ? theme.primary : 
                                                field.colorType === 'secondary' ? theme.secondary :
                                                field.colorType === 'accent' ? theme.accent :
                                                field.colorType === 'white' ? '#ffffff' : field.color;

                            return (
                                <Rnd
                                    key={field.id}
                                    position={{ x: field.x, y: field.y }}
                                    size={{ width: field.width, height: field.height }}
                                    onDragStop={(e, d) => updateField(field.id, { x: d.x, y: d.y })}
                                    onResizeStop={(e, dir, ref, delta, position) => {
                                        updateField(field.id, { width: ref.style.width, height: ref.style.height, ...position });
                                    }}
                                    onClick={(e: any) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                                    bounds="parent"
                                    className={`group ${isSelected ? 'ring-2 ring-blue-500 z-50 bg-blue-500/10' : 'hover:ring-1 hover:ring-slate-500/50 hover:bg-slate-500/5 cursor-pointer z-10'} ${!field.visible ? 'opacity-30' : ''}`}
                                >
                                    <div 
                                        className="w-full h-full flex select-none"
                                        style={{
                                            alignItems: 'center', 
                                            justifyContent: field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <span 
                                            style={{
                                                fontSize: `${field.fontSize}px`,
                                                fontFamily: field.fontFamily,
                                                color: resolvedColor,
                                                fontWeight: field.fontWeight,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {displayStr}
                                        </span>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow pointer-events-none truncate max-w-full z-50 flex items-center gap-1">
                                            <MousePointer2 size={10}/> {field.variable}
                                        </div>
                                    )}
                                </Rnd>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Save Success Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-8 relative shadow-2xl">
                        <button onClick={() => setShowSaveModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                            <X size={20} />
                        </button>
                        
                        <div className="flex flex-col items-center text-center">
                            <CheckCircle2 size={64} className="text-green-500 mb-4" />
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Template Saved!</h2>
                            <p className="text-slate-400 mb-6 text-sm">
                                Data mapping has been bound to your selected PNG template. No manual rendering required.
                            </p>

                            <div className="w-full bg-black border border-slate-800 rounded-xl p-4 text-left font-mono text-xs overflow-hidden">
                                <div className="text-slate-500 mb-1">OBS Browser Source URL:</div>
                                <div className="text-blue-400 break-all select-all">
                                    http://localhost:4000/overlay/live?template=tpl_{Date.now().toString().slice(-4)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Ensure the mock icons used (Eye/EyeOff) are imported at the top.
