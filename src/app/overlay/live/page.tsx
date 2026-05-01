import { API_URL } from '@/lib/api-config';
"use client";
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import { OverlayTemplate, OverlayField } from '@/app/dashboard/overlay-designer/page';

function LiveOverlayContent() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get('templateId') || 'demo';

    // In a real scenario, this would be fetched from /api/templates/:id
    // For now we'll simulate a fetched template with some hardcoded fields to test
    const [template, setTemplate] = useState<OverlayTemplate | null>(null);
    const [liveData, setLiveData] = useState<any[]>([]);

    useEffect(() => {
        // Mock fetch template
        const fetchDemoTemplate = async () => {
            setTemplate({
                id: 'demo',
                name: 'Match Rankings Demo',
                backgroundUrl: '/assets/ramadan_wwcd.png',
                overlayType: 'match_ranking',
                fields: [
                    { id: 'f1', variable: 'team_1_name', x: 400, y: 300, width: 300, height: 60, fontSize: 40, fontFamily: 'Inter', color: '#ffffff', fontWeight: 800, textAlign: 'left', isUppercase: true, prefix: '', suffix: '', visible: true, colorType: 'white' },
                    { id: 'f2', variable: 'team_1_elims', x: 800, y: 300, width: 100, height: 60, fontSize: 40, fontFamily: 'Inter', color: '#ff0000', fontWeight: 900, textAlign: 'center', isUppercase: false, prefix: '', suffix: ' KLLS', visible: true, colorType: 'primary' }
                ],
                theme: { primary: '#f59e0b', secondary: '#78350f', accent: '#fef3c7' }
            });
        };
        fetchDemoTemplate();
    }, [templateId]);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        socket.on('connect', () => console.log('Live Overlay connected to live data feed'));
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) setLiveData(data.activePlayers);
        });
        return () => { socket.disconnect(); };
    }, []);

    // Process live data into variables mapped for the UI
    const processedVars = useMemo(() => {
        const vars: Record<string, string | number> = {};
        
        if (!liveData || liveData.length === 0) return vars;

        const teamMap = new Map<string, any>();
        let totalKills = 0;
        let totalKnocks = 0;
        let totalHeadshots = 0;

        liveData.forEach((p: any) => {
            const nameStr = p.playerName || p.PlayerName || '';
            if ((nameStr === '' || nameStr === 'Unknown') && (!p.damage && !p.killNum)) return;

            const tName = p.teamName || p.teamId || 'Unknown';
            if (!teamMap.has(tName)) {
                teamMap.set(tName, { teamName: tName, elims: 0, placePts: 0, totalPts: 0, players: [], wwcd: 0 });
            }

            const team = teamMap.get(tName);
            team.players.push(p);
            team.elims += (p.killNum || p.KillNum || 0);
            team.placePts = Math.max(team.placePts, p.placePts || 0);
            
            totalKills += (p.killNum || 0);
            totalKnocks += (p.knockNum || 0);
            totalHeadshots += (p.headshotNum || 0);
        });

        const sortedTeams = Array.from(teamMap.values()).map(t => ({
            ...t,
            totalPts: t.elims + t.placePts
        })).sort((a, b) => b.totalPts - a.totalPts);

        // Bind Match Level
        vars['match_number'] = '1/16'; // Usually passed via tourney settings
        vars['match_total_kills'] = totalKills;
        vars['match_total_knocks'] = totalKnocks;
        vars['match_total_headshots'] = totalHeadshots;

        // Bind Top Fragger
        const sortedPlayers = [...liveData].sort((a, b) => (b.killNum || 0) - (a.killNum || 0));
        if (sortedPlayers.length > 0) {
            vars['top_fragger_name'] = sortedPlayers[0].playerName || sortedPlayers[0].PlayerName || 'Unknown';
            vars['top_fragger_kills'] = sortedPlayers[0].killNum || 0;
        }

        // Bind Team variables (1 to 16)
        sortedTeams.forEach((team, index) => {
            const pos = index + 1; // 1-based ranking index
            if (pos > 16) return;

            vars[`team_${pos}_rank`] = pos;
            vars[`team_${pos}_name`] = team.teamName;
            vars[`team_${pos}_place_pts`] = team.placePts;
            vars[`team_${pos}_elims`] = team.elims;
            vars[`team_${pos}_total_pts`] = team.totalPts;
            vars[`team_${pos}_wwcd`] = team.wwcd;
            
            // Bind top players for the #1 team
            if (pos === 1) {
                const teamPlayers = [...team.players].sort((a, b) => (b.killNum || 0) - (a.killNum || 0));
                for(let p = 0; p < 4; p++) {
                    const player = teamPlayers[p];
                    if (player) {
                        vars[`top_team_player_${p+1}_name`] = player.playerName || player.PlayerName;
                        vars[`top_team_player_${p+1}_kills`] = player.killNum || 0;
                        vars[`top_team_player_${p+1}_damage`] = Math.round(player.damage || 0);
                    } else {
                        vars[`top_team_player_${p+1}_name`] = '-';
                        vars[`top_team_player_${p+1}_kills`] = '0';
                        vars[`top_team_player_${p+1}_damage`] = '0';
                    }
                }
            }
        });

        return vars;
    }, [liveData]);

    if (!template) return <div className="h-screen bg-transparent flex items-center justify-center text-white">Loading template...</div>;

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyItems: 'center', alignItems: 'center', backgroundColor: 'transparent', overflow: 'hidden' }}>
            <div 
                className="relative font-sans border-none overflow-hidden"
                style={{ 
                    width: '1920px', 
                    height: '1080px', 
                    backgroundImage: `url(${template.backgroundUrl})`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    // Optional scaling approach if you wanted it to fit smaller monitors while testing
                    // transform: `scale(${Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1)})`,
                    // transformOrigin: 'center center'
                }}
            >
                {template.fields.map(field => {
                    const rawValue = processedVars[field.variable];
                    
                    // Fallback to "WAITING..." if data hasn't arrived for this specifically mapped node yet
                    const displayVal = rawValue !== undefined ? String(rawValue) : 'WAITING FOR DATA';
                    const finalString = `${field.prefix}${field.isUppercase ? displayVal.toUpperCase() : displayVal}${field.suffix}`;

                    return (
                        <div 
                            key={field.id}
                            style={{
                                position: 'absolute',
                                left: field.x,
                                top: field.y,
                                width: field.width,
                                height: field.height,
                                fontSize: `${field.fontSize}px`,
                                fontFamily: field.fontFamily,
                                color: field.colorType === 'primary' ? template.theme.primary : 
                                       field.colorType === 'secondary' ? template.theme.secondary :
                                       field.colorType === 'accent' ? template.theme.accent :
                                       field.colorType === 'white' ? '#ffffff' : field.color,
                                fontWeight: field.fontWeight,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {finalString}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function LiveOverlayPage() {
    return (
        <Suspense fallback={<div className="bg-transparent" />}>
            <LiveOverlayContent />
        </Suspense>
    );
}
