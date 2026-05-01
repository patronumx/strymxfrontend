"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { designPresets } from '@/components/ThemeCustomizerPanel';
import {
    Monitor, RefreshCcw, Maximize, ChevronDown, Check, Copy,
    Trophy, Crosshair, Target, Star, Crown, Swords, IdCard, ClipboardList,
    Palette, Sparkles, Zap, PanelRightOpen, PanelRightClose,
    Type, Users, Table, Paintbrush, Play, RotateCcw, Radio,
    ChevronRight, Columns, Eye, Sliders, User, Image,
    Save, FolderOpen, Trash2, Layers, Pencil, X, Bomb
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import {
    useOverlayConfig,
    type RankingsConfig, type MatchSummaryConfig, type FraggersConfig,
    type TopFraggerConfig, type OverallMvpConfig, type HeadToHeadConfig, type WwcdConfig,
    type LiveRankingsConfig, type SavedPreset,
} from '@/context/OverlayConfigContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

// ── Constants ───────────────────────────────────────────────────

const PREVIEW_OPTIONS = [
    { label: 'Match Summary',  value: '/overlay/match-summary',          icon: ClipboardList, type: 'match-summary' },
    { label: 'Rankings',       value: '/overlay/match-rankings',          icon: Trophy,        type: 'match-rankings' },
    { label: 'Match Fraggers', value: '/overlay/match-fraggers',          icon: Crosshair,     type: 'match-fraggers' },
    { label: 'Top Fragger',    value: '/overlay/match-top-fragger',       icon: Target,        type: 'match-top-fragger' },
    { label: 'Overall MVP',    value: '/overlay/overall-mvp',             icon: Star,          type: 'overall-mvp' },
    { label: 'WWCD Stats',     value: '/overlay/wwcd-stats',              icon: Crown,         type: 'wwcd-stats' },
    { label: 'Head to Head',   value: '/overlay/head-to-head',            icon: Swords,        type: 'head-to-head' },
    { label: 'Live Rankings',  value: '/overlay/live-rankings',           icon: Radio,         type: 'live-rankings' },
    { label: 'Grenade Kill',   value: '/overlays/grenade-kill',           icon: Bomb,          type: 'grenade-kill' },
    { label: 'Vehicle Kill',   value: '/overlays/vehicle-kill',           icon: Bomb,          type: 'vehicle-kill' },
    { label: 'Drop Looted',    value: '/overlays/drop-looted',            icon: Bomb,          type: 'drop-looted' },
    { label: 'Domination',     value: '/overlays/player-domination',      icon: Bomb,          type: 'player-domination' },
    { label: 'First Blood',    value: '/overlays/first-blood',            icon: Bomb,          type: 'first-blood' },
    { label: 'Recall',         value: '/overlays/recall',                 icon: Bomb,          type: 'recall' },
    { label: 'Team Elim',      value: '/overlays/team-eliminated',        icon: Bomb,          type: 'team-eliminated' },
    { label: 'Domination',     value: '/overlays/team-domination',        icon: Bomb,          type: 'team-domination' },
    { label: 'Overall Standings', value: '/overlays/overall-standings', icon: ClipboardList, type: 'overall-standings' },
    { label: 'Road to MVP', value: '/overlays/road-to-mvp', icon: Zap, type: 'road-to-mvp' },
];

const COLOR_PICKERS = [
    { id: 'primary',       label: 'Primary',     highlight: true },
    { id: 'secondary',     label: 'Secondary',   highlight: true },
    { id: 'accent',        label: 'Accent',      highlight: true },
    { id: 'headerBg',      label: 'Header BG',   highlight: false },
    { id: 'headerText',    label: 'Header Text', highlight: false },
    { id: 'cardBg',        label: 'Card BG',     highlight: false },
    { id: 'cardBorder',    label: 'Border',      highlight: false },
    { id: 'cardText',      label: 'Card Text',   highlight: false },
    { id: 'gradientStart', label: 'Grad Start',  highlight: false },
    { id: 'gradientEnd',   label: 'Grad End',    highlight: false },
];

// ── Reusable Control Components ─────────────────────────────────

function SectionHeader({ icon: Icon, label, iconColor }: { icon: any; label: string; iconColor?: string }) {
    return (
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
            <Icon size={9} className={iconColor} /> {label}
        </p>
    );
}

function ToggleRow({ label, value, onChange, color }: { label: string; value: boolean; onChange: (v: boolean) => void; color?: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div
                className="relative w-9 h-[20px] rounded-full transition-all cursor-pointer shrink-0"
                style={{
                    backgroundColor: value ? (color || '#10b981') : '#1e293b',
                    boxShadow: value ? `0 0 10px ${color || '#10b981'}40` : 'inset 0 1px 2px rgba(0,0,0,0.3)',
                }}
                onClick={() => onChange(!value)}
            >
                <motion.div
                    layout
                    className="absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-md"
                    style={{ left: value ? 'calc(100% - 17px)' : '3px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </div>
        </div>
    );
}

function SliderRow({ label, value, min, max, step, onChange, suffix }: {
    label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                <span className="text-[9px] font-mono text-slate-500">{value}{suffix}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
        </div>
    );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <input
                type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-3 py-1.5 text-[10px] font-bold text-white bg-slate-900/80 border border-white/8 rounded-lg focus:outline-none focus:border-white/20 transition-colors placeholder:text-slate-600"
            />
        </div>
    );
}

// Ensure color value is valid #rrggbb for <input type="color">
function toHex6(val: string): string {
    if (!val || val === 'transparent') return '#000000';
    const v = val.startsWith('#') ? val.slice(1) : val;
    if (v.length === 8) return '#' + v.slice(0, 6); // strip alpha
    if (v.length === 6) return '#' + v;
    if (v.length === 3) return '#' + v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    return '#000000';
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const safeValue = toHex6(value);
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-slate-500">{safeValue.toUpperCase()}</span>
                <div className="relative w-6 h-6 rounded-lg border border-white/10 cursor-pointer overflow-hidden" style={{ backgroundColor: value }}>
                    <input type="color" value={safeValue} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
            </div>
        </div>
    );
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex gap-1">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all',
                            value === opt.value
                                ? 'bg-white/10 text-white border border-white/15'
                                : 'bg-slate-900/50 text-slate-500 border border-white/5 hover:bg-white/5 hover:text-slate-400'
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }: {
    title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-white/5 last:border-0">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/3 transition-colors">
                <Icon size={11} className="text-slate-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex-1 text-left">{title}</span>
                <ChevronRight size={11} className={cn('text-slate-600 transition-transform', open && 'rotate-90')} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 flex flex-col gap-3">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Overlay-Specific Panels ─────────────────────────────────────

function RankingsPanel({ config, onChange }: { config: RankingsConfig; onChange: (update: Partial<RankingsConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Header" icon={Type}>
                <TextInput label="Title" value={config.headerTitle} onChange={v => onChange({ headerTitle: v })} />
                <TextInput label="Subtitle" value={config.headerSubtitle} onChange={v => onChange({ headerSubtitle: v })} />
                <SliderRow label="Title Size" value={config.headerTitleSize} min={50} max={120} step={5} onChange={v => onChange({ headerTitleSize: v })} suffix="px" />
            </CollapsibleSection>

            <CollapsibleSection title="Top Team Showcase" icon={Users}>
                <ToggleRow label="Show Showcase" value={config.showTopTeamShowcase} onChange={v => onChange({ showTopTeamShowcase: v })} />
                <ToggleRow label="Player Portraits" value={config.showPlayerPortraits} onChange={v => onChange({ showPlayerPortraits: v })} />
                {config.showPlayerPortraits && (
                    <SliderRow label="Portrait Count" value={config.playerPortraitCount} min={1} max={6} step={1} onChange={v => onChange({ playerPortraitCount: v })} />
                )}
            </CollapsibleSection>

            <CollapsibleSection title="Standings Table" icon={Table}>
                <SliderRow label="Teams Shown" value={config.teamsShown} min={4} max={16} step={1} onChange={v => onChange({ teamsShown: v })} />
                <ToggleRow label="Place Column" value={config.showPlaceColumn} onChange={v => onChange({ showPlaceColumn: v })} />
                <ToggleRow label="Elims Column" value={config.showElimsColumn} onChange={v => onChange({ showElimsColumn: v })} />
                <ToggleRow label="Total Column" value={config.showTotalColumn} onChange={v => onChange({ showTotalColumn: v })} />
                <ToggleRow label="Skewed Total" value={config.showSkewedTotal} onChange={v => onChange({ showSkewedTotal: v })} />
            </CollapsibleSection>

            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Table Header" value={config.tableHeaderColor} onChange={v => onChange({ tableHeaderColor: v })} />
                <ColorInput label="Rank Badge" value={config.rankBadgeColor} onChange={v => onChange({ rankBadgeColor: v })} />
                <ColorInput label="Total Badge" value={config.totalBadgeColor} onChange={v => onChange({ totalBadgeColor: v })} />
                <ColorInput label="Card Background" value={config.cardBgColor} onChange={v => onChange({ cardBgColor: v })} />
                <ColorInput label="Card Border" value={config.cardBorderColor} onChange={v => onChange({ cardBorderColor: v })} />
                <ColorInput label="Team Name" value={config.teamNameColor} onChange={v => onChange({ teamNameColor: v })} />
                <ColorInput label="Header Background" value={config.headerBgColor} onChange={v => onChange({ headerBgColor: v })} />
                <ColorInput label="Header Text" value={config.headerTextColor} onChange={v => onChange({ headerTextColor: v })} />
                <ColorInput label="Row Even" value={config.rowEvenColor} onChange={v => onChange({ rowEvenColor: v })} />
                <ColorInput label="Row Odd" value={config.rowOddColor} onChange={v => onChange({ rowOddColor: v })} />
            </CollapsibleSection>

            <CollapsibleSection title="Appearance" icon={Columns} defaultOpen={false}>
                <SliderRow label="Corner Radius" value={config.cornerRadius} min={0} max={30} step={2} onChange={v => onChange({ cornerRadius: v })} suffix="px" />
            </CollapsibleSection>

            <CollapsibleSection title="Animation" icon={Play} defaultOpen={false}>
                <SelectRow
                    label="Speed"
                    value={config.animationSpeed}
                    options={[
                        { label: 'None', value: 'none' },
                        { label: 'Fast', value: 'fast' },
                        { label: 'Normal', value: 'normal' },
                        { label: 'Slow', value: 'slow' },
                    ]}
                    onChange={v => onChange({ animationSpeed: v as any })}
                />
                <SliderRow label="Stagger" value={config.staggerDelay} min={0} max={0.3} step={0.02} onChange={v => onChange({ staggerDelay: v })} suffix="s" />
            </CollapsibleSection>
        </>
    );
}

function MatchSummaryPanel({ config, onChange }: { config: MatchSummaryConfig; onChange: (update: Partial<MatchSummaryConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Header" icon={Type}>
                <TextInput label="Title" value={config.headerTitle} onChange={v => onChange({ headerTitle: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Visible Stats" icon={Eye}>
                <ToggleRow label="Total Kills" value={config.showTotalKills} onChange={v => onChange({ showTotalKills: v })} />
                <ToggleRow label="Total Knocks" value={config.showTotalKnocks} onChange={v => onChange({ showTotalKnocks: v })} />
                <ToggleRow label="Headshots" value={config.showHeadshots} onChange={v => onChange({ showHeadshots: v })} />
                <ToggleRow label="Smokes & Nades" value={config.showSmokesNades} onChange={v => onChange({ showSmokesNades: v })} />
                <ToggleRow label="Vehicle Kills" value={config.showVehicleKills} onChange={v => onChange({ showVehicleKills: v })} />
                <ToggleRow label="Grenade Kills" value={config.showGrenadeKills} onChange={v => onChange({ showGrenadeKills: v })} />
                <ToggleRow label="Airdrops" value={config.showAirdrops} onChange={v => onChange({ showAirdrops: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Card Background" value={config.cardBgColor} onChange={v => onChange({ cardBgColor: v })} />
                <ColorInput label="Card Border" value={config.cardBorderColor} onChange={v => onChange({ cardBorderColor: v })} />
                <ColorInput label="Header Background" value={config.headerBgColor} onChange={v => onChange({ headerBgColor: v })} />
                <ColorInput label="Header Text" value={config.headerTextColor} onChange={v => onChange({ headerTextColor: v })} />
                <ColorInput label="Stat Label" value={config.statLabelColor} onChange={v => onChange({ statLabelColor: v })} />
                <ColorInput label="Stat Value" value={config.statValueColor} onChange={v => onChange({ statValueColor: v })} />
                <ColorInput label="Icon Color" value={config.iconColor} onChange={v => onChange({ iconColor: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Appearance" icon={Sliders} defaultOpen={false}>
                <SliderRow label="Card Width" value={config.cardWidth} min={200} max={500} step={10} onChange={v => onChange({ cardWidth: v })} suffix="px" />
                <ToggleRow label="Skewed Clip Path" value={config.cardClipPath} onChange={v => onChange({ cardClipPath: v })} />
                <SliderRow label="Value Padding" value={config.valuePadding} min={1} max={5} step={1} onChange={v => onChange({ valuePadding: v })} />
            </CollapsibleSection>
        </>
    );
}

function FraggersPanel({ config, onChange }: { config: FraggersConfig; onChange: (update: Partial<FraggersConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Design Style" icon={Palette}>
                <div className="flex gap-2">
                    {[
                        { id: 'classic' as const, label: 'Row List', desc: 'Horizontal rows' },
                        { id: 'cards' as const, label: 'Card Grid', desc: 'Vertical cards' },
                    ].map(d => (
                        <button
                            key={d.id}
                            onClick={() => onChange({ designStyle: d.id })}
                            className={cn(
                                'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center',
                                config.designStyle === d.id
                                    ? 'bg-white/8 border-white/20 ring-1 ring-white/10'
                                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40'
                            )}
                        >
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">{d.label}</span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">{d.desc}</span>
                        </button>
                    ))}
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Header" icon={Type}>
                <ToggleRow label="Show Header" value={config.showHeader} onChange={v => onChange({ showHeader: v })} />
                <TextInput label="Title" value={config.headerTitle} onChange={v => onChange({ headerTitle: v })} />
                <TextInput label="Subtitle" value={config.headerSubtitle} onChange={v => onChange({ headerSubtitle: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Content" icon={Users}>
                <SliderRow label="Player Count" value={config.playerCount} min={1} max={10} step={1} onChange={v => onChange({ playerCount: v })} />
                <ToggleRow label="Damage" value={config.showDamage} onChange={v => onChange({ showDamage: v })} />
                <ToggleRow label="Eliminations" value={config.showElims} onChange={v => onChange({ showElims: v })} />
                <ToggleRow label="Knocks" value={config.showKnocks} onChange={v => onChange({ showKnocks: v })} />
                <ToggleRow label="Survival Time" value={config.showSurvival} onChange={v => onChange({ showSurvival: v })} />
                <ToggleRow label="Player Portrait" value={config.showPlayerPortrait} onChange={v => onChange({ showPlayerPortrait: v })} />
                <ToggleRow label="Team Name" value={config.showTeamName} onChange={v => onChange({ showTeamName: v })} />
                <ToggleRow label="Rank Badge" value={config.showRankBadge} onChange={v => onChange({ showRankBadge: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Card Background" value={config.cardBgColor} onChange={v => onChange({ cardBgColor: v })} />
                <ColorInput label="Card Border" value={config.cardBorderColor} onChange={v => onChange({ cardBorderColor: v })} />
                <ColorInput label="Rank Text" value={config.rankTextColor} onChange={v => onChange({ rankTextColor: v })} />
                <ColorInput label="Player Name" value={config.playerNameColor} onChange={v => onChange({ playerNameColor: v })} />
                <ColorInput label="Team Name" value={config.teamNameColor} onChange={v => onChange({ teamNameColor: v })} />
                <ColorInput label="Stat Labels" value={config.statLabelColor} onChange={v => onChange({ statLabelColor: v })} />
                <ColorInput label="Stat Area BG" value={config.statBgColor} onChange={v => onChange({ statBgColor: v })} />
                <ColorInput label="Elims Value" value={config.elimsColor || '#a3e635'} onChange={v => onChange({ elimsColor: v })} />
                <ColorInput label="Damage Value" value={config.damageColor || '#10b981'} onChange={v => onChange({ damageColor: v })} />
                <ColorInput label="Survival Value" value={config.survivalColor} onChange={v => onChange({ survivalColor: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Appearance" icon={Sliders} defaultOpen={false}>
                <SliderRow label="Card Height" value={config.cardHeight} min={100} max={250} step={10} onChange={v => onChange({ cardHeight: v })} suffix="px" />
                <SliderRow label="Corner Radius" value={config.cardCornerRadius} min={0} max={40} step={2} onChange={v => onChange({ cardCornerRadius: v })} suffix="px" />
                <SliderRow label="Card Gap" value={config.cardGap} min={4} max={40} step={2} onChange={v => onChange({ cardGap: v })} suffix="px" />
            </CollapsibleSection>
        </>
    );
}

function TopFraggerPanel({ config, onChange }: { config: TopFraggerConfig; onChange: (update: Partial<TopFraggerConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Header" icon={Type}>
                <ToggleRow label="Show Header" value={config.showHeader} onChange={v => onChange({ showHeader: v })} />
                <TextInput label="Title" value={config.headerTitle} onChange={v => onChange({ headerTitle: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Stats" icon={Eye}>
                <ToggleRow label="Eliminations" value={config.showEliminations} onChange={v => onChange({ showEliminations: v })} />
                <ToggleRow label="Damage" value={config.showDamage} onChange={v => onChange({ showDamage: v })} />
                <ToggleRow label="Survival Time" value={config.showSurvival} onChange={v => onChange({ showSurvival: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Layout" icon={Columns}>
                <ToggleRow label="Player Portrait" value={config.showPlayerPortrait} onChange={v => onChange({ showPlayerPortrait: v })} />
                <ToggleRow label="Team Logo" value={config.showTeamLogo} onChange={v => onChange({ showTeamLogo: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Card Background" value={config.cardBgColor} onChange={v => onChange({ cardBgColor: v })} />
                <ColorInput label="Card Border" value={config.cardBorderColor} onChange={v => onChange({ cardBorderColor: v })} />
                <ColorInput label="Player Name" value={config.playerNameColor} onChange={v => onChange({ playerNameColor: v })} />
                <ColorInput label="Team Name" value={config.teamNameColor} onChange={v => onChange({ teamNameColor: v })} />
                <ColorInput label="Stat Labels" value={config.statLabelColor} onChange={v => onChange({ statLabelColor: v })} />
                <ColorInput label="Elims Value" value={config.elimsColor || '#a3e635'} onChange={v => onChange({ elimsColor: v })} />
                <ColorInput label="Damage Value" value={config.damageColor || '#10b981'} onChange={v => onChange({ damageColor: v })} />
                <ColorInput label="Survival Value" value={config.survivalColor} onChange={v => onChange({ survivalColor: v })} />
                <ColorInput label="Header BG" value={config.headerBgColor} onChange={v => onChange({ headerBgColor: v })} />
                <ColorInput label="Header Text" value={config.headerTextColor} onChange={v => onChange({ headerTextColor: v })} />
            </CollapsibleSection>
        </>
    );
}

function OverallMvpPanel({ config, onChange }: { config: OverallMvpConfig; onChange: (update: Partial<OverallMvpConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Design Style" icon={Palette}>
                <div className="flex gap-2">
                    {[
                        { id: 'classic' as const, label: 'Row List', desc: 'Horizontal rows' },
                        { id: 'cards' as const, label: 'Card Grid', desc: 'Vertical cards' },
                    ].map(d => (
                        <button
                            key={d.id}
                            onClick={() => onChange({ designStyle: d.id })}
                            className={cn(
                                'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center',
                                config.designStyle === d.id
                                    ? 'bg-white/8 border-white/20 ring-1 ring-white/10'
                                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40'
                            )}
                        >
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">{d.label}</span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">{d.desc}</span>
                        </button>
                    ))}
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Header" icon={Type}>
                <ToggleRow label="Show Header" value={config.showHeader} onChange={v => onChange({ showHeader: v })} />
                <TextInput label="Title" value={config.headerTitle} onChange={v => onChange({ headerTitle: v })} />
                <TextInput label="Subtitle" value={config.headerSubtitle} onChange={v => onChange({ headerSubtitle: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Content" icon={Users}>
                <SliderRow label="Player Count" value={config.playerCount} min={1} max={10} step={1} onChange={v => onChange({ playerCount: v })} />
                <ToggleRow label="Eliminations" value={config.showElims} onChange={v => onChange({ showElims: v })} />
                <ToggleRow label="Damage" value={config.showDamage} onChange={v => onChange({ showDamage: v })} />
                <ToggleRow label="Knocks" value={config.showKnocks} onChange={v => onChange({ showKnocks: v })} />
                <ToggleRow label="Player Portrait" value={config.showPlayerPortrait} onChange={v => onChange({ showPlayerPortrait: v })} />
                <ToggleRow label="Team Logo" value={config.showTeamLogo} onChange={v => onChange({ showTeamLogo: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Card Background" value={config.cardBgColor} onChange={v => onChange({ cardBgColor: v })} />
                <ColorInput label="Card Border" value={config.cardBorderColor} onChange={v => onChange({ cardBorderColor: v })} />
                <ColorInput label="Player Name" value={config.playerNameColor} onChange={v => onChange({ playerNameColor: v })} />
                <ColorInput label="Team Name" value={config.teamNameColor} onChange={v => onChange({ teamNameColor: v })} />
                <ColorInput label="Rank Badge" value={config.rankBadgeColor} onChange={v => onChange({ rankBadgeColor: v })} />
                <ColorInput label="Stat Labels" value={config.statLabelColor} onChange={v => onChange({ statLabelColor: v })} />
                <ColorInput label="Elims Value" value={config.elimsColor || '#a3e635'} onChange={v => onChange({ elimsColor: v })} />
                <ColorInput label="Damage Value" value={config.damageColor || '#10b981'} onChange={v => onChange({ damageColor: v })} />
                <ColorInput label="Header BG" value={config.headerBgColor} onChange={v => onChange({ headerBgColor: v })} />
                <ColorInput label="Header Text" value={config.headerTextColor} onChange={v => onChange({ headerTextColor: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Appearance" icon={Sliders} defaultOpen={false}>
                <SliderRow label="Card Height" value={config.cardHeight} min={80} max={200} step={8} onChange={v => onChange({ cardHeight: v })} suffix="px" />
                <SliderRow label="Card Gap" value={config.cardGap} min={4} max={32} step={2} onChange={v => onChange({ cardGap: v })} suffix="px" />
            </CollapsibleSection>
        </>
    );
}

function HeadToHeadPanel({ config, onChange }: { config: HeadToHeadConfig; onChange: (update: Partial<HeadToHeadConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Design Style" icon={Palette}>
                <div className="flex gap-2">
                    {[
                        { id: 'classic' as const, label: 'Classic', desc: 'Stats side by side' },
                        { id: 'radar' as const, label: 'Radar', desc: 'Pentagon chart' },
                    ].map(d => (
                        <button
                            key={d.id}
                            onClick={() => onChange({ designStyle: d.id })}
                            className={cn(
                                'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center',
                                config.designStyle === d.id
                                    ? 'bg-white/8 border-white/20 ring-1 ring-white/10'
                                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40'
                            )}
                        >
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">{d.label}</span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">{d.desc}</span>
                        </button>
                    ))}
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Header" icon={Type}>
                <ToggleRow label="Show Header" value={config.showHeader} onChange={v => onChange({ showHeader: v })} />
                <TextInput label="Subtitle" value={config.headerSubtitle} onChange={v => onChange({ headerSubtitle: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Metrics" icon={Eye}>
                <ToggleRow label="Eliminations" value={config.showEliminations} onChange={v => onChange({ showEliminations: v })} />
                <ToggleRow label="Damage" value={config.showDamage} onChange={v => onChange({ showDamage: v })} />
                <ToggleRow label="Headshots" value={config.showHeadshots} onChange={v => onChange({ showHeadshots: v })} />
                <ToggleRow label="Survival Time" value={config.showSurvival} onChange={v => onChange({ showSurvival: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Layout" icon={Columns}>
                <ToggleRow label="VS Badge" value={config.showVsBadge} onChange={v => onChange({ showVsBadge: v })} />
                <ToggleRow label="Player Portrait" value={config.showPlayerPortrait} onChange={v => onChange({ showPlayerPortrait: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Card Background" value={config.cardBgColor} onChange={v => onChange({ cardBgColor: v })} />
                <ColorInput label="Card Border" value={config.cardBorderColor} onChange={v => onChange({ cardBorderColor: v })} />
                <ColorInput label="Player Name" value={config.playerNameColor} onChange={v => onChange({ playerNameColor: v })} />
                <ColorInput label="Team Name" value={config.teamNameColor} onChange={v => onChange({ teamNameColor: v })} />
                <ColorInput label="VS Badge" value={config.vsBadgeColor} onChange={v => onChange({ vsBadgeColor: v })} />
                <ColorInput label="Stat Labels" value={config.statLabelColor} onChange={v => onChange({ statLabelColor: v })} />
                <ColorInput label="Stat Values" value={config.statValueColor} onChange={v => onChange({ statValueColor: v })} />
                <ColorInput label="Header BG" value={config.headerBgColor} onChange={v => onChange({ headerBgColor: v })} />
                <ColorInput label="Header Text" value={config.headerTextColor} onChange={v => onChange({ headerTextColor: v })} />
            </CollapsibleSection>
        </>
    );
}

function WwcdPanel({ config, onChange }: { config: WwcdConfig; onChange: (update: Partial<WwcdConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Header" icon={Type}>
                <ToggleRow label="Show Header" value={config.showHeader} onChange={v => onChange({ showHeader: v })} />
                <TextInput label="Title" value={config.headerTitle} onChange={v => onChange({ headerTitle: v })} />
                <TextInput label="Subtitle" value={config.headerSubtitle} onChange={v => onChange({ headerSubtitle: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Content" icon={Users}>
                <SliderRow label="Player Count" value={config.playerCount} min={1} max={6} step={1} onChange={v => onChange({ playerCount: v })} />
                <ToggleRow label="Eliminations" value={config.showElims} onChange={v => onChange({ showElims: v })} />
                <ToggleRow label="Damage" value={config.showDamage} onChange={v => onChange({ showDamage: v })} />
                <ToggleRow label="Survival Time" value={config.showSurvival} onChange={v => onChange({ showSurvival: v })} />
                <ToggleRow label="Player Portrait" value={config.showPlayerPortrait} onChange={v => onChange({ showPlayerPortrait: v })} />
                <ToggleRow label="Team Logo" value={config.showTeamLogo} onChange={v => onChange({ showTeamLogo: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Card Background" value={config.cardBgColor} onChange={v => onChange({ cardBgColor: v })} />
                <ColorInput label="Card Border" value={config.cardBorderColor} onChange={v => onChange({ cardBorderColor: v })} />
                <ColorInput label="Player Name" value={config.playerNameColor} onChange={v => onChange({ playerNameColor: v })} />
                <ColorInput label="Team Name" value={config.teamNameColor} onChange={v => onChange({ teamNameColor: v })} />
                <ColorInput label="Stat Labels" value={config.statLabelColor} onChange={v => onChange({ statLabelColor: v })} />
                <ColorInput label="Elims Value" value={config.elimsColor || '#a3e635'} onChange={v => onChange({ elimsColor: v })} />
                <ColorInput label="Damage Value" value={config.damageColor || '#10b981'} onChange={v => onChange({ damageColor: v })} />
                <ColorInput label="Survival Value" value={config.survivalColor} onChange={v => onChange({ survivalColor: v })} />
                <ColorInput label="Header BG" value={config.headerBgColor} onChange={v => onChange({ headerBgColor: v })} />
                <ColorInput label="Header Text" value={config.headerTextColor} onChange={v => onChange({ headerTextColor: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Effects" icon={Sparkles} defaultOpen={false}>
                <ToggleRow label="Particles" value={config.showParticles} onChange={v => onChange({ showParticles: v })} />
            </CollapsibleSection>
        </>
    );
}

function LiveRankingsPanel({ config, onChange }: { config: LiveRankingsConfig; onChange: (update: Partial<LiveRankingsConfig>) => void }) {
    return (
        <>
            <CollapsibleSection title="Header" icon={Type}>
                <TextInput label="Header Label" value={config.headerLabel} onChange={v => onChange({ headerLabel: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Layout" icon={Columns}>
                <ToggleRow label="Health Bars" value={config.showHealthBars} onChange={v => onChange({ showHealthBars: v })} />
                <ToggleRow label="Legend" value={config.showLegend} onChange={v => onChange({ showLegend: v })} />
                <ToggleRow label="Country Flags" value={config.showFlags} onChange={v => onChange({ showFlags: v })} />
                <ToggleRow label="Team Logos" value={config.showLogos} onChange={v => onChange({ showLogos: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Content" icon={Users}>
                <SliderRow label="Teams Shown" value={config.teamsShown} min={4} max={20} step={1} onChange={v => onChange({ teamsShown: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <ColorInput label="Header Gradient Start" value={config.headerBgStart} onChange={v => onChange({ headerBgStart: v })} />
                <ColorInput label="Header Gradient End" value={config.headerBgEnd} onChange={v => onChange({ headerBgEnd: v })} />
                <ColorInput label="Team Background" value={config.teamBgColor} onChange={v => onChange({ teamBgColor: v })} />
                <ColorInput label="Stats Background" value={config.statsBgColor} onChange={v => onChange({ statsBgColor: v })} />
                <ColorInput label="Legend Background" value={config.legendBgColor} onChange={v => onChange({ legendBgColor: v })} />
                <ColorInput label="Bottom Border" value={config.borderBottomColor} onChange={v => onChange({ borderBottomColor: v })} />
                <ColorInput label="Rank Text" value={config.rankTextColor} onChange={v => onChange({ rankTextColor: v })} />
                <ColorInput label="Team Name" value={config.teamNameColor} onChange={v => onChange({ teamNameColor: v })} />
                <ColorInput label="Points" value={config.pointsColor} onChange={v => onChange({ pointsColor: v })} />
                <ColorInput label="Elims" value={config.elimsColor} onChange={v => onChange({ elimsColor: v })} />
            </CollapsibleSection>
        </>
    );
}

// ── Elimination Overlay Panel (shared by all 5 event-triggered overlays) ──

function EliminationOverlayPanel({ overlayType, theme, updateTheme }: {
    overlayType: string;
    theme: any;
    updateTheme: (t: any) => void;
}) {
    return (
        <>
            <CollapsibleSection title="Element Colors" icon={Paintbrush}>
                <div className="text-[8px] text-slate-600 font-bold uppercase tracking-wider mb-1">
                    These colors map directly to the overlay elements below
                </div>
                <ColorInput label="Title Text (GRENADE etc.)" value={theme.primary} onChange={v => updateTheme({ primary: v })} />
                <ColorInput label="Background Panel" value={theme.secondary} onChange={v => updateTheme({ secondary: v })} />
                <ColorInput label="Name Bar / Accents" value={theme.accent || theme.primary} onChange={v => updateTheme({ accent: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Card & Header" icon={Paintbrush}>
                <ColorInput label="Header BG" value={theme.headerBg} onChange={v => updateTheme({ headerBg: v })} />
                <ColorInput label="Header Text" value={theme.headerText} onChange={v => updateTheme({ headerText: v })} />
                <ColorInput label="Card BG" value={theme.cardBg} onChange={v => updateTheme({ cardBg: v })} />
                <ColorInput label="Card Border" value={theme.cardBorder} onChange={v => updateTheme({ cardBorder: v })} />
                <ColorInput label="Card Text" value={theme.cardText} onChange={v => updateTheme({ cardText: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Gradients" icon={Sparkles}>
                <ColorInput label="Gradient Start" value={theme.gradientStart} onChange={v => updateTheme({ gradientStart: v })} />
                <ColorInput label="Gradient End" value={theme.gradientEnd} onChange={v => updateTheme({ gradientEnd: v })} />
            </CollapsibleSection>
            <CollapsibleSection title="Effects" icon={Sliders}>
                <ToggleRow label="Glow FX" value={theme.glowEnabled} onChange={v => updateTheme({ glowEnabled: v })} color="#10b981" />
                <ToggleRow label="Glassmorphism" value={theme.glassmorphism} onChange={v => updateTheme({ glassmorphism: v })} color="#3b82f6" />
            </CollapsibleSection>
        </>
    );
}

// ── Main Studio ─────────────────────────────────────────────────

function StudioContent() {
    const { theme, updateTheme } = useTheme();
    const { configs, updateConfig, resetConfig, batchUpdateColors, applyColorsToAll, savedPresets, savePreset, loadPreset, deletePreset, renamePreset } = useOverlayConfig();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type');

    const initialOption = typeParam ? PREVIEW_OPTIONS.find(o => o.type === typeParam) : null;
    const [previewUrl, setPreviewUrl] = useState(initialOption?.value || PREVIEW_OPTIONS[0].value);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState('signature-design');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownBtnRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // Preset save/load state
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [showPresetsPanel, setShowPresetsPanel] = useState(false);
    const [appliedToAll, setAppliedToAll] = useState(false);
    const [presetSaved, setPresetSaved] = useState(false);
    const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
    const [editingPresetName, setEditingPresetName] = useState('');

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                dropdownRef.current && !dropdownRef.current.contains(target) &&
                dropdownBtnRef.current && !dropdownBtnRef.current.contains(target)
            ) {
                setIsDropdownOpen(false);
            }
        };
        // Close dropdown on outside scroll (not when scrolling inside the dropdown itself)
        const scrollHandler = (e: Event) => {
            if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
            setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        window.addEventListener('scroll', scrollHandler, true);
        return () => {
            document.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', scrollHandler, true);
        };
    }, []);

    const selectedOption = PREVIEW_OPTIONS.find(o => o.value === previewUrl) || PREVIEW_OPTIONS[0];
    const iframeSrc = `${previewUrl}?transparent=true`;

    // Determine which overlay type is active for config panel
    const activeOverlayType = selectedOption.type;

    // Send theme + config to iframe after it loads and on every change
    const themeRef = useRef(theme);
    const configsRef = useRef(configs);
    const activeTypeRef = useRef(activeOverlayType);
    themeRef.current = theme;
    configsRef.current = configs;
    activeTypeRef.current = activeOverlayType;

    const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sendThemeToIframe = useCallback(() => {
        // Debounce to batch rapid updates (e.g. preset changes) into a single message
        if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
        sendTimerRef.current = setTimeout(() => {
            const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
            if (iframe?.contentWindow) {
                // Send theme + config in a single message to avoid intermediate render states
                iframe.contentWindow.postMessage({
                    type: 'strymx_batch_update',
                    theme: themeRef.current,
                    overlayType: activeTypeRef.current,
                    config: (configsRef.current as any)[activeTypeRef.current] || null,
                }, '*');
            }
        }, 16);
    }, []);

    // Push live theme + config updates to the iframe via postMessage
    useEffect(() => {
        sendThemeToIframe();
    }, [theme, configs, activeOverlayType]);

    const handleDesignSelect = (id: string) => {
        const p = designPresets.find(p => p.id === id);
        if (!p) return;

        // 1. Update global theme
        updateTheme(p.themeOverrides);
        setSelectedDesign(id);

        // 2. Push preset overlay colors to ALL overlay configs in one batch (no flickering)
        if (p.overlayColors) {
            const oc = p.overlayColors;

            batchUpdateColors({
                'match-rankings': {
                    cardBgColor: oc.cardBgColor, cardBorderColor: oc.cardBorderColor,
                    teamNameColor: oc.playerNameColor, headerBgColor: oc.headerBgColor,
                    headerTextColor: oc.headerTextColor, tableHeaderColor: oc.tableHeaderColor,
                    rankBadgeColor: oc.rankBadgeColor, totalBadgeColor: oc.totalBadgeColor,
                    rowEvenColor: oc.rowEvenColor, rowOddColor: oc.rowOddColor,
                },
                'match-summary': {
                    cardBgColor: oc.cardBgColor, cardBorderColor: oc.cardBorderColor,
                    headerBgColor: oc.headerBgColor, headerTextColor: oc.headerTextColor,
                    statLabelColor: oc.statLabelColor, statValueColor: oc.statValueColor,
                    iconColor: oc.iconColor,
                },
                'match-fraggers': {
                    cardBgColor: oc.cardBgColor, cardBorderColor: oc.cardBorderColor,
                    rankBgColor: 'transparent', rankTextColor: oc.rankTextColor,
                    playerNameColor: oc.playerNameColor, teamNameColor: oc.teamNameColor,
                    elimsColor: oc.elimsColor, damageColor: oc.damageColor,
                    survivalColor: oc.survivalColor, statLabelColor: oc.statLabelColor,
                    statBgColor: oc.statBgColor,
                },
                'match-top-fragger': {
                    cardBgColor: oc.cardBgColor, cardBorderColor: oc.cardBorderColor,
                    playerNameColor: oc.playerNameColor, teamNameColor: oc.teamNameColor,
                    elimsColor: oc.elimsColor, damageColor: oc.damageColor,
                    survivalColor: oc.survivalColor, statLabelColor: oc.statLabelColor,
                    headerBgColor: oc.headerBgColor, headerTextColor: oc.headerTextColor,
                },
                'overall-mvp': {
                    cardBgColor: oc.cardBgColor, cardBorderColor: oc.cardBorderColor,
                    playerNameColor: oc.playerNameColor, teamNameColor: oc.teamNameColor,
                    elimsColor: oc.elimsColor, damageColor: oc.damageColor,
                    statLabelColor: oc.statLabelColor, headerBgColor: oc.headerBgColor,
                    headerTextColor: oc.headerTextColor, rankBadgeColor: oc.rankBadgeColor,
                },
                'head-to-head': {
                    cardBgColor: oc.cardBgColor, cardBorderColor: oc.cardBorderColor,
                    playerNameColor: oc.playerNameColor, teamNameColor: oc.teamNameColor,
                    vsBadgeColor: oc.vsBadgeColor, statLabelColor: oc.statLabelColor,
                    statValueColor: oc.statValueColor, headerBgColor: oc.headerBgColor,
                    headerTextColor: oc.headerTextColor,
                },
                'wwcd-stats': {
                    cardBgColor: oc.cardBgColor, cardBorderColor: oc.cardBorderColor,
                    playerNameColor: oc.playerNameColor, teamNameColor: oc.teamNameColor,
                    elimsColor: oc.elimsColor, damageColor: oc.damageColor,
                    survivalColor: oc.survivalColor, statLabelColor: oc.statLabelColor,
                    headerBgColor: oc.headerBgColor, headerTextColor: oc.headerTextColor,
                },
                'live-rankings': {
                    headerBgStart: oc.headerBgColor, headerBgEnd: oc.tableHeaderColor,
                    teamNameColor: oc.playerNameColor, rankTextColor: oc.rankTextColor || '#ffffff',
                    pointsColor: oc.statValueColor || '#000000', elimsColor: oc.elimsColor || '#000000',
                    borderBottomColor: oc.tableHeaderColor,
                },
            });
        }
    };

    const handleCopyUrl = () => {
        const fullUrl = `${window.location.origin}${previewUrl}?transparent=true&primary=${theme.primary.replace('#', '')}&secondary=${theme.secondary.replace('#', '')}`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleResetConfig = () => {
        if (activeOverlayType in configs) {
            resetConfig(activeOverlayType as keyof typeof configs);
        }
    };

    const handleSavePreset = () => {
        const name = presetName.trim();
        if (!name) return;
        savePreset(name, { ...theme });
        setPresetName('');
        setShowSaveDialog(false);
        setPresetSaved(true);
        setTimeout(() => setPresetSaved(false), 2000);
    };

    const handleLoadPreset = (id: string) => {
        const result = loadPreset(id);
        if (result) {
            updateTheme(result.theme);
        }
    };

    const handleApplyColorsToAll = () => {
        if (activeOverlayType in configs) {
            applyColorsToAll(activeOverlayType as keyof typeof configs);
            setAppliedToAll(true);
            setTimeout(() => setAppliedToAll(false), 2000);
        }
    };

    // Render the overlay-specific sidebar panel
    // Elimination overlay types that share a common simple panel
    const ELIMINATION_TYPES = ['grenade-kill', 'vehicle-kill', 'drop-looted', 'player-domination', 'first-blood', 'recall', 'team-eliminated', 'team-domination'];

    // Note: EliminationOverlayPanel is defined below as a standalone function component

    const renderOverlayPanel = () => {
        switch (activeOverlayType) {
            case 'match-rankings':
                return <RankingsPanel config={configs['match-rankings']} onChange={update => updateConfig('match-rankings', update)} />;
            case 'match-summary':
                return <MatchSummaryPanel config={configs['match-summary']} onChange={update => updateConfig('match-summary', update)} />;
            case 'match-fraggers':
                return <FraggersPanel config={configs['match-fraggers']} onChange={update => updateConfig('match-fraggers', update)} />;
            case 'match-top-fragger':
                return <TopFraggerPanel config={configs['match-top-fragger']} onChange={update => updateConfig('match-top-fragger', update)} />;
            case 'overall-mvp':
                return <OverallMvpPanel config={configs['overall-mvp']} onChange={update => updateConfig('overall-mvp', update)} />;
            case 'head-to-head':
                return <HeadToHeadPanel config={configs['head-to-head']} onChange={update => updateConfig('head-to-head', update)} />;
            case 'wwcd-stats':
                return <WwcdPanel config={configs['wwcd-stats']} onChange={update => updateConfig('wwcd-stats', update)} />;
            case 'live-rankings':
                return <LiveRankingsPanel config={configs['live-rankings']} onChange={update => updateConfig('live-rankings', update)} />;
            default:
                if (ELIMINATION_TYPES.includes(activeOverlayType)) {
                    return <EliminationOverlayPanel overlayType={activeOverlayType} theme={theme} updateTheme={updateTheme} />;
                }
                return null;
        }
    };

    return (
        <div className="flex w-full h-full gap-2.5 overflow-hidden">

            {/* ── LEFT: Main Studio Area ─────────────────────────── */}
            <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-visible">

                {/* ── ROW 1: Top bar ─────────────────────────────── */}
                <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-slate-900/60 border border-white/6 rounded-2xl backdrop-blur-xl relative z-50">
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <Monitor size={16} style={{ color: theme.primary }} />
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase italic tracking-tight">Live Studio</span>
                        </div>

                        <div className="w-px h-5 bg-white/8" />

                        {/* Asset dropdown */}
                        <div className="relative">
                            <button
                                ref={dropdownBtnRef}
                                onClick={() => {
                                    if (!isDropdownOpen && dropdownBtnRef.current) {
                                        const rect = dropdownBtnRef.current.getBoundingClientRect();
                                        setDropdownPos({ top: rect.bottom + 10, left: rect.left });
                                    }
                                    setIsDropdownOpen(!isDropdownOpen);
                                }}
                                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/50 border border-white/8 hover:border-white/15 hover:bg-slate-900 transition-all min-w-[190px] justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <selectedOption.icon size={13} style={{ color: theme.primary }} />
                                    <span className="text-[10px] font-black text-white uppercase tracking-wider">{selectedOption.label}</span>
                                </div>
                                <ChevronDown size={12} className={cn('text-slate-500 transition-transform', isDropdownOpen && 'rotate-180')} />
                            </button>
                            {typeof document !== 'undefined' && createPortal(
                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            ref={dropdownRef}
                                            initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                            transition={{ duration: 0.15 }}
                                            className="fixed w-64 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-[9999] backdrop-blur-3xl overflow-hidden"
                                            style={{ top: dropdownPos.top, left: dropdownPos.left, boxShadow: '0 25px 60px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)' }}
                                        >
                                            <div className="px-4 pt-3 pb-2">
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.25em]">Select Overlay</span>
                                            </div>
                                            <div className="px-1.5 pb-1.5 flex flex-col gap-0.5" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                                                {/* Data overlays group */}
                                                <div className="px-3 pt-2 pb-1">
                                                    <span className="text-[7px] font-black text-blue-500/60 uppercase tracking-[0.3em]">Data Overlays</span>
                                                </div>
                                                {PREVIEW_OPTIONS.filter(o => !['grenade-kill','vehicle-kill','drop-looted','player-domination','first-blood','signature-design'].includes(o.type)).map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => { setPreviewUrl(opt.value); setIsDropdownOpen(false); }}
                                                        className={cn(
                                                            'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left group',
                                                            previewUrl === opt.value ? 'text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                                        )}
                                                        style={previewUrl === opt.value ? { backgroundColor: `${theme.primary}18` } : undefined}
                                                    >
                                                        <div
                                                            className={cn(
                                                                'flex items-center justify-center w-6 h-6 rounded-lg transition-all shrink-0',
                                                                previewUrl === opt.value ? 'text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
                                                            )}
                                                            style={previewUrl === opt.value ? { backgroundColor: `${theme.primary}30`, color: theme.primary } : undefined}
                                                        >
                                                            <opt.icon size={12} />
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">{opt.label}</span>
                                                        {previewUrl === opt.value && (
                                                            <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                                                        )}
                                                    </button>
                                                ))}

                                                {/* Divider */}
                                                <div className="mx-3 my-1.5 h-px bg-white/8" />

                                                {/* Event overlays group */}
                                                <div className="px-3 pt-1 pb-1">
                                                    <span className="text-[7px] font-black text-pink-500/60 uppercase tracking-[0.3em]">Event Overlays</span>
                                                </div>
                                                {PREVIEW_OPTIONS.filter(o => ['grenade-kill','vehicle-kill','drop-looted','player-domination','first-blood'].includes(o.type)).map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => { setPreviewUrl(opt.value); setIsDropdownOpen(false); }}
                                                        className={cn(
                                                            'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left group',
                                                            previewUrl === opt.value ? 'text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                                        )}
                                                        style={previewUrl === opt.value ? { backgroundColor: `${theme.primary}18` } : undefined}
                                                    >
                                                        <div
                                                            className={cn(
                                                                'flex items-center justify-center w-6 h-6 rounded-lg transition-all shrink-0',
                                                                previewUrl === opt.value ? 'text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
                                                            )}
                                                            style={previewUrl === opt.value ? { backgroundColor: `${theme.primary}30`, color: theme.primary } : undefined}
                                                        >
                                                            <opt.icon size={12} />
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">{opt.label}</span>
                                                        {previewUrl === opt.value && (
                                                            <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>,
                                document.body
                            )}
                        </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5">
                        {/* Apply to All */}
                        {activeOverlayType in configs && (
                            <button
                                onClick={handleApplyColorsToAll}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest',
                                    appliedToAll
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : 'border-white/8 text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/15'
                                )}
                                title="Apply this overlay's color scheme to all overlays"
                            >
                                {appliedToAll ? <Check size={12} /> : <Layers size={12} />}
                                {appliedToAll ? 'Applied!' : 'Apply to All'}
                            </button>
                        )}

                        <div className="w-px h-5 bg-white/8" />

                        {/* Save Preset */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSaveDialog(!showSaveDialog)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest',
                                    presetSaved
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : 'border-white/8 text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/15'
                                )}
                                title="Save current design as a preset"
                            >
                                {presetSaved ? <Check size={12} /> : <Save size={12} />}
                                {presetSaved ? 'Saved!' : 'Save Preset'}
                            </button>

                            {/* Save dialog dropdown */}
                            <AnimatePresence>
                                {showSaveDialog && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full right-0 mt-2 w-72 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-[9999] backdrop-blur-3xl overflow-hidden"
                                        style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.9)' }}
                                    >
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Save size={14} style={{ color: theme.primary }} />
                                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Save Preset</span>
                                            </div>
                                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                                                Saves your current theme colors + all overlay configs
                                            </p>
                                            <input
                                                type="text"
                                                value={presetName}
                                                onChange={e => setPresetName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                                                placeholder="My Tournament Style..."
                                                className="w-full px-3 py-2 text-[10px] font-bold text-white bg-slate-900/80 border border-white/10 rounded-xl focus:outline-none focus:border-white/25 transition-colors placeholder:text-slate-600"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowSaveDialog(false)}
                                                    className="flex-1 py-2 rounded-xl text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 border border-white/5 hover:bg-white/5 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSavePreset}
                                                    disabled={!presetName.trim()}
                                                    className={cn(
                                                        'flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all',
                                                        presetName.trim()
                                                            ? 'text-white border border-white/15'
                                                            : 'text-slate-600 border border-white/5 cursor-not-allowed'
                                                    )}
                                                    style={presetName.trim() ? { backgroundColor: `${theme.primary}25`, borderColor: `${theme.primary}40` } : undefined}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Load Presets */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPresetsPanel(!showPresetsPanel)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest',
                                    showPresetsPanel
                                        ? 'bg-white/10 border-white/15 text-white'
                                        : 'border-white/8 text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/15'
                                )}
                                title="Load saved presets"
                            >
                                <FolderOpen size={12} />
                                Presets{savedPresets.length > 0 && ` (${savedPresets.length})`}
                            </button>

                            {/* Presets list dropdown */}
                            <AnimatePresence>
                                {showPresetsPanel && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full right-0 mt-2 w-80 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-[9999] backdrop-blur-3xl overflow-hidden"
                                        style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.9)' }}
                                    >
                                        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <FolderOpen size={14} style={{ color: theme.primary }} />
                                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Saved Presets</span>
                                            </div>
                                            <button onClick={() => setShowPresetsPanel(false)} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                                                <X size={12} />
                                            </button>
                                        </div>

                                        <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                            {savedPresets.length === 0 ? (
                                                <div className="px-4 py-8 text-center">
                                                    <Save size={24} className="mx-auto text-slate-700 mb-2" />
                                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">No saved presets yet</p>
                                                    <p className="text-[8px] text-slate-700 mt-1">Design your overlays and save them for later</p>
                                                </div>
                                            ) : (
                                                <div className="p-2 flex flex-col gap-1">
                                                    {savedPresets.map(preset => (
                                                        <div
                                                            key={preset.id}
                                                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all"
                                                        >
                                                            {/* Color swatches from saved theme */}
                                                            <div className="flex gap-0.5 shrink-0">
                                                                {[preset.theme.primary, preset.theme.secondary, preset.theme.accent].map((c, i) => (
                                                                    <div key={i} className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: c || '#333' }} />
                                                                ))}
                                                            </div>

                                                            {editingPresetId === preset.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editingPresetName}
                                                                    onChange={e => setEditingPresetName(e.target.value)}
                                                                    onBlur={() => { renamePreset(preset.id, editingPresetName); setEditingPresetId(null); }}
                                                                    onKeyDown={e => { if (e.key === 'Enter') { renamePreset(preset.id, editingPresetName); setEditingPresetId(null); } }}
                                                                    className="flex-1 px-2 py-1 text-[9px] font-bold text-white bg-slate-900 border border-white/15 rounded-lg focus:outline-none"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <button
                                                                    onClick={() => { handleLoadPreset(preset.id); setShowPresetsPanel(false); }}
                                                                    className="flex-1 text-left min-w-0"
                                                                >
                                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider truncate group-hover:text-white transition-colors">{preset.name}</p>
                                                                    <p className="text-[7px] text-slate-600 font-mono mt-0.5">{new Date(preset.createdAt).toLocaleDateString()}</p>
                                                                </button>
                                                            )}

                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                <button
                                                                    onClick={() => { setEditingPresetId(preset.id); setEditingPresetName(preset.name); }}
                                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                                                                    title="Rename"
                                                                >
                                                                    <Pencil size={10} />
                                                                </button>
                                                                <button
                                                                    onClick={() => deletePreset(preset.id)}
                                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-5 bg-white/8" />

                        <div className="flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Synced</span>
                        </div>
                        <button
                            onClick={handleCopyUrl}
                            className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest',
                                copiedUrl
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : 'border-white/8 text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/15'
                            )}
                            title="Copy overlay URL for OBS"
                        >
                            {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
                            {copiedUrl ? 'Copied!' : 'Copy URL'}
                        </button>
                        <button
                            onClick={() => { const f = document.getElementById('preview-iframe') as HTMLIFrameElement; if (f) f.src = f.src; }}
                            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                            title="Refresh preview"
                        ><RefreshCcw size={13} /></button>
                        <button
                            onClick={() => window.open(`${previewUrl}?transparent=true&primary=${theme.primary.replace('#', '')}&secondary=${theme.secondary.replace('#', '')}`, '_blank', 'width=1920,height=1080')}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/8 text-white hover:bg-white/5 transition-all text-[8px] font-black uppercase tracking-widest"
                        ><Maximize size={12} /> Fullscreen</button>
                        <div className="w-px h-5 bg-white/8 mx-1" />
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={cn('p-2 rounded-lg transition-all', sidebarOpen ? 'text-white bg-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5')}
                            title={sidebarOpen ? 'Close panel' : 'Open panel'}
                        >
                            {sidebarOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
                        </button>
                    </div>
                </div>

                {/* ── ROW 2: Design Controls ─────────────────────── */}
                <div className="shrink-0 bg-slate-900/40 border border-white/6 rounded-2xl backdrop-blur-xl overflow-hidden">
                    <div className="flex divide-x divide-white/5">

                        {/* Presets */}
                        <div className="p-4 w-[220px] shrink-0">
                            <SectionHeader icon={Sparkles} label="Presets" />
                            <div className="flex flex-col gap-1">
                                {designPresets.map(preset => {
                                    const isActive = selectedDesign === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handleDesignSelect(preset.id)}
                                            className={cn(
                                                'relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all overflow-hidden text-left group',
                                                isActive ? 'border-white/15 bg-white/5' : 'bg-transparent border-transparent hover:bg-white/3 hover:border-white/8'
                                            )}
                                            style={isActive ? { borderColor: `${preset.themeOverrides.primary}40` } : undefined}
                                        >
                                            <div className="flex gap-1 z-10 shrink-0">
                                                {[preset.themeOverrides.primary, preset.themeOverrides.secondary, preset.themeOverrides.accent].map((c, i) => (
                                                    <div key={i} className={cn('w-4 h-4 rounded-full border-2 transition-all', isActive ? 'border-white/25' : 'border-white/8')} style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                            <p className={cn('text-[9px] font-black uppercase tracking-wider truncate flex-1', isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')}>{preset.name}</p>
                                            {isActive && <Check size={10} className="text-emerald-400 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Colors */}
                        <div className="flex-1 p-4">
                            <SectionHeader icon={Palette} label="Colors" iconColor="text-pink-400" />
                            <div className="flex items-start gap-2">
                                {/* Primary colors - larger */}
                                <div className="flex items-end gap-4">
                                    {COLOR_PICKERS.filter(p => p.highlight).map(picker => {
                                        const val = (theme as any)[picker.id] || '#000000';
                                        return (
                                            <div key={picker.id} className="flex flex-col items-center gap-2 group/picker">
                                                <div
                                                    className="relative cursor-pointer transition-all hover:scale-110 active:scale-95 group"
                                                    style={{
                                                        width: 44, height: 44, borderRadius: '12px',
                                                        background: val === 'transparent'
                                                            ? 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%) 0 0 / 8px 8px'
                                                            : val,
                                                        boxShadow: `0 4px 20px ${val}40, 0 0 0 2px ${val}25`,
                                                        border: `2px solid ${val}50`,
                                                    }}
                                                >
                                                    <input type="color" value={toHex6(val)} onChange={e => updateTheme({ [picker.id]: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 border border-white/10 rounded-lg text-[7px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
                                                        {val.toUpperCase()}
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{picker.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Effects */}
                        <div className="p-4 w-[150px] shrink-0">
                            <SectionHeader icon={Zap} label="Effects" iconColor="text-cyan-400" />
                            <div className="flex flex-col gap-4 mt-1">
                                <ToggleRow label="Glow FX" value={theme.glowEnabled} onChange={v => updateTheme({ glowEnabled: v })} color="#10b981" />
                                <ToggleRow label="Glass" value={theme.glassmorphism} onChange={v => updateTheme({ glassmorphism: v })} color="#3b82f6" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── ROW 3: Live Preview ────────────────────────── */}
                <div className="relative rounded-2xl overflow-hidden border border-white/6 bg-slate-950/40 flex-1 min-h-0">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
                        backgroundSize: '30px 30px'
                    }} />
                    <div className="absolute inset-0 pointer-events-none" style={{
                        background: `radial-gradient(ellipse at 50% 30%, ${theme.primary}08 0%, transparent 60%)`
                    }} />
                    <div className="absolute inset-0 pointer-events-none" style={{
                        background: `radial-gradient(ellipse at 80% 80%, ${theme.secondary}06 0%, transparent 50%)`
                    }} />

                    <div className="absolute inset-0 flex items-center justify-center p-4 lg:p-8">
                        <div
                            className="relative w-full rounded-2xl overflow-hidden"
                            style={{
                                aspectRatio: '16/9',
                                maxHeight: '100%',
                                boxShadow: `0 30px 80px -10px rgba(0,0,0,0.8), 0 0 60px ${theme.primary}10, 0 0 0 1px rgba(255,255,255,0.06)`,
                            }}
                        >
                            <iframe id="preview-iframe" src={iframeSrc} className="w-full h-full border-0" onLoad={sendThemeToIframe} />
                            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[7.5px] font-black text-white/80 uppercase tracking-widest">Live Preview · {selectedOption.label}</span>
                                </div>
                            </div>
                            <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
                                <div className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                                    <span className="text-[7px] font-mono text-white/50">1920 × 1080</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── RIGHT: Overlay Config Sidebar ──────────────────── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="shrink-0 h-full overflow-hidden"
                    >
                        <div className="w-[300px] h-full flex flex-col bg-slate-900/50 border border-white/6 rounded-2xl backdrop-blur-xl overflow-hidden">

                            {/* Sidebar Header */}
                            <div className="shrink-0 px-4 py-3.5 border-b border-white/5 flex items-center justify-between bg-slate-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/8" style={{ backgroundColor: `${theme.primary}15` }}>
                                        <selectedOption.icon size={14} style={{ color: theme.primary }} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">{selectedOption.label}</p>
                                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Overlay Controls</p>
                                    </div>
                                </div>
                                {activeOverlayType in configs && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={handleApplyColorsToAll}
                                            className={cn(
                                                'p-1.5 rounded-lg transition-all',
                                                appliedToAll ? 'text-emerald-400 bg-emerald-500/15' : 'text-slate-500 hover:text-white hover:bg-white/5'
                                            )}
                                            title="Apply this overlay's colors to all overlays"
                                        >
                                            {appliedToAll ? <Check size={12} /> : <Layers size={12} />}
                                        </button>
                                        <button
                                            onClick={handleResetConfig}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                                            title="Reset to defaults"
                                        >
                                            <RotateCcw size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar Body */}
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {renderOverlayPanel()}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

export default function OverlayStudioPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="flex items-center justify-center h-full gap-3">
                    <RefreshCcw className="animate-spin text-blue-400" size={18} />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] animate-pulse">Loading Studio...</span>
                </div>
            }>
                <StudioContent />
            </Suspense>
        </DashboardLayout>
    );
}
