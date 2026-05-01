"use client"
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '@/lib/api-config';

function PureTelemetryContent() {
    const [fetchedData, setFetchedData] = useState<any[]>([]);

    useEffect(() => {
        const socket = io(WS_URL);
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) setFetchedData(data.activePlayers);
        });
        return () => { socket.disconnect(); };
    }, []);

    const stats = useMemo(() => {
        const s = { kills: 0, knocks: 0, headshots: 0, damage: 0 };
        fetchedData.forEach(p => {
            s.kills += p.killNum || 0;
            s.knocks += p.knockouts || 0;
            s.headshots += p.headShotNum || 0;
            s.damage += p.damage || 0;
        });
        return s;
    }, [fetchedData]);

    // This renders JUST the text, no backgrounds, no containers.
    return (
        <div className="w-screen h-screen relative bg-transparent overflow-hidden text-white font-black italic">
            {/* Top Right Stats example */}
            <div className="absolute top-10 right-10 flex flex-col items-end gap-2 text-6xl">
                 <div className="flex gap-4">
                    <span className="text-2xl text-slate-400 not-italic uppercase tracking-widest mt-auto mb-1">TOTAL KILLS</span>
                    <span className="text-theme-primary drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">{stats.kills.toString().padStart(3, '0')}</span>
                 </div>
                 <div className="flex gap-4">
                    <span className="text-2xl text-slate-400 not-italic uppercase tracking-widest mt-auto mb-1">DAMAGE</span>
                    <span className="text-theme-secondary drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">{Math.round(stats.damage).toString().padStart(5, '0')}</span>
                 </div>
            </div>

            {/* Bottom Left example */}
            <div className="absolute bottom-10 left-10 flex flex-col gap-0">
                 <div className="text-sm text-slate-500 uppercase tracking-[0.5em] mb-1">LIVE TELEMETRY STREAM</div>
                 <div className="h-1 w-32 bg-theme-primary mb-4" />
                 <div className="text-4xl">MATCH DATA: <span className="text-theme-primary">ACTIVE</span></div>
            </div>
        </div>
    );
}

export default function PureTelemetryOverlay() {
    return (
        <Suspense fallback={null}>
            <PureTelemetryContent />
        </Suspense>
    );
}
