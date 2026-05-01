import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface PlayerStat {
    name: string;
    teamTag: string;
    damage: number;
    elims: number;
    surTime: string;
    photoUrl?: string;
    playerKey?: string;
}

function PlayerPortrait({ photoUrl, playerKey, name, theme }: { 
    photoUrl?: string; 
    playerKey?: string; 
    name: string; 
    theme: any; 
}) {
    const [imgSrc, setImgSrc] = useState<string | null>(
        photoUrl || (playerKey ? `${API_URL}/images/${playerKey}.png` : null)
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!photoUrl && playerKey) {
            setImgSrc(`${API_URL}/images/${playerKey}.png`);
            setFailed(false);
        }
    }, [photoUrl, playerKey]);

    return (
        <div className="absolute left-[0px] w-[95px] h-[95px] rounded-full overflow-hidden flex items-end justify-center bg-gray-200">
            {!failed && imgSrc ? (
                <img 
                    src={imgSrc} 
                    onError={() => {
                        if (imgSrc?.includes(':3000')) {
                            setImgSrc(`${API_URL}/images/${playerKey}.png`);
                        } else {
                            setFailed(true);
                        }
                    }} 
                    className="h-full object-cover relative pointer-events-none" 
                    alt={name} 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-4xl text-white/50 bg-gray-300 uppercase">
                    {name?.charAt(0) || '?'}
                </div>
            )}
        </div>
    );
}

interface GraphicCommand {
    templateUrl?: string;
    action: 'PLAY' | 'STOP' | 'UPDATE' | 'CLEAR';
    data?: any;
}

const mockWinningTeam = {
    teamName: 'TEAM NAME',
    logoUrl: '/placeholder-logo.png', // Fallback
    players: [
        { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: '', playerKey: 'pad-1' },
        { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: '', playerKey: 'pad-2' },
        { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: '', playerKey: 'pad-3' },
        { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: '', playerKey: 'pad-4' },
    ]
};

export default function RamadanWWCDGraphic() {
    const { theme, isDataOnly, isTransparent } = useTheme();
    const [team, setTeam] = useState(mockWinningTeam);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const socket = io(`${API_URL}`);

        socket.on('graphic_command', (cmd: GraphicCommand) => {
            if (cmd.templateUrl?.includes('/overlays/wwcd-stats')) {
                if (cmd.action === 'PLAY') setIsVisible(true);
                else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') setIsVisible(false);
            }
        });

        socket.on('match_state_update', (data: any) => {
            if (data?.activePlayers && Array.isArray(data.activePlayers)) {
                // Group players by teamId
                const teamMap = new Map<number, {
                    teamName: string,
                    logoUrl: string,
                    players: any[],
                    totalKillNum: number,
                    rank: number
                }>();

                data.activePlayers.forEach((p: any) => {
                    if (!teamMap.has(p.teamId)) {
                        teamMap.set(p.teamId, {
                            teamName: p.teamName,
                            logoUrl: p.logoUrl,
                            players: [],
                            totalKillNum: 0,
                            rank: p.rank || 99
                        });
                    }

                    const t = teamMap.get(p.teamId)!;
                    t.players.push(p);
                    t.totalKillNum += (p.killNum || 0);
                    if (p.rank && p.rank < t.rank) t.rank = p.rank;
                });

                // Find the winning team (Rank 1, or highest kills fallback)
                const sortedTeams = Array.from(teamMap.values()).sort((a, b) => {
                    if (a.rank !== b.rank) return a.rank - b.rank; // Rank 1 wins
                    return b.totalKillNum - a.totalKillNum; // Tiebreaker
                });

                if (sortedTeams.length > 0) {
                    const winner = sortedTeams[0];
                    setTeam({
                        teamName: winner.teamName,
                        logoUrl: winner.logoUrl || '/placeholder-logo.png',
                        players: winner.players.map(p => ({
                            name: p.name || 'UNKNOWN',
                            teamTag: winner.teamName || 'TEAM',
                            damage: p.damage || 0,
                            elims: p.killNum || 0,
                            surTime: p.survivalTime ? `${Math.floor(Number(p.survivalTime) / 60)}:${String(Number(p.survivalTime) % 60).padStart(2, '0')}` : '00:00',
                            photoUrl: p.photoUrl,
                            playerKey: p.playerKey
                        }))
                    });
                }
            }
        });

        return () => {
            socket.disconnect();
        }
    }, []);

    // Pad players to ensure there's exactly 4 for layout symmetry
    const displayPlayers = [...team.players];
    while (displayPlayers.length < 4) {
        displayPlayers.push({ name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: '', playerKey: `pad-${displayPlayers.length}` });
    }

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key="ramadan-wwcd-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`w-[1920px] h-[1080px] overflow-hidden relative font-['Inter'] flex bg-transparent`}
                >
                    {/* The Background Template image provided by the Designer */}
                    {!isDataOnly && (
                        <img
                            src="/templates/wwcd-stats.jpg"
                            alt="Background Template"
                            className="absolute inset-0 w-full h-full object-cover z-0"
                        />
                    )}

                    {/* DYNAMIC PLAYER ROWS */}
                    <div className="absolute top-[340px] left-[165px] h-[490px] w-[1400px] z-[10] flex flex-col gap-[35px]">
                        {displayPlayers.slice(0, 4).map((p, i) => (
                            <div key={i} className="flex items-center w-full h-[95px] relative">

                                {/* Photo Area */}
                                <PlayerPortrait 
                                    photoUrl={p.photoUrl} 
                                    playerKey={p.playerKey} 
                                    name={p.name} 
                                    theme={theme} 
                                />

                                {/* Text Area: Absolutely positioned covering the white gap next to photo */}
                                <div className="absolute left-[125px] flex flex-col justify-center h-full w-[280px] bg-white pt-2">
                                    <h3 className="text-[1.8rem] font-black italic uppercase leading-none" style={{ color: theme.primary }}>{p.name || 'NAME'}</h3>
                                    <p className="text-[1.1rem] font-bold text-gray-500 uppercase mt-0 w-fit whitespace-nowrap overflow-hidden text-ellipsis">{p.teamTag || 'TEAM'}</p>
                                </div>

                                {/* Stats Area: Covering the 3 large placeholder numbers perfectly inside the green rows */}
                                <div className="absolute left-[475px] w-[800px] h-full flex items-center pt-5 pl-2">
                                    {/* Damage block, covering the 000 */}
                                    <div className="w-[180px] text-center" style={{ backgroundColor: theme.secondary }}>
                                        <p className="text-[3rem] tracking-tight font-black italic leading-none" style={{ color: theme.primary }}>{Math.round(p.damage || 0).toString().padStart(3, '0')}</p>
                                    </div>

                                    {/* Elims block */}
                                    <div className="w-[180px] ml-[50px] text-center" style={{ backgroundColor: theme.secondary }}>
                                        <p className="text-[3rem] tracking-tight font-black italic leading-none" style={{ color: theme.primary }}>{(p.elims || 0).toString().padStart(2, '0')}</p>
                                    </div>

                                    {/* Sur Time block */}
                                    <div className="w-[180px] ml-[50px] text-center" style={{ backgroundColor: theme.secondary }}>
                                        <p className="text-[3rem] tracking-tight font-black italic leading-none" style={{ color: theme.primary }}>{p.surTime || '00:00'}</p>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>

                    {/* DYNAMIC TEAM LOGOS */}
                    {/* The designer left an empty space next to the WWCD Text for Team Logos */}
                    <div className="absolute top-[480px] right-[100px] w-[200px] h-[100px] z-[12] flex items-center justify-center gap-4">
                        <img src={team.logoUrl || '/placeholder-logo.png'} className="h-full max-w-[80px] object-contain drop-shadow-md mix-blend-multiply" alt="Logo" />
                        <div className="w-[2px] h-[80%] bg-black/20" />
                        <img src={team.logoUrl || '/placeholder-logo.png'} className="h-full max-w-[80px] object-contain drop-shadow-md mix-blend-multiply" alt="Logo" />
                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    );
}
