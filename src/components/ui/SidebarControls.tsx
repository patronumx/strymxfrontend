"use client"

import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { BROADCAST_FONTS } from './broadcastFonts';

/**
 * SidebarControls
 * ───────────────
 * Shared UI components for all overlay edit sidebars.
 * Import from here instead of duplicating across sidebars.
 */

// ── COLOR PICKER WITH HEX INPUT ────────────────────────────

export function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const safeHex = toSafeHex(value);
    const [hexInput, setHexInput] = useState(safeHex);
    const [focused, setFocused] = useState(false);

    // Sync input when value changes externally (e.g. from preset)
    useEffect(() => {
        if (!focused) setHexInput(toSafeHex(value));
    }, [value, focused]);

    const handleHexSubmit = () => {
        let v = hexInput.trim();
        if (!v.startsWith('#')) v = '#' + v;
        // Validate: must be #RGB, #RRGGBB, or #RRGGBBAA
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) {
            // Expand 3-char shorthand
            if (v.length === 4) {
                v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
            }
            onChange(v);
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.05)',
            gap: 8,
        }}>
            <span style={{
                fontSize: 11, fontWeight: 700, color: '#e2e8f0',
                flex: '0 0 auto', maxWidth: '35%',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{label}</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                {/* Editable hex input */}
                <input
                    type="text"
                    value={hexInput.toUpperCase()}
                    onChange={e => setHexInput(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => { setFocused(false); handleHexSubmit(); }}
                    onKeyDown={e => { if (e.key === 'Enter') { handleHexSubmit(); (e.target as HTMLInputElement).blur(); } }}
                    style={{
                        width: 80, padding: '4px 6px', fontSize: 10,
                        fontFamily: 'ui-monospace, monospace', fontWeight: 700,
                        color: '#cbd5e1', background: 'rgba(0,0,0,0.3)',
                        border: focused ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 6, outline: 'none', textAlign: 'center',
                        transition: 'border-color 0.15s',
                    }}
                />
                {/* Color swatch picker */}
                <div style={{
                    position: 'relative', width: 30, height: 30, borderRadius: 8,
                    border: '2px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer', overflow: 'hidden',
                    backgroundColor: value,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                }}>
                    <input
                        type="color"
                        value={safeHex}
                        onChange={e => onChange(e.target.value)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                </div>
            </div>
        </div>
    );
}

function toSafeHex(value: string): string {
    if (!value || value === 'transparent') return '#000000';
    if (value.startsWith('#') && value.length === 7) return value;
    if (value.startsWith('#') && value.length === 9) return value.slice(0, 7);
    if (value.startsWith('#') && value.length === 4) {
        return '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
    }
    return '#000000';
}

// ── FONT PICKER WITH CUSTOM FONT OPTION ────────────────────

const CUSTOM_FONT_STORAGE_KEY = 'strymx_custom_fonts';

interface CustomFont {
    name: string;
    url: string;
}

function loadCustomFonts(): CustomFont[] {
    try {
        const raw = localStorage.getItem(CUSTOM_FONT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveCustomFonts(fonts: CustomFont[]) {
    localStorage.setItem(CUSTOM_FONT_STORAGE_KEY, JSON.stringify(fonts));
}

function injectCustomFont(name: string, url: string) {
    if (typeof document === 'undefined') return;
    const id = `custom-font-${name.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
        @font-face {
            font-family: '${name}';
            src: url('${url}');
            font-display: swap;
        }
    `;
    document.head.appendChild(style);
}

export function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFontName, setNewFontName] = useState('');
    const [newFontUrl, setNewFontUrl] = useState('');

    useEffect(() => {
        const loaded = loadCustomFonts();
        setCustomFonts(loaded);
        loaded.forEach(f => injectCustomFont(f.name, f.url));
    }, []);

    const currentFont = BROADCAST_FONTS.find(f => f.id === value);
    const currentCustom = customFonts.find(f => f.name === value);
    const previewFamily = currentFont?.family || (currentCustom ? `'${currentCustom.name}', sans-serif` : 'Impact, sans-serif');
    const displayName = currentFont?.name || currentCustom?.name || value;

    const handleAddFont = () => {
        const name = newFontName.trim();
        const url = newFontUrl.trim();
        if (!name || !url) return;
        injectCustomFont(name, url);
        const updated = [...customFonts, { name, url }];
        setCustomFonts(updated);
        saveCustomFonts(updated);
        onChange(name);
        setNewFontName('');
        setNewFontUrl('');
        setShowAddForm(false);
    };

    const handleRemoveFont = (fontName: string) => {
        const updated = customFonts.filter(f => f.name !== fontName);
        setCustomFonts(updated);
        saveCustomFonts(updated);
        if (value === fontName) onChange('impact');
    };

    return (
        <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.05)',
        }}>
            <div style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10,
            }}>{label}</div>

            {/* Preview */}
            <div style={{
                padding: '14px 12px',
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 8, marginBottom: 10, textAlign: 'center', overflow: 'hidden',
            }}>
                <div style={{
                    fontFamily: previewFamily, fontSize: 26, fontWeight: 900,
                    color: '#fff', lineHeight: 1, letterSpacing: '-0.02em',
                }}>PLAYER NAME</div>
                <div style={{
                    fontSize: 8, fontWeight: 700, color: '#60a5fa',
                    letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6,
                }}>{displayName}</div>
            </div>

            {/* Built-in fonts grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {BROADCAST_FONTS.map(f => {
                    const isActive = f.id === value;
                    return (
                        <button
                            key={f.id}
                            onClick={() => onChange(f.id)}
                            style={{
                                padding: '10px 8px', borderRadius: 8,
                                background: isActive ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.03)',
                                border: isActive ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
                                color: isActive ? '#fff' : '#cbd5e1',
                                cursor: 'pointer', fontFamily: f.family, fontSize: 13, fontWeight: 900,
                                letterSpacing: '-0.02em', textAlign: 'center',
                                transition: 'all 0.15s', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                        >{f.name}</button>
                    );
                })}
            </div>

            {/* Custom fonts section */}
            {customFonts.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <div style={{
                        fontSize: 8, fontWeight: 900, color: '#60a5fa',
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        marginBottom: 8, paddingBottom: 6,
                        borderTop: '1px solid rgba(59,130,246,0.15)',
                        paddingTop: 10,
                    }}>Custom Fonts</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                        {customFonts.map(f => {
                            const isActive = f.name === value;
                            return (
                                <div key={f.name} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => onChange(f.name)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 8px', borderRadius: 8,
                                            background: isActive ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.03)',
                                            border: isActive ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.06)',
                                            color: isActive ? '#fff' : '#cbd5e1',
                                            cursor: 'pointer',
                                            fontFamily: `'${f.name}', sans-serif`,
                                            fontSize: 13, fontWeight: 900,
                                            textAlign: 'center',
                                            transition: 'all 0.15s',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}
                                    >{f.name}</button>
                                    <button
                                        onClick={() => handleRemoveFont(f.name)}
                                        style={{
                                            position: 'absolute', top: -4, right: -4,
                                            width: 16, height: 16, borderRadius: 999,
                                            background: '#ef4444', border: 'none', color: '#fff',
                                            fontSize: 9, fontWeight: 900, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            lineHeight: 1,
                                        }}
                                    >×</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add custom font form */}
            {!showAddForm ? (
                <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                        width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px dashed rgba(16,185,129,0.35)',
                        color: '#34d399', fontSize: 9, fontWeight: 900,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}
                >+ Add Custom Font</button>
            ) : (
                <div style={{
                    marginTop: 10, padding: 12, borderRadius: 10,
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    <div style={{
                        fontSize: 9, fontWeight: 900, color: '#34d399',
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}>Add Custom Font</div>
                    <input
                        type="text"
                        placeholder="Font Name (e.g. Montserrat)"
                        value={newFontName}
                        onChange={e => setNewFontName(e.target.value)}
                        style={{
                            width: '100%', padding: '8px 10px', fontSize: 11, fontWeight: 700,
                            color: '#fff', background: 'rgba(15,23,42,0.8)',
                            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Google Fonts URL or .woff2 / .ttf URL"
                        value={newFontUrl}
                        onChange={e => setNewFontUrl(e.target.value)}
                        style={{
                            width: '100%', padding: '8px 10px', fontSize: 11, fontWeight: 700,
                            color: '#fff', background: 'rgba(15,23,42,0.8)',
                            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                    <div style={{
                        fontSize: 8, color: '#64748b', lineHeight: 1.4,
                    }}>
                        Paste a direct font file URL (.woff2, .ttf, .otf) or a Google Fonts CSS URL.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setShowAddForm(false)}
                            style={{
                                flex: 1, padding: '8px 10px', borderRadius: 6,
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', fontSize: 9, fontWeight: 900,
                                letterSpacing: '0.1em', textTransform: 'uppercase',
                                cursor: 'pointer',
                            }}
                        >Cancel</button>
                        <button
                            onClick={handleAddFont}
                            disabled={!newFontName.trim() || !newFontUrl.trim()}
                            style={{
                                flex: 1, padding: '8px 10px', borderRadius: 6,
                                background: newFontName.trim() && newFontUrl.trim()
                                    ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${newFontName.trim() && newFontUrl.trim()
                                    ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                color: newFontName.trim() && newFontUrl.trim() ? '#34d399' : '#64748b',
                                fontSize: 9, fontWeight: 900,
                                letterSpacing: '0.1em', textTransform: 'uppercase',
                                cursor: newFontName.trim() && newFontUrl.trim() ? 'pointer' : 'not-allowed',
                            }}
                        >Add Font</button>
                    </div>
                </div>
            )}
        </div>
    );
}
