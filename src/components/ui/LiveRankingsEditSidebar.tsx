"use client"

import React, { useState, ReactNode } from 'react';
import { Eye, Type, Paintbrush, Sliders, RotateCcw, Save, X, Layers, Move, Activity, Copy, Check } from 'lucide-react';
import type { ElementStyle, ElementTransform } from './EditableGraphicElement';
import { ColorRow, FontPicker } from './SidebarControls';

export interface LayoutElementDef {
    id: string;
    label: string;
}

interface LiveRankingsEditSidebarProps {
    elements: LayoutElementDef[];
    elementStyles: Record<string, ElementStyle>;
    elementTransforms: Record<string, ElementTransform>;
    onStyleChange: (elementId: string, patch: Partial<ElementStyle>) => void;
    onTransformChange: (elementId: string, patch: Partial<ElementTransform>) => void;
    onStyleChangeAll: (patch: Partial<ElementStyle>) => void;
    onReset: () => void;
    onClose: () => void;
    onSave: () => Promise<boolean> | boolean;
    selectedId?: string | null;
    obsUrlPath: string;
}

type TabId = 'layout' | 'visibility' | 'text' | 'colors' | 'typography' | 'appearance';

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'layout',     label: 'Size',   icon: Move },
    { id: 'visibility', label: 'Show',   icon: Eye },
    { id: 'text',       label: 'Text',   icon: Type },
    { id: 'colors',     label: 'Colors', icon: Paintbrush },
    { id: 'typography', label: 'Fonts',  icon: Layers },
    { id: 'appearance', label: 'Style',  icon: Sliders },
];

export default function LiveRankingsEditSidebar({
    elements,
    elementStyles,
    elementTransforms,
    onStyleChange,
    onTransformChange,
    onStyleChangeAll,
    onReset,
    onClose,
    onSave,
    selectedId,
    obsUrlPath,
}: LiveRankingsEditSidebarProps) {
    const [activeTab, setActiveTab] = useState<TabId>('colors');
    const [elementScope, setElementScope] = useState<'all' | string>('all');
    const [copied, setCopied] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const handleSave = async () => {
        setSaveState('saving');
        try {
            const ok = await Promise.resolve(onSave());
            setSaveState(ok ? 'saved' : 'error');
        } catch {
            setSaveState('error');
        }
        setTimeout(() => setSaveState('idle'), 2500);
    };

    const fullObsUrl = typeof window !== 'undefined' ? `${window.location.origin}${obsUrlPath}` : obsUrlPath;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(fullObsUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Failed to copy URL', err);
        }
    };

    const get = (id: string, key: keyof ElementStyle, fallback: any) => {
        const s = elementStyles[id];
        return s && s[key] !== undefined ? (s[key] as any) : fallback;
    };

    const getT = (id: string, key: keyof ElementTransform, fallback: number) => {
        const t = elementTransforms[id];
        return t && t[key] !== undefined ? (t[key] as number) : fallback;
    };

    const applyColor = (key: keyof ElementStyle, value: any) => {
        if (elementScope === 'all') {
            onStyleChangeAll({ [key]: value } as Partial<ElementStyle>);
        } else {
            onStyleChange(elementScope, { [key]: value } as Partial<ElementStyle>);
        }
    };

    const readCurrent = (key: keyof ElementStyle, fallback: any) => {
        const target = elementScope === 'all' ? (elements[0]?.id || '') : elementScope;
        return get(target, key, fallback);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 16, right: 16, bottom: 16,
                width: 400,
                background: 'rgba(10,16,30,0.97)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                backdropFilter: 'blur(24px)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                zIndex: 9998,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            <style>{`
                .lr-scroll::-webkit-scrollbar { width: 10px; }
                .lr-scroll::-webkit-scrollbar-track { background: transparent; }
                .lr-scroll::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.3); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
                .lr-scroll::-webkit-scrollbar-thumb:hover { background: rgba(249,115,22,0.5); border: 2px solid transparent; background-clip: padding-box; }
                .lr-input:focus { border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }
            `}</style>

            {/* Header */}
            <div style={{
                padding: 18, borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(180deg, rgba(249,115,22,0.08), transparent)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: 'rgba(249,115,22,0.18)',
                        border: '1px solid rgba(249,115,22,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(249,115,22,0.2)',
                    }}>
                        <Activity size={16} color="#fdba74" />
                    </div>
                    <div>
                        <div style={{
                            fontSize: 13, fontWeight: 900, color: '#fff',
                            textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.1,
                        }}>Live Rankings</div>
                        <div style={{
                            fontSize: 9, fontWeight: 800, color: '#64748b',
                            letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 3,
                        }}>Premium Editor</div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#94a3b8', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Tab Bar */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3,
                padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.5)', flexShrink: 0,
            }}>
                {TABS.map(t => {
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                padding: '10px 4px', borderRadius: 8,
                                background: isActive ? 'rgba(249,115,22,0.18)' : 'transparent',
                                border: isActive ? '1px solid rgba(249,115,22,0.4)' : '1px solid transparent',
                                color: isActive ? '#fdba74' : '#64748b',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <t.icon size={14} />
                            <span style={{
                                fontSize: 8, fontWeight: 900, letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                            }}>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Body */}
            <div
                className="lr-scroll"
                style={{
                    flex: 1, overflowY: 'auto', overflowX: 'hidden',
                    padding: 20, minHeight: 0,
                }}
            >
                {/* SIZE / LAYOUT TAB */}
                {activeTab === 'layout' && (
                    <Section title="Position & Size" hint="Exact X, Y, width, height for layout elements">
                        {elements.map(el => (
                            <LayoutRow
                                key={el.id}
                                label={el.label}
                                isSelected={selectedId === el.id}
                                x={getT(el.id, 'x', 0)}
                                y={getT(el.id, 'y', 0)}
                                width={getT(el.id, 'width', 180)}
                                height={getT(el.id, 'height', 280)}
                                onXChange={v => onTransformChange(el.id, { x: v })}
                                onYChange={v => onTransformChange(el.id, { y: v })}
                                onWidthChange={v => onTransformChange(el.id, { width: v })}
                                onHeightChange={v => onTransformChange(el.id, { height: v })}
                            />
                        ))}
                    </Section>
                )}

                {/* VISIBILITY TAB */}
                {activeTab === 'visibility' && (
                    <Section title="Show / Hide Elements" hint="Toggle specific overlay elements on or off">
                        {elements.map(el => (
                            <ToggleRow
                                key={el.id}
                                label={el.label}
                                value={get(el.id, 'visible', true) !== false}
                                onChange={v => onStyleChange(el.id, { visible: v })}
                            />
                        ))}
                    </Section>
                )}

                {/* TEXT TAB */}
                {activeTab === 'text' && (
                    <Section title="Labels & Content" hint="Rename labels in the overlay">
                        {elements.map(el => (
                            <TextField
                                key={el.id}
                                label={el.label + ' Text'}
                                value={get(el.id, 'text', el.label)}
                                onChange={v => onStyleChange(el.id, { text: v })}
                                placeholder={el.label}
                            />
                        ))}
                    </Section>
                )}

                {/* COLORS TAB */}
                {activeTab === 'colors' && (
                    <>
                        <div style={{
                            padding: 12, borderRadius: 10,
                            background: 'rgba(249,115,22,0.08)',
                            border: '1px solid rgba(249,115,22,0.25)',
                            marginBottom: 16,
                        }}>
                            <div style={{
                                fontSize: 9, fontWeight: 900, color: '#fdba74',
                                letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
                            }}>Editing Element</div>
                            <select
                                value={elementScope}
                                onChange={e => setElementScope(e.target.value)}
                                className="lr-input"
                                style={{
                                    width: '100%', padding: '8px 12px', fontSize: 11, fontWeight: 700,
                                    color: '#fff', background: 'rgba(15,23,42,0.9)',
                                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                                    outline: 'none', cursor: 'pointer',
                                }}
                            >
                                <option value="all">All Elements (Global Sync)</option>
                                {elements.map(e => (
                                    <option key={e.id} value={e.id}>{e.label} ONLY</option>
                                ))}
                            </select>
                        </div>

                        {elementScope === 'lr-table' ? (
                            <>
                                <Group title="Table Styling">
                                    <ColorRow label="Row BG Primary" value={readCurrent('bgColor', '#1e293b')} onChange={v => applyColor('bgColor', v)} />
                                    <ColorRow label="Row BG Secondary" value={readCurrent('gradientEnd', '#0f172a')} onChange={v => applyColor('gradientEnd', v)} />
                                    <ColorRow label="Border Color" value={readCurrent('borderColor', '#334155')} onChange={v => applyColor('borderColor', v)} />
                                </Group>
                                <Group title="Table Text">
                                    <ColorRow label="Rank BG Color" value={readCurrent('gradientStart', '#f43f5e')} onChange={v => applyColor('gradientStart', v)} />
                                    <ColorRow label="Rank Text Color" value={readCurrent('shadowColor', '#ffffff')} onChange={v => applyColor('shadowColor', v)} />
                                    <ColorRow label="Team Name Color" value={readCurrent('textColor', '#ffffff')} onChange={v => applyColor('textColor', v)} />
                                    <ColorRow label="Elims Color" value={readCurrent('glowColor', '#f43f5e')} onChange={v => applyColor('glowColor', v)} />
                                </Group>
                            </>
                        ) : elementScope === 'lr-header' ? (
                            <>
                                <Group title="Header Styling">
                                    <ColorRow label="Header BG" value={readCurrent('gradientStart', '#fd5564')} onChange={v => applyColor('gradientStart', v)} />
                                    <ColorRow label="Header Text" value={readCurrent('textColor', '#ffffff')} onChange={v => applyColor('textColor', v)} />
                                </Group>
                            </>
                        ) : elementScope === 'lr-portraits' ? (
                            <>
                                <Group title="Portrait Styling">
                                    <ColorRow label="Portrait Grid BG" value={readCurrent('bgColor', '#003340')} onChange={v => applyColor('bgColor', v)} />
                                </Group>
                            </>
                        ) : elementScope === 'lr-legend' ? (
                            <>
                                <Group title="Legend Styling">
                                    <ColorRow label="Legend BG" value={readCurrent('bgColor', '#ffffff')} onChange={v => applyColor('bgColor', v)} />
                                    <ColorRow label="Legend Text" value={readCurrent('textColor', '#000000')} onChange={v => applyColor('textColor', v)} />
                                </Group>
                            </>
                        ) : (
                            <>
                                <Group title="Global Backgrounds">
                                    <ColorRow label="Primary BG" value={readCurrent('bgColor', '#1e293b')} onChange={v => applyColor('bgColor', v)} />
                                    <ColorRow label="Secondary BG" value={readCurrent('gradientEnd', '#0f172a')} onChange={v => applyColor('gradientEnd', v)} />
                                    <ColorRow label="Highlight BG" value={readCurrent('gradientStart', '#f43f5e')} onChange={v => applyColor('gradientStart', v)} />
                                    <ColorRow label="Border Color" value={readCurrent('borderColor', '#334155')} onChange={v => applyColor('borderColor', v)} />
                                </Group>
                                <Group title="Global Text">
                                    <ColorRow label="Text Color" value={readCurrent('textColor', '#ffffff')} onChange={v => applyColor('textColor', v)} />
                                    <ColorRow label="Accent Text" value={readCurrent('glowColor', '#f43f5e')} onChange={v => applyColor('glowColor', v)} />
                                </Group>
                            </>
                        )}
                    </>
                )}

                {/* FONTS TAB */}
                {activeTab === 'typography' && (
                    <>
                        <Group title="Typography">
                            <FontPicker
                                label="Primary Font"
                                value={readCurrent('fontFamily', 'impact')}
                                onChange={v => applyColor('fontFamily', v)}
                            />
                        </Group>
                    </>
                )}

                {/* APPEARANCE TAB */}
                {activeTab === 'appearance' && (
                    <>
                        <Group title="Effects & Transparency">
                            <SliderRow label="Opacity" value={Math.round((readCurrent('opacity', 1) as number) * 100)} min={0} max={100} step={5} suffix="%" onChange={v => applyColor('opacity', v / 100)} />
                        </Group>
                    </>
                )}
            </div>

            {/* Footer */}
            <div style={{
                padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.5)', flexShrink: 0,
                display: 'flex', flexDirection: 'column', gap: 10,
            }}>
                {selectedId && (
                    <div style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(249,115,22,0.1)',
                        border: '1px solid rgba(249,115,22,0.25)',
                        fontSize: 9, fontWeight: 800, color: '#fdba74',
                        letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center',
                    }}>
                        Canvas Selection: <span style={{ color: '#fff' }}>{selectedId}</span>
                    </div>
                )}

                <div style={{
                    padding: 12, borderRadius: 10,
                    background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                    border: copied ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 8,
                    }}>
                        <span style={{
                            fontSize: 9, fontWeight: 900,
                            color: copied ? '#34d399' : '#fdba74',
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                        }}>OBS Broadcast URL</span>
                        <button
                            onClick={handleCopyUrl}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 10px', borderRadius: 6,
                                background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(249,115,22,0.15)',
                                border: `1px solid ${copied ? 'rgba(16,185,129,0.5)' : 'rgba(249,115,22,0.35)'}`,
                                color: copied ? '#6ee7b7' : '#fdba74',
                                fontSize: 8, fontWeight: 900,
                                letterSpacing: '0.15em', textTransform: 'uppercase',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {copied ? <Check size={10} /> : <Copy size={10} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <div
                        onClick={handleCopyUrl}
                        style={{
                            padding: '8px 10px', borderRadius: 6,
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            fontSize: 9, fontFamily: 'ui-monospace, monospace',
                            color: '#cbd5e1', wordBreak: 'break-all',
                            cursor: 'pointer', lineHeight: 1.45,
                        }}
                    >
                        {fullObsUrl}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onReset}
                        style={{
                            flex: 1, padding: '11px 12px', borderRadius: 10,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', fontSize: 9, fontWeight: 900,
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        <RotateCcw size={11} /> Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saveState === 'saving'}
                        style={{
                            flex: 1.6, padding: '11px 12px', borderRadius: 10,
                            background:
                                saveState === 'saved' ? 'rgba(16,185,129,0.25)' :
                                saveState === 'error' ? 'rgba(239,68,68,0.18)' :
                                'rgba(16,185,129,0.18)',
                            border: `1px solid ${
                                saveState === 'saved' ? 'rgba(16,185,129,0.6)' :
                                saveState === 'error' ? 'rgba(239,68,68,0.45)' :
                                'rgba(16,185,129,0.4)'
                            }`,
                            color:
                                saveState === 'error' ? '#fca5a5' :
                                '#6ee7b7',
                            fontSize: 9, fontWeight: 900,
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                            cursor: saveState === 'saving' ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'all 0.2s',
                        }}
                    >
                        {saveState === 'saved' ? <Check size={11} /> : <Save size={11} />}
                        {saveState === 'saving' ? 'Pushing…' :
                         saveState === 'saved'  ? 'Pushed to OBS!' :
                         saveState === 'error'  ? 'Failed — Retry' :
                         'Save & Push to OBS'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Reusable UI ────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h3 style={{
                    fontSize: 12, fontWeight: 900, color: '#fff',
                    margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>{title}</h3>
                {hint && (
                    <p style={{
                        fontSize: 9, color: '#64748b', margin: '4px 0 0 0',
                        fontWeight: 600, letterSpacing: '0.05em',
                    }}>{hint}</p>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {children}
            </div>
        </div>
    );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <div style={{
                fontSize: 9, fontWeight: 900, color: '#fdba74',
                letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 10, paddingBottom: 8,
                borderBottom: '1px solid rgba(249,115,22,0.15)',
            }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {children}
            </div>
        </div>
    );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.05)',
        }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{label}</span>
            <button
                onClick={() => onChange(!value)}
                style={{
                    position: 'relative', width: 42, height: 24, borderRadius: 999,
                    background: value ? '#10b981' : 'rgba(30,41,59,0.9)',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                    boxShadow: value ? '0 0 12px rgba(16,185,129,0.4)' : 'inset 0 1px 3px rgba(0,0,0,0.5)',
                    transition: 'background 0.2s',
                }}
            >
                <div style={{
                    position: 'absolute', top: 3, left: value ? 21 : 3,
                    width: 18, height: 18, borderRadius: 999, background: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    transition: 'left 0.2s',
                }} />
            </button>
        </div>
    );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>{label}</label>
            <input
                type="text" value={value} placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                className="lr-input"
                style={{
                    width: '100%', padding: '12px 14px', fontSize: 13, fontWeight: 700,
                    color: '#fff', background: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
            />
        </div>
    );
}

function SliderRow({ label, value, min, max, step, suffix, onChange }: {
    label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void;
}) {
    return (
        <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.05)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{label}</span>
                <span style={{
                    fontSize: 11, color: '#fdba74', fontFamily: 'monospace', fontWeight: 800,
                    padding: '3px 10px',
                    background: 'rgba(249,115,22,0.12)',
                    border: '1px solid rgba(249,115,22,0.3)',
                    borderRadius: 6,
                    minWidth: 50, textAlign: 'center',
                }}>{value}{suffix}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={{ width: '100%', height: 6, accentColor: '#f97316', cursor: 'pointer' }}
            />
        </div>
    );
}

function LayoutRow({
    label, isSelected, x, y, width, height,
    onXChange, onYChange, onWidthChange, onHeightChange,
}: {
    label: string; isSelected: boolean;
    x: number; y: number; width: number; height: number;
    onXChange: (v: number) => void; onYChange: (v: number) => void;
    onWidthChange: (v: number) => void; onHeightChange: (v: number) => void;
}) {
    return (
        <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: isSelected ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.025)',
            border: isSelected ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.05)',
        }}>
            <div style={{
                fontSize: 11, fontWeight: 800, color: isSelected ? '#fdba74' : '#e2e8f0',
                letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10,
            }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <NumInput label="X" value={Math.round(x)} onChange={onXChange} />
                <NumInput label="Y" value={Math.round(y)} onChange={onYChange} />
                <NumInput label="W" value={Math.round(width)} onChange={onWidthChange} min={10} />
                <NumInput label="H" value={Math.round(height)} onChange={onHeightChange} min={10} />
            </div>
        </div>
    );
}

function NumInput({ label, value, onChange, min }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
                fontSize: 10, fontWeight: 800, color: '#fdba74',
                fontFamily: 'monospace', minWidth: 14,
            }}>{label}</span>
            <input
                type="number" value={value} min={min}
                onChange={e => onChange(Number(e.target.value))}
                className="lr-input"
                style={{
                    flex: 1, minWidth: 0, padding: '6px 8px', fontSize: 11, fontWeight: 700,
                    color: '#fff', background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
                    textAlign: 'right',
                }}
            />
        </label>
    );
}
