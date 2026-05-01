import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Trophy, Users } from 'lucide-react';
import EditableElement from '@/components/EditableElement';
import OverallRankingsPremium from '@/components/ui/OverallRankingsPremium';

interface StandingRow {
    rank: number;
    teamId: string;
    teamName: string;
    logoUrl: string | null;
    matchesPlayed: number;
    placementPoints: number;
    killPoints: number;
    totalPoints: number;
    wwcd: number;
    totalDamage: number;
    totalKnocks: number;
    totalKills: number;
}

function StandingsContent() {
    const { theme } = useTheme();
    const searchParams = useSearchParams();
    const tournamentId = searchParams.get('tournamentId');
    const dayNumber = searchParams.get('dayNumber');
    const isTransparent = searchParams.get('transparent') === 'true';
    
    const [standings, setStandings] = useState<StandingRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tournamentId) return;

        const fetchStandings = async () => {
            try {
                let url = `${API_URL}/api/tournaments/${tournamentId}/standings`;
                if (dayNumber) url += `?dayNumber=${dayNumber}`;
                
                const res = await fetch(url);
                const data = await res.json();
                setStandings(data);
            } catch (err) {
                console.error("Failed to fetch standings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStandings();
        // Refresh every 30 seconds for live updates
        const interval = setInterval(fetchStandings, 30000);
        return () => clearInterval(interval);
    }, [tournamentId, dayNumber]);

    if (!tournamentId) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black uppercase tracking-tighter text-4xl">
                Tournament ID Required
            </div>
        );
    }

    return (
        <div className={`w-[1920px] h-[1080px] overflow-hidden relative ${isTransparent ? 'bg-transparent' : 'bg-slate-950'}`}>
            {/* Header */}
            <EditableElement id="header" defaultPosition={{ x: 60, y: 60 }} defaultSize={{ width: 860, height: 76 }}>
                <div className="flex items-center justify-between px-3">
                    <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                            <Trophy className="text-amber-500" size={40} />
                            Overall Standings
                        </h2>
                        <div className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs mt-1">
                            {dayNumber ? `Day ${dayNumber} Results` : 'Cumulative Tournament Progress'}
                        </div>
                    </div>
                </div>
            </EditableElement>

            {/* Table Header */}
            <EditableElement id="table-head" defaultPosition={{ x: 60, y: 156 }} defaultSize={{ width: 860, height: 28 }}>
                {/* grid: rank | logo+name | M | WWCD | PLACE | DMG | KNK | KLS | TOTAL */}
                <div className="grid items-center text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 px-3 pb-2 h-full"
                    style={{ gridTemplateColumns: '52px 40px 1fr 52px 52px 52px 76px 68px 68px 86px' }}>
                    <div className="text-center">#</div>
                    <div></div>
                    <div>Team</div>
                    <div className="text-center">M</div>
                    <div className="text-center text-amber-400">WWCD</div>
                    <div className="text-center text-blue-400">PLACE</div>
                    <div className="text-center text-orange-400">DMG</div>
                    <div className="text-center text-purple-400">KNK</div>
                    <div className="text-center text-rose-400">ELIMS</div>
                    <div className="text-center text-white">TOTAL</div>
                </div>
            </EditableElement>

            {/* Rows */}
            {loading ? (
                <div className="absolute left-[60px] top-[200px] w-[860px] py-16 text-center font-mono text-slate-700 animate-pulse">Loading standings data...</div>
            ) : standings.length === 0 ? (
                <div className="absolute left-[60px] top-[200px] w-[860px] py-16 text-center text-slate-700 font-black uppercase">No Data Available</div>
            ) : (
                standings.slice(0, 16).map((item, index) => (
                    <EditableElement 
                        key={item.teamId} 
                        id={`row-${item.rank}`} 
                        defaultPosition={{ x: 60, y: 190 + (index * 49) }} 
                        defaultSize={{ width: 860, height: 46 }}
                    >
                        <div 
                            className="grid h-[46px] items-center rounded-lg transition-all border border-transparent shadow-lg"
                            style={{ 
                                gridTemplateColumns: '52px 40px 1fr 52px 52px 52px 76px 68px 68px 86px',
                                backgroundColor: item.rank <= 3 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.55)',
                                backdropFilter: 'blur(16px)',
                                borderColor: item.rank === 1 ? 'rgba(245,158,11,0.25)' : 'transparent'
                            }}
                        >
                            {/* Rank */}
                            <div className="flex justify-center">
                                <span className={`text-base font-black ${item.rank === 1 ? 'text-amber-400' : item.rank <= 3 ? 'text-slate-300' : 'text-slate-500'}`}>
                                    #{item.rank}
                                </span>
                            </div>

                            {/* Logo */}
                            <div className="flex justify-center">
                                <div className="w-8 h-8 rounded-md bg-slate-900 border border-slate-700/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {item.logoUrl ? (
                                        <img src={item.logoUrl} alt={item.teamName} className="w-full h-full object-contain p-0.5" />
                                    ) : (
                                        <Users size={13} className="text-slate-600" />
                                    )}
                                </div>
                            </div>

                            {/* Team Name */}
                            <div className="overflow-hidden pr-2">
                                <span className="font-black text-white text-[14px] uppercase tracking-tight truncate block">
                                    {item.teamName.replace(/^scout\s+/i, '')}
                                </span>
                            </div>

                            {/* Matches */}
                            <div className="text-center font-bold text-slate-400 text-xs">{item.matchesPlayed}</div>

                            {/* WWCD */}
                            <div className="text-center font-black text-amber-400 text-sm">{item.wwcd}</div>

                            {/* Placement Pts */}
                            <div className="text-center font-bold text-blue-400 text-xs">{item.placementPoints}</div>

                            {/* Total Damage */}
                            <div className="text-center font-bold text-orange-400 text-xs">
                                {Math.round(item.totalDamage || 0).toLocaleString()}
                            </div>

                            {/* Total Knocks */}
                            <div className="text-center font-bold text-purple-400 text-sm">{item.totalKnocks || 0}</div>

                            {/* Total Kills (Gen Kills / Elims) */}
                            <div className="text-center font-bold text-rose-400 text-sm">{item.totalKills || 0}</div>

                            {/* Total Points */}
                            <div className="text-center font-black text-white text-lg bg-white/5 h-full flex items-center justify-center rounded-r-lg border-l border-slate-800/60">
                                {item.totalPoints}
                            </div>
                        </div>
                    </EditableElement>
                ))
            )}

            {/* Footer */}
            {standings.length > 0 && (
                <EditableElement 
                    id="footer" 
                    defaultPosition={{ x: 60, y: 190 + (Math.min(standings.length, 16) * 49) + 20 }} 
                    defaultSize={{ width: 860, height: 40 }}
                >
                    <div className="pt-4 border-t border-slate-900 flex justify-between items-center px-3 h-full">
                        <div className="flex gap-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-700">
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> M: Matches</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> WWCD</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> DMG: Total Damage</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> KNK: Knocks</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> ELIMS: Kills</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-800 uppercase italic">Strimx Production Engine v2.0</div>
                    </div>
                </EditableElement>
            )}
        </div>
    );
}

function OverallStandingsRouter() {
    const searchParams = useSearchParams();
    const design = searchParams.get('design') || 'premium';

    if (design === 'premium') {
        return <OverallRankingsPremium />;
    }

    return <StandingsContent />;
}

export default function OverallStandingsOverlay() {
    return (
        <Suspense fallback={<div className="h-screen bg-slate-950 flex items-center justify-center text-slate-700 font-black animate-pulse uppercase tracking-[0.4em]">Initializing Stream Overlay</div>}>
            <OverallStandingsRouter />
        </Suspense>
    );
}
