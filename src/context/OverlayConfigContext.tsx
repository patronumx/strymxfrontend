"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Per-overlay configuration types ─────────────────────────────

export interface RankingsConfig {
    headerTitle: string;
    headerSubtitle: string;
    headerTitleSize: number;
    showTopTeamShowcase: boolean;
    showPlayerPortraits: boolean;
    playerPortraitCount: number;
    teamsShown: number;
    tableHeaderColor: string;
    rankBadgeColor: string;
    totalBadgeColor: string;
    showPlaceColumn: boolean;
    showElimsColumn: boolean;
    showTotalColumn: boolean;
    cornerRadius: number;
    showSkewedTotal: boolean;
    animationSpeed: 'none' | 'fast' | 'normal' | 'slow';
    staggerDelay: number;
    // Per-element colors
    cardBgColor: string;
    cardBorderColor: string;
    teamNameColor: string;
    headerBgColor: string;
    headerTextColor: string;
    rowEvenColor: string;
    rowOddColor: string;
}

export interface MatchSummaryConfig {
    headerTitle: string;
    showTotalKills: boolean;
    showTotalKnocks: boolean;
    showHeadshots: boolean;
    showSmokesNades: boolean;
    showVehicleKills: boolean;
    showGrenadeKills: boolean;
    showAirdrops: boolean;
    cardWidth: number;
    cardClipPath: boolean;
    valuePadding: number;
    // Per-element colors
    cardBgColor: string;
    cardBorderColor: string;
    headerBgColor: string;
    headerTextColor: string;
    statLabelColor: string;
    statValueColor: string;
    iconColor: string;
}

export interface FraggersConfig {
    designStyle: 'classic' | 'cards';
    headerTitle: string;
    headerSubtitle: string;
    showHeader: boolean;
    playerCount: number;
    showDamage: boolean;
    showElims: boolean;
    showSurvival: boolean;
    showKnocks: boolean;
    showPlayerPortrait: boolean;
    showTeamName: boolean;
    showRankBadge: boolean;
    cardHeight: number;
    cardCornerRadius: number;
    cardGap: number;
    // Per-element colors
    cardBgColor: string;
    cardBorderColor: string;
    rankBgColor: string;
    rankTextColor: string;
    playerNameColor: string;
    teamNameColor: string;
    elimsColor: string;
    damageColor: string;
    survivalColor: string;
    statLabelColor: string;
    statBgColor: string;
}

export interface TopFraggerConfig {
    headerTitle: string;
    showHeader: boolean;
    showEliminations: boolean;
    showDamage: boolean;
    showSurvival: boolean;
    showTeamLogo: boolean;
    showPlayerPortrait: boolean;
    // Per-element colors
    cardBgColor: string;
    cardBorderColor: string;
    playerNameColor: string;
    teamNameColor: string;
    elimsColor: string;
    damageColor: string;
    survivalColor: string;
    statLabelColor: string;
    headerBgColor: string;
    headerTextColor: string;
}

export interface OverallMvpConfig {
    designStyle: 'classic' | 'cards';
    headerTitle: string;
    headerSubtitle: string;
    showHeader: boolean;
    playerCount: number;
    showDamage: boolean;
    showElims: boolean;
    showKnocks: boolean;
    showPlayerPortrait: boolean;
    showTeamLogo: boolean;
    cardHeight: number;
    cardGap: number;
    // Per-element colors
    cardBgColor: string;
    cardBorderColor: string;
    playerNameColor: string;
    teamNameColor: string;
    elimsColor: string;
    damageColor: string;
    statLabelColor: string;
    headerBgColor: string;
    headerTextColor: string;
    rankBadgeColor: string;
}

export interface HeadToHeadConfig {
    headerTitle: string;
    headerSubtitle: string;
    showHeader: boolean;
    showEliminations: boolean;
    showDamage: boolean;
    showHeadshots: boolean;
    showSurvival: boolean;
    showVsBadge: boolean;
    showPlayerPortrait: boolean;
    designStyle: 'classic' | 'radar';
    // Per-element colors
    cardBgColor: string;
    cardBorderColor: string;
    playerNameColor: string;
    teamNameColor: string;
    vsBadgeColor: string;
    statLabelColor: string;
    statValueColor: string;
    headerBgColor: string;
    headerTextColor: string;
}

export interface WwcdConfig {
    headerTitle: string;
    headerSubtitle: string;
    showHeader: boolean;
    showParticles: boolean;
    playerCount: number;
    showElims: boolean;
    showDamage: boolean;
    showSurvival: boolean;
    showPlayerPortrait: boolean;
    showTeamLogo: boolean;
    // Per-element colors
    cardBgColor: string;
    cardBorderColor: string;
    playerNameColor: string;
    teamNameColor: string;
    elimsColor: string;
    damageColor: string;
    survivalColor: string;
    statLabelColor: string;
    headerBgColor: string;
    headerTextColor: string;
}

export interface LiveRankingsConfig {
    headerLabel: string;
    teamsShown: number;
    showHealthBars: boolean;
    showLegend: boolean;
    showFlags: boolean;
    showLogos: boolean;
    // Per-element colors
    headerBgStart: string;
    headerBgEnd: string;
    teamBgColor: string;
    statsBgColor: string;
    legendBgColor: string;
    borderBottomColor: string;
    rankTextColor: string;
    teamNameColor: string;
    pointsColor: string;
    elimsColor: string;
}

export interface OverlayConfigs {
    'match-rankings': RankingsConfig;
    'match-summary': MatchSummaryConfig;
    'match-fraggers': FraggersConfig;
    'match-top-fragger': TopFraggerConfig;
    'overall-mvp': OverallMvpConfig;
    'head-to-head': HeadToHeadConfig;
    'wwcd-stats': WwcdConfig;
    'live-rankings': LiveRankingsConfig;
}

// ── Defaults ────────────────────────────────────────────────────

export const defaultRankingsConfig: RankingsConfig = {
    headerTitle: 'MATCH RANKINGS',
    headerSubtitle: 'MATCH 1/16',
    headerTitleSize: 90,
    showTopTeamShowcase: true,
    showPlayerPortraits: true,
    playerPortraitCount: 4,
    teamsShown: 9,
    tableHeaderColor: '#8bc34a',
    rankBadgeColor: '#d4e157',
    totalBadgeColor: '#e91e63',
    showPlaceColumn: true,
    showElimsColumn: true,
    showTotalColumn: true,
    cornerRadius: 18,
    showSkewedTotal: true,
    animationSpeed: 'normal',
    staggerDelay: 0.08,
    cardBgColor: '#0f172a',
    cardBorderColor: '#334155',
    teamNameColor: '#ffffff',
    headerBgColor: '#1e293b',
    headerTextColor: '#ffffff',
    rowEvenColor: '#0f172a',
    rowOddColor: '#1e293b',
};

export const defaultMatchSummaryConfig: MatchSummaryConfig = {
    headerTitle: 'MATCH SUMMARY',
    showTotalKills: true,
    showTotalKnocks: true,
    showHeadshots: true,
    showSmokesNades: true,
    showVehicleKills: true,
    showGrenadeKills: true,
    showAirdrops: true,
    cardWidth: 340,
    cardClipPath: true,
    valuePadding: 3,
    cardBgColor: '#0f172a',
    cardBorderColor: '#334155',
    headerBgColor: '#1e293b',
    headerTextColor: '#ffffff',
    statLabelColor: '#94a3b8',
    statValueColor: '#ffffff',
    iconColor: '#10b981',
};

export const defaultFraggersConfig: FraggersConfig = {
    designStyle: 'classic',
    headerTitle: 'TOP HUNTERS',
    headerSubtitle: 'Total Eliminations & Combat Performance',
    showHeader: true,
    playerCount: 5,
    showDamage: true,
    showElims: true,
    showSurvival: true,
    showKnocks: true,
    showPlayerPortrait: true,
    showTeamName: true,
    showRankBadge: true,
    cardHeight: 160,
    cardCornerRadius: 24,
    cardGap: 24,
    cardBgColor: '#0a0a0c',
    cardBorderColor: '#1e293b',
    rankBgColor: 'transparent',
    rankTextColor: '#ffffff',
    playerNameColor: '#ffffff',
    teamNameColor: '#94a3b8',
    elimsColor: '',
    damageColor: '',
    survivalColor: '#ffffff',
    statLabelColor: '#f1f5f9',
    statBgColor: '#1a1a2e',
};

export const defaultTopFraggerConfig: TopFraggerConfig = {
    headerTitle: 'MATCH TOP FRAGGER',
    showHeader: true,
    showEliminations: true,
    showDamage: true,
    showSurvival: true,
    showTeamLogo: true,
    showPlayerPortrait: true,
    cardBgColor: '#0a0a0c',
    cardBorderColor: '#1e293b',
    playerNameColor: '#ffffff',
    teamNameColor: '#94a3b8',
    elimsColor: '',
    damageColor: '',
    survivalColor: '#ffffff',
    statLabelColor: '#94a3b8',
    headerBgColor: '#1e293b',
    headerTextColor: '#ffffff',
};

export const defaultOverallMvpConfig: OverallMvpConfig = {
    designStyle: 'classic',
    headerTitle: 'OVERALL MVP',
    headerSubtitle: 'THE ELITE PERFORMANCE',
    showHeader: true,
    playerCount: 5,
    showDamage: true,
    showElims: true,
    showKnocks: true,
    showPlayerPortrait: true,
    showTeamLogo: true,
    cardHeight: 128,
    cardGap: 16,
    cardBgColor: '#0a0a0c',
    cardBorderColor: '#1e293b',
    playerNameColor: '#ffffff',
    teamNameColor: '#94a3b8',
    elimsColor: '',
    damageColor: '',
    statLabelColor: '#94a3b8',
    headerBgColor: '#1e293b',
    headerTextColor: '#ffffff',
    rankBadgeColor: '#e91e63',
};

export const defaultHeadToHeadConfig: HeadToHeadConfig = {
    headerTitle: 'HEAD VS HEAD',
    headerSubtitle: 'MVP BATTLE',
    showHeader: true,
    showEliminations: true,
    showDamage: true,
    showHeadshots: true,
    showSurvival: true,
    showVsBadge: true,
    showPlayerPortrait: true,
    designStyle: 'classic',
    cardBgColor: '#0a0a0c',
    cardBorderColor: '#1e293b',
    playerNameColor: '#ffffff',
    teamNameColor: '#94a3b8',
    vsBadgeColor: '#e91e63',
    statLabelColor: '#94a3b8',
    statValueColor: '#ffffff',
    headerBgColor: '#1e293b',
    headerTextColor: '#ffffff',
};

export const defaultWwcdConfig: WwcdConfig = {
    headerTitle: 'CHICKEN DINNER',
    headerSubtitle: 'WWCD TEAM STATS',
    showHeader: true,
    showParticles: true,
    playerCount: 4,
    showElims: true,
    showDamage: true,
    showSurvival: true,
    showPlayerPortrait: true,
    showTeamLogo: true,
    cardBgColor: '#0a0a0c',
    cardBorderColor: '#1e293b',
    playerNameColor: '#ffffff',
    teamNameColor: '#94a3b8',
    elimsColor: '',
    damageColor: '',
    survivalColor: '#ffffff',
    statLabelColor: '#94a3b8',
    headerBgColor: '#1e293b',
    headerTextColor: '#ffffff',
};

export const defaultLiveRankingsConfig: LiveRankingsConfig = {
    headerLabel: 'LIVE RANKINGS',
    teamsShown: 15,
    showHealthBars: true,
    showLegend: true,
    showFlags: false,
    showLogos: true,
    headerBgStart: '#003340',
    headerBgEnd: '#00c0b5',
    teamBgColor: '#003b46',
    statsBgColor: '#00b9a9',
    legendBgColor: '#ffffff',
    borderBottomColor: '#fd5564',
    rankTextColor: '#ffffff',
    teamNameColor: '#ffffff',
    pointsColor: '#ffffff',
    elimsColor: '#ffffff',
};

// ── Saved Presets ──────────────────────────────────────────────

export interface SavedPreset {
    id: string;
    name: string;
    createdAt: string;
    theme: Record<string, any>;
    configs: OverlayConfigs;
}

const PRESETS_STORAGE_KEY = 'strymx_saved_presets';

function loadSavedPresets(): SavedPreset[] {
    try {
        const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function persistPresets(presets: SavedPreset[]) {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

// ── Color key extraction helper ────────────────────────────────

/** Common color keys shared across most overlay configs */
const COMMON_COLOR_KEYS = [
    'cardBgColor', 'cardBorderColor', 'headerBgColor', 'headerTextColor',
    'playerNameColor', 'teamNameColor', 'elimsColor', 'damageColor',
    'survivalColor', 'statLabelColor', 'statValueColor', 'rankBadgeColor',
    'rankTextColor', 'statBgColor', 'vsBadgeColor', 'iconColor',
    'tableHeaderColor', 'totalBadgeColor', 'rowEvenColor', 'rowOddColor',
    'rankBgColor',
] as const;

/** Extract only color values from any overlay config */
function extractColorValues(config: Record<string, any>): Record<string, string> {
    const colors: Record<string, string> = {};
    for (const key of COMMON_COLOR_KEYS) {
        if (key in config && typeof config[key] === 'string') {
            colors[key] = config[key];
        }
    }
    return colors;
}

// ── Context ─────────────────────────────────────────────────────

interface OverlayConfigContextType {
    configs: OverlayConfigs;
    updateConfig: <K extends keyof OverlayConfigs>(overlay: K, update: Partial<OverlayConfigs[K]>) => void;
    resetConfig: (overlay: keyof OverlayConfigs) => void;
    batchUpdateColors: (updates: { [K in keyof OverlayConfigs]?: Partial<OverlayConfigs[K]> }) => void;
    applyColorsToAll: (sourceOverlay: keyof OverlayConfigs) => void;
    savedPresets: SavedPreset[];
    savePreset: (name: string, theme: Record<string, any>) => void;
    loadPreset: (id: string) => { theme: Record<string, any>; configs: OverlayConfigs } | null;
    deletePreset: (id: string) => void;
    renamePreset: (id: string, newName: string) => void;
}

const defaultConfigs: OverlayConfigs = {
    'match-rankings': defaultRankingsConfig,
    'match-summary': defaultMatchSummaryConfig,
    'match-fraggers': defaultFraggersConfig,
    'match-top-fragger': defaultTopFraggerConfig,
    'overall-mvp': defaultOverallMvpConfig,
    'head-to-head': defaultHeadToHeadConfig,
    'wwcd-stats': defaultWwcdConfig,
    'live-rankings': defaultLiveRankingsConfig,
};

const OverlayConfigContext = createContext<OverlayConfigContextType>({
    configs: defaultConfigs,
    updateConfig: () => { },
    resetConfig: () => { },
    batchUpdateColors: () => { },
    applyColorsToAll: () => { },
    savedPresets: [],
    savePreset: () => { },
    loadPreset: () => null,
    deletePreset: () => { },
    renamePreset: () => { },
});

export const useOverlayConfig = () => useContext(OverlayConfigContext);

export function OverlayConfigProvider({ children }: { children: ReactNode }) {
    const [configs, setConfigs] = useState<OverlayConfigs>(defaultConfigs);
    const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setConfigs(prev => ({
                    ...prev,
                    ...Object.fromEntries(
                        Object.entries(parsed)
                            .filter(([k]) => k in prev)
                            .map(([k, v]) => [k, { ...(prev as any)[k], ...(v as any) }])
                    ),
                } as OverlayConfigs));
            } catch (e) {
                console.error('Failed to parse overlay configs', e);
            }
        }
        setSavedPresets(loadSavedPresets());
    }, []);

    const updateConfig = <K extends keyof OverlayConfigs>(overlay: K, update: Partial<OverlayConfigs[K]>) => {
        setConfigs(prev => {
            const updated = {
                ...prev,
                [overlay]: { ...prev[overlay], ...update },
            };
            localStorage.setItem('strymx_overlay_configs', JSON.stringify(updated));
            return updated;
        });
    };

    const resetConfig = (overlay: keyof OverlayConfigs) => {
        setConfigs(prev => {
            const updated = { ...prev, [overlay]: defaultConfigs[overlay] };
            localStorage.setItem('strymx_overlay_configs', JSON.stringify(updated));
            return updated;
        });
    };

    const batchUpdateColors = (updates: { [K in keyof OverlayConfigs]?: Partial<OverlayConfigs[K]> }) => {
        setConfigs(prev => {
            const updated = { ...prev };
            for (const key of Object.keys(updates) as (keyof OverlayConfigs)[]) {
                if (updates[key]) {
                    (updated as any)[key] = { ...prev[key], ...updates[key] };
                }
            }
            localStorage.setItem('strymx_overlay_configs', JSON.stringify(updated));
            return updated;
        });
    };

    /** Take colors from one overlay and push them to ALL overlays */
    const applyColorsToAll = (sourceOverlay: keyof OverlayConfigs) => {
        const sourceConfig = configs[sourceOverlay] as Record<string, any>;
        const colors = extractColorValues(sourceConfig);

        setConfigs(prev => {
            const updated = { ...prev };
            for (const key of Object.keys(prev) as (keyof OverlayConfigs)[]) {
                const target = prev[key] as Record<string, any>;
                const applicable: Record<string, string> = {};
                for (const [ck, cv] of Object.entries(colors)) {
                    if (ck in target) {
                        applicable[ck] = cv;
                    }
                }
                if (Object.keys(applicable).length > 0) {
                    (updated as any)[key] = { ...target, ...applicable };
                }
            }
            localStorage.setItem('strymx_overlay_configs', JSON.stringify(updated));
            return updated;
        });
    };

    /** Save current theme + all overlay configs as a named preset */
    const savePreset = (name: string, theme: Record<string, any>) => {
        const preset: SavedPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            createdAt: new Date().toISOString(),
            theme,
            configs: JSON.parse(JSON.stringify(configs)),
        };
        setSavedPresets(prev => {
            const next = [preset, ...prev];
            persistPresets(next);
            return next;
        });
    };

    /** Load a saved preset — returns theme + configs for caller to apply */
    const loadPreset = (id: string): { theme: Record<string, any>; configs: OverlayConfigs } | null => {
        const preset = savedPresets.find(p => p.id === id);
        if (!preset) return null;
        setConfigs(() => {
            localStorage.setItem('strymx_overlay_configs', JSON.stringify(preset.configs));
            return preset.configs;
        });
        return { theme: preset.theme, configs: preset.configs };
    };

    const deletePreset = (id: string) => {
        setSavedPresets(prev => {
            const next = prev.filter(p => p.id !== id);
            persistPresets(next);
            return next;
        });
    };

    const renamePreset = (id: string, newName: string) => {
        setSavedPresets(prev => {
            const next = prev.map(p => p.id === id ? { ...p, name: newName } : p);
            persistPresets(next);
            return next;
        });
    };

    return (
        <OverlayConfigContext.Provider value={{
            configs, updateConfig, resetConfig, batchUpdateColors,
            applyColorsToAll, savedPresets, savePreset, loadPreset, deletePreset, renamePreset,
        }}>
            {children}
        </OverlayConfigContext.Provider>
    );
}
