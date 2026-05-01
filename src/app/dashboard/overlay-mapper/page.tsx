"use client"
import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Save, Plus, Type, Image as ImageIcon, Send, LayoutGrid, Trash2, CheckCircle2, Copy, X } from 'lucide-react';

const BASE_TELEMETRY = [
    { id: 'match_number', label: 'Match Number' },
    { id: 'match_total_kills', label: 'Match Total Kills', defaultIcon: '/assets/Eliminations.png' },
    { id: 'match_total_headshots', label: 'Match Total Headshots', defaultIcon: '/assets/Headshots.png' },
    { id: 'match_total_knocks', label: 'Match Total Knocks', defaultIcon: '/assets/PAN.png' },
    { id: 'match_smokes_and_nades', label: 'Match Smokes & Nades', defaultIcon: '/assets/SMOKES & NADES.png' },
    { id: 'match_vehicle_kills', label: 'Match Vehicle Kills', defaultIcon: '/assets/UAZ.png' },
    { id: 'match_grenade_kills', label: 'Match Grenade Kills', defaultIcon: '/assets/GRENADE.png' },
    { id: 'match_airdrops_looted', label: 'Match Airdrops Looted', defaultIcon: '/assets/AIRDROP.png' },
    { id: 'top_fragger_name', label: 'Top Fragger Name' },
    { id: 'top_fragger_kills', label: 'Top Fragger Kills', defaultIcon: '/assets/Eliminations.png' },
    { id: 'top_fragger_damage', label: 'Top Fragger Damage' },
    { id: 'top_fragger_survival', label: 'Top Fragger Survival Time' }
];

const TELEMETRY_VARIABLES = [...BASE_TELEMETRY];
for (let i = 1; i <= 16; i++) {
    TELEMETRY_VARIABLES.push({ id: `team_${i}_rank`, label: `Team ${i} Rank`, defaultIcon: '' });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_name`, label: `Team ${i} Name`, defaultIcon: '' });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_place_pts`, label: `Team ${i} Place Pts`, defaultIcon: '' });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_elims`, label: `Team ${i} Elims`, defaultIcon: '/assets/Eliminations.png' });
    TELEMETRY_VARIABLES.push({ id: `team_${i}_total_pts`, label: `Team ${i} Total Pts`, defaultIcon: '' });
}
for (let i = 1; i <= 4; i++) {
    TELEMETRY_VARIABLES.push({ id: `top_team_player_${i}_name`, label: `Top Team Player ${i} Name`, defaultIcon: '' });
    TELEMETRY_VARIABLES.push({ id: `top_team_player_${i}_kills`, label: `Top Team Player ${i} Kills`, defaultIcon: '/assets/Eliminations.png' });
    TELEMETRY_VARIABLES.push({ id: `top_team_player_${i}_damage`, label: `Top Team Player ${i} Damage`, defaultIcon: '' });
}

const GRID_COLUMNS_PRESETS = [
    { id: 'rank', label: 'Rank', width: 'w-16' },
    { id: 'logo', label: 'Team Logo', width: 'w-16' },
    { id: 'team_name', label: 'Team Name', width: 'flex-1' },
    { id: 'place_pts', label: 'Place Pts', width: 'w-24' },
    { id: 'elims', label: 'Elims', width: 'w-24' },
    { id: 'total_pts', label: 'Total Pts', width: 'w-24' }
];

const FONTS = ['Inter', 'Outfit', 'Oswald', 'Rajdhani', 'Bebas Neue', 'Anton', 'Montserrat'];

export default function OverlayMapperPage() {
    const [profileName, setProfileName] = useState('My Custom Layout');
    const [bgImage, setBgImage] = useState('/assets/ramadan_wwcd.png');
    
    const [fields, setFields] = useState<any[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    // Save Modal State
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [savedUrl, setSavedUrl] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    const addTextField = (variableId: string) => {
        const fieldData = TELEMETRY_VARIABLES.find(v => v.id === variableId);
        const newField = {
            id: `text_${Date.now()}`,
            type: 'text',
            variable: variableId,
            label: fieldData?.label || variableId,
            x: 960,
            y: 540,
            fontFamily: 'Inter',
            fontSize: 48,
            color: '#FFFFFF',
            fontWeight: 900,
            align: 'left',
            showIcon: false,
            iconPath: fieldData?.defaultIcon || '',
            iconSize: 48,
            iconGap: 16,
            prefix: '',
            suffix: ''
        };
        setFields(p => [...p, newField]);
        setSelectedFieldId(newField.id);
    };

    const addSmartGrid = () => {
        const newGrid = {
            id: `grid_${Date.now()}`,
            type: 'grid',
            x: 100,
            y: 200,
            width: 800,
            height: 600,
            rows: 8,
            fontFamily: 'Inter',
            fontSize: 32,
            color: '#FFFFFF',
            fontWeight: 900,
            columns: [
                { id: 'rank', type: 'rank', label: 'Rank', width: 'w-16', align: 'center' },
                { id: 'team_name', type: 'team_name', label: 'Team Name', width: 'flex-1', align: 'left' },
                { id: 'total_pts', type: 'total_pts', label: 'Total', width: 'w-24', align: 'center' }
            ]
        };
        setFields(p => [...p, newGrid]);
        setSelectedFieldId(newGrid.id);
    };

    const updateField = (id: string, updates: any) => {
        setFields(p => p.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const saveProfile = async () => {
        const id = profileName.toLowerCase().replace(/\s+/g, '-');
        const elementsJson = JSON.stringify({
            backgroundImage: bgImage,
            backgroundType: 'image',
            fields: fields
        });

        try {
            await fetch(`http://${window.location.hostname}:4000/api/overlay-templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    name: profileName,
                    width: 1920,
                    height: 1080,
                    elements: elementsJson
                })
            });
            const endpointUrl = `http://${window.location.hostname}:3000/overlay/dynamic?profileId=${id}&transparent=true`;
            setSavedUrl(endpointUrl);
            setShowSaveModal(true);
            setCopySuccess(false);
        } catch (e) {
            alert("Failed to save profile.");
        }
    };

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(savedUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (e) {
            console.error("Failed to copy", e);
        }
    };

    const selectedField = fields.find(f => f.id === selectedFieldId);

    return (
        <div className="flex w-screen h-screen bg-slate-900 border-t border-slate-800 font-sans text-slate-200">
            {/* Save Success Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(99,102,241,0.2)] max-w-lg w-full relative">
                        <button onClick={() => setShowSaveModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="text-emerald-400 w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Profile Saved!</h2>
                            <p className="text-slate-400 text-sm mb-6">Your Layout Profile <span className="text-indigo-300 font-bold">'{profileName}'</span> has been successfully saved to the cloud.</p>
                            
                            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-left">Your Live OBS URL</p>
                                <div className="flex items-center gap-2">
                                    <input 
                                        readOnly
                                        value={savedUrl}
                                        className="bg-transparent text-indigo-300 text-sm w-full outline-none"
                                    />
                                    <button 
                                        onClick={handleCopyUrl}
                                        className={`shrink-0 p-2 rounded-lg transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                                    >
                                        {copySuccess ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setShowSaveModal(false)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-widest text-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 1. Sidebar Map Panel */}
            <div className="w-80 h-full border-r border-slate-800 bg-slate-950 flex flex-col p-6 overflow-y-auto z-50 shadow-[5px_0_25px_rgba(0,0,0,0.5)]">
                <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                    <Monitor className="text-indigo-400" /> Visual Mapper
                </h1>

                <div className="flex items-center gap-2 mb-6">
                    <input 
                        className="bg-slate-800 border border-slate-700 text-white font-bold p-2 px-3 rounded-lg w-full text-sm outline-none focus:border-indigo-500" 
                        value={profileName} 
                        onChange={e => setProfileName(e.target.value)} 
                        placeholder="Profile Name"
                    />
                    <button onClick={saveProfile} className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg text-white shadow-lg transition-colors" title="Save Profile">
                        <Save size={20} />
                    </button>
                </div>

                <div className="mb-6 pb-6 border-b border-slate-800">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5"><ImageIcon size={14}/> Background Graphic</label>
                    <input 
                        className="bg-slate-800 border border-slate-700 text-white p-2 px-3 rounded-lg w-full text-sm mb-2" 
                        value={bgImage} onChange={e => setBgImage(e.target.value)} 
                        placeholder="Leave empty for Data Only Overlay"
                    />
                    <div className="flex gap-2 flex-wrap">
                         <button onClick={() => setBgImage('')} className="text-[10px] bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-500 font-bold shadow shadow-indigo-500/20">Transparent</button>
                         <button onClick={() => setBgImage('/assets/ramadan_wwcd.png')} className="text-[10px] bg-slate-800 px-2 py-1 rounded hover:bg-slate-700">Zong WWCD</button>
                         <button onClick={() => setBgImage('/assets/ramadan_top_fragger.png')} className="text-[10px] bg-slate-800 px-2 py-1 rounded hover:bg-slate-700">Zong Fragger</button>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5"><LayoutGrid size={14}/> Layout Tools</label>
                    <button onClick={addSmartGrid} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <LayoutGrid size={16} /> Add Smart Grid Table
                    </button>
                </div>

                <div className="mb-8">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5"><Plus size={14}/> Add Single Field</label>
                    <div className="grid grid-cols-1 gap-2">
                        {TELEMETRY_VARIABLES.map(v => (
                            <button 
                                key={v.id} 
                                onClick={() => addTextField(v.id)}
                                className="bg-slate-800 border-l-4 border-slate-700 hover:border-indigo-500 text-left p-2.5 px-3 rounded-r-lg text-xs font-bold transition-colors flex items-center justify-between group"
                            >
                                {v.label} <Send size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400"/>
                            </button>
                        ))}
                    </div>
                </div>

                {selectedField && (
                    <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col gap-4">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <Type size={14} /> {selectedField.type === 'grid' ? 'Grid Properties' : 'Field Properties'}
                        </h3>
                        <div className="bg-slate-900 rounded-lg p-3 border border-indigo-500/20 shadow-inner">
                            {selectedField.type === 'grid' ? (
                                <>
                                    <div className="font-bold text-sm text-white mb-4">Smart Variables Grid</div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Rows (Teams)</label>
                                            <input type="number" min="1" max="16" value={selectedField.rows} onChange={e => updateField(selectedField.id, { rows: parseInt(e.target.value) })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Font Size</label>
                                            <input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: parseInt(e.target.value) })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white"/>
                                        </div>
                                    </div>
                                    
                                    {/* Grid Column Manager */}
                                    <div className="mt-4 border-t border-slate-800 pt-3">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Columns Management</label>
                                        <div className="flex flex-col gap-2">
                                            {selectedField.columns.map((col: any, idx: number) => (
                                                <div key={idx} className="flex gap-2 items-center bg-slate-800 p-2 rounded">
                                                    <select 
                                                        value={col.type} 
                                                        onChange={e => {
                                                            const newCols = [...selectedField.columns];
                                                            const preset = GRID_COLUMNS_PRESETS.find(p => p.id === e.target.value);
                                                            newCols[idx] = { ...col, type: e.target.value, label: preset?.label || e.target.value, width: preset?.width || 'flex-1' };
                                                            updateField(selectedField.id, { columns: newCols });
                                                        }}
                                                        className="bg-slate-900 text-[10px] border border-slate-700 rounded p-1 flex-1 text-white"
                                                    >
                                                        {GRID_COLUMNS_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                                    </select>
                                                    <button 
                                                        onClick={() => {
                                                            const newCols = selectedField.columns.filter((_:any, i:number) => i !== idx);
                                                            updateField(selectedField.id, { columns: newCols });
                                                        }}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const newCols = [...selectedField.columns, { id: 'team_name', type: 'team_name', label: 'Team Name', width: 'flex-1', align: 'left' }];
                                                    updateField(selectedField.id, { columns: newCols });
                                                }}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold p-1.5 rounded text-center"
                                            >
                                                + Add Column
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="font-bold text-sm text-white mb-4">{selectedField.label}</div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Prefix Text</label>
                                            <input type="text" value={selectedField.prefix || ''} onChange={e => updateField(selectedField.id, { prefix: e.target.value })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white" placeholder="e.g. #"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Suffix Text</label>
                                            <input type="text" value={selectedField.suffix || ''} onChange={e => updateField(selectedField.id, { suffix: e.target.value })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white" placeholder="e.g. PTS"/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Font Size</label>
                                            <input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: parseInt(e.target.value) })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Color</label>
                                            <input type="color" value={selectedField.color} onChange={e => updateField(selectedField.id, { color: e.target.value })} className="w-full h-7 rounded cursor-pointer bg-slate-800 border border-slate-700 p-0 leading-none" />
                                        </div>
                                    </div>

                                    {/* Icon Controls */}
                                    <div className="flex flex-col gap-2 mb-3 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
                                            <input type="checkbox" checked={selectedField.showIcon || false} onChange={e => updateField(selectedField.id, { showIcon: e.target.checked })} />
                                            Show Icon
                                        </label>
                                        {selectedField.showIcon && (
                                            <>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Icon Path</label>
                                                    <input type="text" value={selectedField.iconPath || ''} onChange={e => updateField(selectedField.id, { iconPath: e.target.value })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white" placeholder="e.g. /assets/icon.png" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}

                             {/* Shared Font Properties */}
                             <div className="flex flex-col gap-1 mb-3 mt-4">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Font Family</label>
                                  <select value={selectedField.fontFamily} onChange={e => updateField(selectedField.id, { fontFamily: e.target.value })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white">
                                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                  </select>
                             </div>
                             
                             {selectedField.type === 'text' && (
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Alignment (Anchor)</label>
                                    <select value={selectedField.align} onChange={e => updateField(selectedField.id, { align: e.target.value })} className="bg-slate-800 w-full p-1.5 rounded border border-slate-700 text-xs text-white">
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                             )}

                             <button onClick={() => setFields(p => p.filter(f => f.id !== selectedField.id))} className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded text-xs font-bold border border-red-500/20 transition-colors">
                                 Remove
                             </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Drag & Drop Canvas */}
            <div className="flex-1 overflow-auto bg-[#0f172a] relative flex items-center justify-center p-8 layout-checkerboard" onClick={() => setSelectedFieldId(null)}>
                <style dangerouslySetInnerHTML={{__html: `
                    .layout-checkerboard { background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b); background-size: 20px 20px; background-position: 0 0, 10px 10px; }
                `}}/>

                {/* THE 1920x1080 RENDER TARGET */}
                <div 
                    className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex-shrink-0 bg-transparent"
                    style={{ width: '1920px', height: '1080px', transform: 'scale(0.8)', transformOrigin: 'center' }}
                >
                    {bgImage && <img src={bgImage} className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 pointer-events-none" alt="Background" />}
                    
                    {fields.map(f => {
                        if (f.type === 'grid') {
                            return (
                                <Rnd
                                    key={f.id}
                                    position={{ x: f.x, y: f.y }}
                                    size={{ width: f.width, height: f.height }}
                                    onDragStop={(e, d) => updateField(f.id, { x: Math.round(d.x), y: Math.round(d.y) })}
                                    onResizeStop={(e, dir, ref, delta, pos) => updateField(f.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), x: Math.round(pos.x), y: Math.round(pos.y) })}
                                    className={`z-20 cursor-move border-2 border-dashed ${selectedFieldId === f.id ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-white/20 hover:border-white/50'}`}
                                    onMouseDown={(e:any) => { e.stopPropagation(); setSelectedFieldId(f.id); }}
                                    bounds="parent"
                                >
                                    <div 
                                        style={{ fontFamily: f.fontFamily, fontSize: `${f.fontSize}px`, color: f.color }}
                                        className="w-full h-full flex flex-col justify-between"
                                    >
                                        {Array.from({length: f.rows}).map((_, rIdx) => (
                                            <div key={rIdx} className="w-full flex items-center border border-emerald-500/10 bg-black/20">
                                                {f.columns.map((col: any, cIdx: number) => (
                                                    <div key={cIdx} className={`${col.width} flex ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'} px-2 overflow-hidden whitespace-nowrap`}>
                                                        {col.type === 'rank' ? `#${rIdx+1}` : col.type === 'logo' ? '🖼️' : `${col.label} ${rIdx+1}`}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl shadow-lg uppercase tracking-wider">Smart Grid</div>
                                </Rnd>
                            );
                        }

                        // Text fields Original Code
                        return (
                            <Rnd
                                key={f.id}
                                position={{ x: f.x, y: f.y }}
                                onDragStop={(e, d) => updateField(f.id, { x: Math.round(d.x), y: Math.round(d.y) })}
                                enableResizing={false}
                                className={`z-20 cursor-move border border-dashed ${selectedFieldId === f.id ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'border-white/20 hover:border-white/50'}`}
                                onMouseDown={(e:any) => { e.stopPropagation(); setSelectedFieldId(f.id); }}
                                bounds="parent"
                            >
                                <div 
                                    style={{
                                        fontFamily: f.fontFamily,
                                        fontSize: `${f.fontSize}px`,
                                        color: f.color,
                                        fontWeight: f.fontWeight,
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: `${f.iconGap || 16}px`,
                                        transform: f.align === 'center' ? 'translateX(-50%)' : f.align === 'right' ? 'translateX(-100%)' : 'none'
                                    }}
                                >
                                    {f.showIcon && f.iconPath && (
                                        <img src={f.iconPath} style={{ width: `${f.iconSize || 48}px`, height: `${f.iconSize || 48}px`, objectFit: 'contain' }} alt="icon" draggable={false} />
                                    )}
                                    <span>{f.prefix || ''}[{f.label}]{f.suffix || ''}</span>
                                </div>
                            </Rnd>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Monitor(props:any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
}
