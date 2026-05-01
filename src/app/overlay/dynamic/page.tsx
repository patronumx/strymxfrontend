"use client"
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { WS_URL , API_URL} from '@/lib/api-config';

function DynamicOverlayEngine() {
    const { theme, isTransparent: themeTransparent, isDataOnly: themeDataOnly } = useTheme();
    const searchParams = useSearchParams();
    const profileId = searchParams.get('profileId');
    const isDataOnly = themeDataOnly || searchParams.get('dataOnly') === 'true';
    const isTransparent = themeTransparent || searchParams.get('transparent') !== 'false';

    const [profile, setProfile] = useState<any>(null);
    const [fetchedData, setFetchedData] = useState<any[]>([]);

    // 1. Fetch Profile
    useEffect(() => {
        if (!profileId) return;
        fetch(`${API_URL}/api/overlay-templates/${profileId}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.elements) {
                    try {
                        const parsed = JSON.parse(data.elements);
                        setProfile({
                            backgroundImage: parsed.backgroundImage || '',
                            backgroundType: parsed.backgroundType || 'image',
                            fields: parsed.fields || []
                        });
                    } catch(e) {
                        console.error("Failed to parse profile JSON.");
                    }
                }
            })
            .catch(e => console.error("Error loading profile", e));
    }, [profileId]);

    // 2. Telemetry Connection
    useEffect(() => {
        const socket = io(WS_URL);
        socket.on('connect', () => console.log('Dynamic Engine Connected'));
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) setFetchedData(data.activePlayers);
        });
        return () => { socket.disconnect(); };
    }, []);

    // 3. Compute Data Context Variables
    const dataContext = useMemo(() => {
        const stats = { 
            match_total_kills: 0, 
            match_total_knocks: 0, 
            match_total_headshots: 0, 
            match_smokes_and_nades: 0, 
            match_vehicle_kills: 0, 
            match_grenade_kills: 0, 
            match_airdrops_looted: 0,
            
            // Top Fragger
            top_fragger_name: "WAITING",
            top_fragger_kills: 0,
            top_fragger_damage: 0,
            top_fragger_survival: "00:00",
            team_name: "WAITING"
        };
        
        if (!fetchedData || fetchedData.length === 0) return stats;

        let bestFragger: any = null;
        
        fetchedData.forEach(p => {
            stats.match_total_kills += p.killNum || 0;
            stats.match_total_knocks += p.knockouts || 0;
            stats.match_total_headshots += p.headShotNum || 0;
            stats.match_smokes_and_nades += (p.useSmokeGrenadeNum || 0) + (p.useFragGrenadeNum || 0) + (p.useBurnGrenadeNum || 0) + (p.useFlashGrenadeNum || 0);
            stats.match_vehicle_kills += p.killNumInVehicle || 0;
            stats.match_grenade_kills += p.killNumByGrenade || 0;
            stats.match_airdrops_looted += p.gotAirDropNum || 0;
            
            if (!bestFragger || (p.killNum || 0) > (bestFragger.killNum || 0)) {
                bestFragger = p;
            }
            if (p.team && p.team.name) {
                stats.team_name = p.team.name;
            }
        });

        if (bestFragger) {
            stats.top_fragger_name = bestFragger.playerName || bestFragger.player?.displayName || "Unknown";
            stats.top_fragger_kills = bestFragger.killNum || 0;
            stats.top_fragger_damage = Math.round(bestFragger.damage || 0);
            
            const m = Math.floor((bestFragger.survivalTime || 0) / 60);
            const s = Math.floor((bestFragger.survivalTime || 0) % 60);
            stats.top_fragger_survival = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return stats;
    }, [fetchedData]);

    // 4. Compute Standings for Grid Features
    const teamsData = useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) return [];
        const teamMap = new Map<string, any>();

        fetchedData.forEach((p: any) => {
            const nameStr = p.playerName || p.PlayerName || '';
            if ((nameStr === '' || nameStr === 'Unknown') && (!p.damage && !p.killNum)) return;

            const tName = p.teamName || p.teamId || 'Unknown';
            if (!teamMap.has(tName)) {
                teamMap.set(tName, { teamName: tName, elims: 0, placePts: 0, totalPts: 0, logoUrl: p.logoUrl || null, players: [] });
            }

            const team = teamMap.get(tName);
            team.elims += (p.killNum || p.KillNum || 0);
            team.placePts = Math.max(team.placePts, p.placePts || 0);
            team.players.push(p);
        });

        const sortedTeams = Array.from(teamMap.values()).map(t => {
            t.players.sort((a: any, b: any) => (b.killNum || 0) - (a.killNum || 0));
            return {
                ...t,
                totalPts: t.elims + t.placePts
            };
        }).sort((a, b) => b.totalPts - a.totalPts);

        return sortedTeams.map((t, index) => ({ ...t, rank: index + 1 }));
    }, [fetchedData]);

    const [scale, setScale] = useState(1);
    useEffect(() => {
        const handleResize = () => {
            const widthScale = window.innerWidth / 1920;
            const heightScale = window.innerHeight / 1080;
            setScale(Math.min(widthScale, heightScale, 1));
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!profile) {
        return <div className="w-screen h-screen bg-slate-900 flex items-center justify-center text-white font-black">Loading Profile {profileId}...</div>;
    }

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'transparent' }}>
            <div
                className="relative font-sans text-white z-10"
                style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                {/* 1. Designer Background */}
                {!isDataOnly && profile.backgroundImage && (
                    <div className="absolute inset-0 z-0">
                        {profile.backgroundType === 'video' ? (
                            <video src={profile.backgroundImage} autoPlay loop muted className="w-full h-full object-cover" />
                        ) : (
                            <img src={profile.backgroundImage} className="w-full h-full object-cover" alt="Overlay Background" />
                        )}
                    </div>
                )}
                
                {/* 2. Dynamic Mapped Fields */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {profile.fields.map((field: any) => {

                        // ============================
                        // SMART GRID RENDERER
                        // ============================
                        if (field.type === 'grid') {
                            const gridTeams = teamsData.length > 0 ? teamsData : Array.from({length: field.rows}).map((_, i) => ({
                                rank: i + 1,
                                teamName: i === 0 ? "..." : "...",
                                placePts: 0,
                                elims: 0,
                                totalPts: 0,
                                logoUrl: null
                            }));

                            // Ensure enough padding for drawing tools
                            const displayRows = gridTeams.slice(0, field.rows);
                            while (displayRows.length < field.rows) {
                                displayRows.push({
                                    rank: displayRows.length + 1, teamName: "...", placePts: 0, elims: 0, totalPts: 0, logoUrl: null
                                });
                            }

                            return (
                                <div 
                                    key={field.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${field.x}px`,
                                        top: `${field.y}px`,
                                        width: `${field.width}px`,
                                        height: `${field.height}px`,
                                        fontFamily: field.fontFamily || 'Inter',
                                        fontSize: `${field.fontSize || 32}px`,
                                        fontWeight: field.fontWeight || 900,
                                        color: field.color || '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    {displayRows.map((t, rIdx) => (
                                        <div key={rIdx} className="w-full h-full flex items-center overflow-hidden">
                                            {field.columns.map((col: any, cIdx: number) => {
                                                let cellValue: any = "...";
                                                if (col.type === 'rank') cellValue = `#${t.rank}`;
                                                else if (col.type === 'team_name') cellValue = t.teamName.replace(/^scout\s+/i, '');
                                                else if (col.type === 'place_pts') cellValue = String(t.placePts).padStart(2, '0');
                                                else if (col.type === 'elims') cellValue = String(t.elims).padStart(2, '0');
                                                else if (col.type === 'total_pts') cellValue = String(t.totalPts).padStart(2, '0');
                                                else if (col.type === 'logo') cellValue = t.logoUrl ? <img src={t.logoUrl} className="h-[80%] max-h-full object-contain" /> : <div className="h-[80%] w-full bg-slate-800/10"></div>;

                                                return (
                                                    <div 
                                                        key={cIdx} 
                                                        className={`${col.width} h-full flex items-center px-2 overflow-hidden whitespace-nowrap`}
                                                        style={{ justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}
                                                    >
                                                        {cellValue}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        // ============================
                        // FLAT TEXT RENDERER
                        // ============================
                        let rawValue: any = "...";
                        
                        if (field.variable === 'match_number') {
                            rawValue = '1/16'; // Pending backend lobby injection
                        } else if (field.variable.startsWith('team_')) {
                            // team_1_rank
                            const parts = field.variable.split('_');
                            const teamIndex = parseInt(parts[1]) - 1;
                            const t = teamsData[teamIndex];
                            
                            if (t) {
                                if (field.variable.includes('_rank')) rawValue = t.rank;
                                else if (field.variable.includes('_name')) rawValue = t.teamName;
                                else if (field.variable.includes('_place_pts')) rawValue = t.placePts;
                                else if (field.variable.includes('_elims')) rawValue = t.elims;
                                else if (field.variable.includes('_total_pts')) rawValue = t.totalPts;
                            }
                        } else if (field.variable.startsWith('top_team_player_')) {
                            // top_team_player_1_kills
                            const parts = field.variable.split('_');
                            const playerIndex = parseInt(parts[3]) - 1;
                            const topTeam = teamsData[0];
                            
                            if (topTeam && topTeam.players && topTeam.players[playerIndex]) {
                                const p = topTeam.players[playerIndex];
                                if (field.variable.includes('_name')) rawValue = p.playerName || p.PlayerName || 'Unknown';
                                else if (field.variable.includes('_kills')) rawValue = p.killNum || 0;
                                else if (field.variable.includes('_damage')) rawValue = Math.round(p.damage || 0);
                            }
                        } else {
                            rawValue = dataContext[field.variable as keyof typeof dataContext];
                        }
                        let displayValue = String(rawValue);
                        if (typeof rawValue === 'number' && field.variable.includes('kills') || field.variable.includes('damage')) {
                             displayValue = displayValue.padStart(field.padding || 3, '0');
                        }
                        if (field.variable === 'team_name' || field.variable === 'top_fragger_name') {
                            displayValue = displayValue.toUpperCase();
                        }

                        return (
                            <div 
                                key={field.id}
                                style={{
                                    position: 'absolute',
                                    left: `${field.x}px`,
                                    top: `${field.y}px`,
                                    fontFamily: field.fontFamily || 'Inter',
                                    fontSize: `${field.fontSize || 32}px`,
                                    fontWeight: field.fontWeight || 900,
                                    color: field.color || '#ffffff',
                                    lineHeight: 1,
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: `${field.iconGap || 16}px`,
                                    textAlign: field.align || 'left',
                                    transform: `translate(${field.offsetX || 0}px, ${field.offsetY || 0}px)` + 
                                        (field.align === 'center' ? ' translate(-50%, 0)' : field.align === 'right' ? ' translate(-100%, 0)' : ''),
                                }}
                            >
                                {field.showIcon && field.iconPath && (
                                    <img src={field.iconPath} style={{ width: `${field.iconSize || 48}px`, height: `${field.iconSize || 48}px`, objectFit: 'contain' }} alt="icon" draggable={false} />
                                )}
                                <span>{field.prefix || ''}{displayValue}{field.suffix || ''}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function DynamicOverlayPage() {
    return (
        <Suspense fallback={<div className="bg-slate-900 w-screen h-screen flex text-white font-black items-center justify-center">Loading...</div>}>
            <DynamicOverlayEngine />
        </Suspense>
    );
}
