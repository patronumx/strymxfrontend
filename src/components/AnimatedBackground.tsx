"use client"
import React from 'react';

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-slate-950 pointer-events-none" style={{ background: '#020617' }}>

            {/* Ambient gradients */}
            <div
                className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[100px] mix-blend-screen"
                style={{ animation: 'pulse-opacity 8s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            ></div>
            <div
                className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/30 blur-[120px] mix-blend-screen"
                style={{ animation: 'pulse-opacity 8s cubic-bezier(0.4, 0, 0.6, 1) infinite 2s' }}
            ></div>

            {/* Subtle grid pattern for tactical feel */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CgkJPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJub25lIi8+CgkJPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAxNSkiLz4KCTwvc3ZnPg==')] opacity-50"></div>

            {/* Floating particles/shapes */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute top-[20%] left-[10%] w-64 h-64 bg-gradient-to-tr from-blue-500/30 to-transparent rounded-full blur-3xl"
                    style={{ animation: 'float 15s ease-in-out infinite' }}
                ></div>
                <div
                    className="absolute top-[60%] left-[80%] w-96 h-96 bg-gradient-to-br from-indigo-500/30 to-transparent rounded-full blur-3xl"
                    style={{ animation: 'float 12s ease-in-out infinite 2s' }}
                ></div>
                <div
                    className="absolute top-[80%] left-[30%] w-72 h-72 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-full blur-3xl"
                    style={{ animation: 'float 10s ease-in-out infinite' }}
                ></div>
            </div>

            {/* Optional scanline overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20 mix-blend-overlay"></div>

            {/* Inject Global Keyframes so they are available to inline styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-20px) scale(1.05); }
                }
                @keyframes pulse-opacity {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.7; }
                }
            `}} />
        </div>
    );
}
