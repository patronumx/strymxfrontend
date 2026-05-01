"use client"

import React from 'react';
import { Layers } from 'lucide-react';

interface DesignSwitcherProps {
    currentDesign: 'classic' | 'cards';
    overlayPath: string; // e.g. '/overlay/match-fraggers'
}

/**
 * DesignSwitcher — floating bar at the top of Edit Layout mode.
 * Lets users switch between design variants without leaving the editor.
 */
export default function DesignSwitcher({ currentDesign, overlayPath }: DesignSwitcherProps) {
    const designs = [
        { id: 'classic' as const, label: 'Row List', desc: 'Horizontal rows' },
        { id: 'cards' as const,   label: 'Card Grid', desc: 'Vertical cards' },
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            zIndex: 9999,
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                paddingRight: 10,
                borderRight: '1px solid rgba(255,255,255,0.1)',
            }}>
                <Layers size={12} color="#60a5fa" />
                <span style={{
                    fontSize: 9, fontWeight: 900, color: '#60a5fa',
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                }}>Design</span>
            </div>

            {designs.map(d => {
                const isActive = d.id === currentDesign;
                return (
                    <button
                        key={d.id}
                        onClick={() => {
                            if (d.id === currentDesign) return;
                            window.location.href = `${overlayPath}?edit=true&design=${d.id}`;
                        }}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent',
                            border: isActive ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
                            color: isActive ? '#fff' : '#94a3b8',
                            cursor: isActive ? 'default' : 'pointer',
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            transition: 'all 0.15s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <span>{d.label}</span>
                        <span style={{
                            fontSize: 7, fontWeight: 700,
                            color: isActive ? '#60a5fa' : '#64748b',
                            letterSpacing: '0.15em',
                        }}>{d.desc}</span>
                    </button>
                );
            })}
        </div>
    );
}
