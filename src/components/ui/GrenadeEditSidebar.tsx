"use client"

import React, { useState, ReactNode } from 'react';
import { Eye, Type, Paintbrush, Sliders, Sparkles, RotateCcw, Save, X, Layers, Move } from 'lucide-react';
import type { ElementStyle, ElementTransform } from './EditableGraphicElement';
import { ColorRow, FontPicker } from './SidebarControls';

interface GrenadeEditSidebarProps {
    overlayTitle?: string; // e.g. "Grenade Kill", "Vehicle Kill", "First Blood"
    elementStyles: Record<string, ElementStyle>;
    elementTransforms: Record<string, ElementTransform>;
    onStyleChange: (elementId: string, patch: Partial<ElementStyle>) => void;
    onTransformChange: (elementId: string, patch: Partial<ElementTransform>) => void;
    onReset: () => void;
    onClose: () => void;
    selectedId?: string | null;
    titleDefault?: string; // default title text shown in placeholder
    subLabelDefault?: string; // default sub-label text shown in placeholder
    effectsLabel?: string; // e.g. "Grenade Effects", "Vehicle Effects"
    effectsImageKey?: string; // the element id for the side image
}

type TabId = 'layout' | 'visibility' | 'text' | 'colors' | 'typography' | 'appearance' | 'effects';

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'layout', label: 'Size', icon: Move },
    { id: 'visibility', label: 'Show', icon: Eye },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'colors', label: 'Colors', icon: Paintbrush },
    { id: 'typography', label: 'Fonts', icon: Layers },
    { id: 'appearance', label: 'Style', icon: Sliders },
    { id: 'effects', label: 'FX', icon: Sparkles },
];

const LAYOUT_ELEMENTS = [
    { id: 'background', label: 'Background' },
    { id: 'playerPhoto', label: 'Player Photo' },
    { id: 'teamLogo', label: 'Team Logo' },
    { id: 'oliveBranch', label: 'Decoration' },
    { id: 'grenadeText', label: 'GRENADE Title' },
    { id: 'eliminationBar', label: 'Elim Bar' },
    { id: 'grenadeImage', label: 'Grenade Image' },
    { id: 'nameBar', label: 'Name Bar' },
];

const VISIBILITY_ELEMENTS = [
    { id: 'background', label: 'Background Panel' },
    { id: 'playerPhoto', label: 'Player Photo' },
    { id: 'teamLogo', label: 'Team Logo' },
    { id: 'oliveBranch', label: 'Decoration' },
    { id: 'grenadeText', label: 'GRENADE Title' },
    { id: 'eliminationBar', label: 'Elimination Bar' },
    { id: 'grenadeImage', label: 'Grenade Image' },
    { id: 'nameBar', label: 'Name Bar' },
];

export default function GrenadeEditSidebar({
    overlayTitle = 'Elimination',
    elementStyles,
    elementTransforms,
    onStyleChange,
    onTransformChange,
    onReset,
    onClose,
    selectedId,
    titleDefault = 'GRENADE',
    subLabelDefault = 'ELIMINATION',
    effectsLabel = 'Image Effects',
    effectsImageKey = 'grenadeImage',
}: GrenadeEditSidebarProps) {
    const [activeTab, setActiveTab] = useState<TabId>('layout');

    const get = (id: string, key: keyof ElementStyle, fallback: any) => {
        const s = elementStyles[id];
        return s && s[key] !== undefined ? (s[key] as any) : fallback;
    };

    const getT = (id: string, key: keyof ElementTransform, fallback: number) => {
        const t = elementTransforms[id];
        return t && t[key] !== undefined ? (t[key] as number) : fallback;
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
                .gren-scroll::-webkit-scrollbar { width: 10px; }
                .gren-scroll::-webkit-scrollbar-track { background: transparent; }
                .gren-scroll::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
                .gren-scroll::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.5); border: 2px solid transparent; background-clip: padding-box; }
                .gren-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
            `}</style>

            {/* ── Header ── */}
            <div style={{
                padding: 18,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, rgba(59,130,246,0.08), transparent)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: 'rgba(59,130,246,0.18)',
                        border: '1px solid rgba(59,130,246,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(59,130,246,0.2)',
                    }}>
                        <Paintbrush size={16} color="#60a5fa" />
                    </div>
                    <div>
                        <div style={{
                            fontSize: 13, fontWeight: 900, color: '#fff',
                            textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.1,
                        }}>{overlayTitle}</div>
                        <div style={{
                            fontSize: 9, fontWeight: 800, color: '#64748b',
                            letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 3,
                        }}>Customization</div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    title="Close edit mode"
                    style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#94a3b8', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── Tab Bar ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 3,
                padding: 8,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.5)',
                flexShrink: 0,
            }}>
                {TABS.map(t => {
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                padding: '8px 2px', borderRadius: 8,
                                background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                                border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                                color: isActive ? '#60a5fa' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#cbd5e1'; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
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

            {/* ── Body (only active tab content) ── */}
            <div
                className="gren-scroll"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: 20,
                    minHeight: 0,
                }}
            >
                {activeTab === 'layout' && (
                    <Section title="Position & Size" hint="Set exact X, Y, width, and height for each element">
                        {LAYOUT_ELEMENTS.map(e => (
                            <LayoutRow
                                key={e.id}
                                label={e.label}
                                isSelected={selectedId === e.id}
                                x={getT(e.id, 'x', 0)}
                                y={getT(e.id, 'y', 0)}
                                width={getT(e.id, 'width', 100)}
                                height={getT(e.id, 'height', 100)}
                                onXChange={v => onTransformChange(e.id, { x: v })}
                                onYChange={v => onTransformChange(e.id, { y: v })}
                                onWidthChange={v => onTransformChange(e.id, { width: v })}
                                onHeightChange={v => onTransformChange(e.id, { height: v })}
                            />
                        ))}
                    </Section>
                )}

                {activeTab === 'visibility' && (
                    <Section title="Element Visibility" hint="Toggle elements on or off">
                        {VISIBILITY_ELEMENTS.map(e => (
                            <ToggleRow
                                key={e.id}
                                label={e.label}
                                value={get(e.id, 'visible', true) !== false}
                                onChange={v => onStyleChange(e.id, { visible: v })}
                            />
                        ))}
                    </Section>
                )}

                {activeTab === 'text' && (
                    <Section title="Text Content" hint="Edit the labels shown on the overlay">
                        <TextField
                            label="Title"
                            value={get('grenadeText', 'text', titleDefault)}
                            onChange={v => onStyleChange('grenadeText', { text: v })}
                            placeholder={titleDefault}
                        />
                        <TextField
                            label="Sub-label"
                            value={get('eliminationBar', 'text', subLabelDefault)}
                            onChange={v => onStyleChange('eliminationBar', { text: v })}
                            placeholder={subLabelDefault}
                        />
                        <TextField
                            label="Decoration Emoji"
                            value={get('oliveBranch', 'text', '🌿')}
                            onChange={v => onStyleChange('oliveBranch', { text: v })}
                            placeholder="🌿"
                        />
                    </Section>
                )}

                {activeTab === 'colors' && (
                    <>
                        <Group title="Background Panel">
                            <ColorRow label="Gradient Start" value={get('background', 'gradientStart', '#a3e635')} onChange={v => onStyleChange('background', { gradientStart: v })} />
                            <ColorRow label="Gradient End" value={get('background', 'gradientEnd', '#65a30d')} onChange={v => onStyleChange('background', { gradientEnd: v })} />
                        </Group>
                        <Group title="GRENADE Title">
                            <ColorRow label="Text" value={get('grenadeText', 'textColor', '#e91e63')} onChange={v => onStyleChange('grenadeText', { textColor: v })} />
                            <ColorRow label="Shadow" value={get('grenadeText', 'shadowColor', '#c2185b')} onChange={v => onStyleChange('grenadeText', { shadowColor: v })} />
                        </Group>
                        <Group title="Elimination Bar">
                            <ColorRow label="Gradient Start" value={get('eliminationBar', 'gradientStart', '#65a30d')} onChange={v => onStyleChange('eliminationBar', { gradientStart: v })} />
                            <ColorRow label="Gradient End" value={get('eliminationBar', 'gradientEnd', '#84cc16')} onChange={v => onStyleChange('eliminationBar', { gradientEnd: v })} />
                            <ColorRow label="Text" value={get('eliminationBar', 'textColor', '#ffffff')} onChange={v => onStyleChange('eliminationBar', { textColor: v })} />
                        </Group>
                        <Group title="Name Bar">
                            <ColorRow label="Gradient Start" value={get('nameBar', 'gradientStart', '#e91e63')} onChange={v => onStyleChange('nameBar', { gradientStart: v })} />
                            <ColorRow label="Gradient End" value={get('nameBar', 'gradientEnd', '#c2185b')} onChange={v => onStyleChange('nameBar', { gradientEnd: v })} />
                            <ColorRow label="Text" value={get('nameBar', 'textColor', '#ffffff')} onChange={v => onStyleChange('nameBar', { textColor: v })} />
                        </Group>
                        <Group title="Other">
                            <ColorRow label="Grenade Glow" value={get('grenadeImage', 'glowColor', '#e91e63')} onChange={v => onStyleChange('grenadeImage', { glowColor: v })} />
                            <ColorRow label="Logo BG" value={get('teamLogo', 'bgColor', '#ffffff33')} onChange={v => onStyleChange('teamLogo', { bgColor: v })} />
                            <ColorRow label="Logo Border" value={get('teamLogo', 'borderColor', '#ffffff')} onChange={v => onStyleChange('teamLogo', { borderColor: v })} />
                        </Group>
                    </>
                )}

                {activeTab === 'typography' && (
                    <>
                        <Group title="Font Family">
                            <FontPicker
                                label="Title (GRENADE)"
                                value={get('grenadeText', 'fontFamily', 'impact')}
                                onChange={v => onStyleChange('grenadeText', { fontFamily: v })}
                            />
                            <FontPicker
                                label="Sub-label"
                                value={get('eliminationBar', 'fontFamily', 'impact')}
                                onChange={v => onStyleChange('eliminationBar', { fontFamily: v })}
                            />
                            <FontPicker
                                label="Player Name"
                                value={get('nameBar', 'fontFamily', 'impact')}
                                onChange={v => onStyleChange('nameBar', { fontFamily: v })}
                            />
                        </Group>
                        <Group title="Font Size">
                            <SliderRow label="Title" value={get('grenadeText', 'fontSize', 140)} min={40} max={220} step={2} suffix="px" onChange={v => onStyleChange('grenadeText', { fontSize: v })} />
                            <SliderRow label="Sub-label" value={get('eliminationBar', 'fontSize', 30)} min={12} max={60} step={1} suffix="px" onChange={v => onStyleChange('eliminationBar', { fontSize: v })} />
                            <SliderRow label="Player Name" value={get('nameBar', 'fontSize', 44)} min={20} max={80} step={1} suffix="px" onChange={v => onStyleChange('nameBar', { fontSize: v })} />
                            <SliderRow label="Decoration" value={get('oliveBranch', 'fontSize', 48)} min={20} max={120} step={2} suffix="px" onChange={v => onStyleChange('oliveBranch', { fontSize: v })} />
                        </Group>
                        <Group title="Style">
                            <ItalicToggle label="Title Italic" value={get('grenadeText', 'fontStyle', 'italic') === 'italic'} onChange={v => onStyleChange('grenadeText', { fontStyle: v ? 'italic' : 'normal' })} />
                            <ItalicToggle label="Name Italic" value={get('nameBar', 'fontStyle', 'italic') === 'italic'} onChange={v => onStyleChange('nameBar', { fontStyle: v ? 'italic' : 'normal' })} />
                            <SliderRow label="Title Spacing" value={get('grenadeText', 'letterSpacing', -4)} min={-20} max={20} step={1} suffix="px" onChange={v => onStyleChange('grenadeText', { letterSpacing: v })} />
                            <SliderRow label="Sub-label Spacing" value={get('eliminationBar', 'letterSpacing', 9)} min={0} max={30} step={1} suffix="px" onChange={v => onStyleChange('eliminationBar', { letterSpacing: v })} />
                        </Group>
                    </>
                )}

                {activeTab === 'appearance' && (
                    <Section title="Shape & Borders" hint="Corner radius and border thickness">
                        <SliderRow label="BG Corners" value={get('background', 'borderRadius', 24)} min={0} max={80} step={1} suffix="px" onChange={v => onStyleChange('background', { borderRadius: v })} />
                        <SliderRow label="Elim Bar Corners" value={get('eliminationBar', 'borderRadius', 8)} min={0} max={40} step={1} suffix="px" onChange={v => onStyleChange('eliminationBar', { borderRadius: v })} />
                        <SliderRow label="Name Bar Corners" value={get('nameBar', 'borderRadius', 24)} min={0} max={60} step={1} suffix="px" onChange={v => onStyleChange('nameBar', { borderRadius: v })} />
                        <SliderRow label="Logo Border Width" value={get('teamLogo', 'borderWidth', 2)} min={0} max={10} step={1} suffix="px" onChange={v => onStyleChange('teamLogo', { borderWidth: v })} />
                    </Section>
                )}

                {activeTab === 'effects' && (
                    <Section title={effectsLabel} hint="Tweak the side image filter and opacity">
                        <SliderRow label="Hue Rotate" value={get(effectsImageKey, 'hueRotate', 290)} min={0} max={360} step={5} suffix="°" onChange={v => onStyleChange(effectsImageKey, { hueRotate: v })} />
                        <SliderRow label="Saturation" value={get(effectsImageKey, 'saturate', 250)} min={0} max={500} step={10} suffix="%" onChange={v => onStyleChange(effectsImageKey, { saturate: v })} />
                        <SliderRow label="Image Opacity" value={Math.round((get(effectsImageKey, 'opacity', 1) as number) * 100)} min={0} max={100} step={5} suffix="%" onChange={v => onStyleChange(effectsImageKey, { opacity: v / 100 })} />
                        <SliderRow label="Photo Opacity" value={Math.round((get('playerPhoto', 'opacity', 1) as number) * 100)} min={0} max={100} step={5} suffix="%" onChange={v => onStyleChange('playerPhoto', { opacity: v / 100 })} />
                    </Section>
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{
                padding: 14,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.5)',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
            }}>
                {selectedId && (
                    <div style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.25)',
                        fontSize: 9, fontWeight: 800, color: '#60a5fa',
                        letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center',
                    }}>
                        Canvas Selection: <span style={{ color: '#fff' }}>{selectedId}</span>
                    </div>
                )}
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
                        onClick={() => { window.location.href = window.location.pathname; }}
                        style={{
                            flex: 1.4, padding: '11px 12px', borderRadius: 10,
                            background: 'rgba(16,185,129,0.18)',
                            border: '1px solid rgba(16,185,129,0.4)',
                            color: '#6ee7b7', fontSize: 9, fontWeight: 900,
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        <Save size={11} /> Save & Exit
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Reusable UI ───────────────────────────────────────────

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {children}
            </div>
        </div>
    );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <div style={{
                fontSize: 9, fontWeight: 900, color: '#60a5fa',
                letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(59,130,246,0.15)',
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
            <span style={{
                fontSize: 11, fontWeight: 700, color: '#e2e8f0',
                letterSpacing: '0.02em',
            }}>{label}</span>
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
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                className="gren-input"
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

function LayoutRow({
    label, isSelected, x, y, width, height,
    onXChange, onYChange, onWidthChange, onHeightChange,
}: {
    label: string;
    isSelected: boolean;
    x: number; y: number; width: number; height: number;
    onXChange: (v: number) => void;
    onYChange: (v: number) => void;
    onWidthChange: (v: number) => void;
    onHeightChange: (v: number) => void;
}) {
    return (
        <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.025)',
            border: isSelected ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
        }}>
            <div style={{
                fontSize: 11, fontWeight: 800, color: isSelected ? '#60a5fa' : '#e2e8f0',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                marginBottom: 10,
            }}>{label}</div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
            }}>
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
                fontSize: 10, fontWeight: 800, color: '#60a5fa',
                fontFamily: 'monospace', minWidth: 14,
            }}>{label}</span>
            <input
                type="number"
                value={value}
                min={min}
                onChange={e => onChange(Number(e.target.value))}
                className="gren-input"
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

function ItalicToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.05)',
        }}>
            <span style={{
                fontSize: 11, fontWeight: 700, color: '#e2e8f0',
            }}>{label}</span>
            <button
                onClick={() => onChange(!value)}
                style={{
                    position: 'relative', width: 42, height: 24, borderRadius: 999,
                    background: value ? '#3b82f6' : 'rgba(30,41,59,0.9)',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                    boxShadow: value ? '0 0 12px rgba(59,130,246,0.4)' : 'inset 0 1px 3px rgba(0,0,0,0.5)',
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
                <span style={{
                    fontSize: 11, fontWeight: 700, color: '#e2e8f0',
                }}>{label}</span>
                <span style={{
                    fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', fontWeight: 800,
                    padding: '3px 10px',
                    background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 6,
                    minWidth: 50, textAlign: 'center',
                }}>
                    {value}{suffix}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={{ width: '100%', height: 6, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
        </div>
    );
}
