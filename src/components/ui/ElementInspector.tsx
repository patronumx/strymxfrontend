"use client"

import React from 'react';
import { X } from 'lucide-react';
import type { ElementStyle } from './EditableGraphicElement';

export interface InspectorField {
    key: keyof ElementStyle;
    label: string;
    type: 'color' | 'number';
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
}

interface ElementInspectorProps {
    elementId: string;
    elementLabel: string;
    fields: InspectorField[];
    currentStyle: ElementStyle;
    onStyleChange: (patch: Partial<ElementStyle>) => void;
    onClose: () => void;
    position?: { x: number; y: number };
    transform?: { x: number; y: number; width: number; height: number };
    onTransformChange?: (patch: { x?: number; y?: number; width?: number; height?: number }) => void;
}

/**
 * ElementInspector
 * ────────────────
 * Floating panel shown in edit mode when an element is selected.
 * Provides color pickers and numeric inputs for the element's style fields,
 * plus precise x/y/width/height inputs for transform.
 */
export default function ElementInspector({
    elementId,
    elementLabel,
    fields,
    currentStyle,
    onStyleChange,
    onClose,
    transform,
    onTransformChange,
}: ElementInspectorProps) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 90,
                right: 24,
                width: 300,
                maxHeight: 'calc(100vh - 120px)',
                background: 'rgba(15,23,42,0.96)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 16,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(59,130,246,0.08)',
            }}>
                <div>
                    <div style={{
                        fontSize: 8, fontWeight: 900, letterSpacing: '0.3em',
                        color: '#60a5fa', textTransform: 'uppercase', marginBottom: 3,
                    }}>Inspector</div>
                    <div style={{
                        fontSize: 12, fontWeight: 900, color: '#fff',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{elementLabel}</div>
                    <div style={{
                        fontSize: 8, fontFamily: 'monospace', color: '#64748b',
                        marginTop: 2,
                    }}>#{elementId}</div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: 6, borderRadius: 8, background: 'transparent',
                        border: 'none', color: '#64748b', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Body */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: 16,
                display: 'flex', flexDirection: 'column', gap: 16,
            }}>
                {/* Transform section */}
                {transform && onTransformChange && (
                    <div>
                        <div style={{
                            fontSize: 8, fontWeight: 900, color: '#64748b',
                            letterSpacing: '0.25em', textTransform: 'uppercase',
                            marginBottom: 10,
                        }}>Position & Size</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <NumberField label="X" value={Math.round(transform.x)} onChange={v => onTransformChange({ x: v })} />
                            <NumberField label="Y" value={Math.round(transform.y)} onChange={v => onTransformChange({ y: v })} />
                            <NumberField label="W" value={Math.round(transform.width)} onChange={v => onTransformChange({ width: v })} />
                            <NumberField label="H" value={Math.round(transform.height)} onChange={v => onTransformChange({ height: v })} />
                        </div>
                    </div>
                )}

                {/* Style section */}
                {fields.length > 0 && (
                    <div>
                        <div style={{
                            fontSize: 8, fontWeight: 900, color: '#64748b',
                            letterSpacing: '0.25em', textTransform: 'uppercase',
                            marginBottom: 10,
                        }}>Appearance</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {fields.map(field => {
                                if (field.type === 'color') {
                                    return (
                                        <ColorField
                                            key={field.key}
                                            label={field.label}
                                            value={(currentStyle[field.key] as string) || '#000000'}
                                            onChange={v => onStyleChange({ [field.key]: v } as Partial<ElementStyle>)}
                                        />
                                    );
                                }
                                return (
                                    <NumberField
                                        key={field.key}
                                        label={field.label}
                                        value={(currentStyle[field.key] as number) ?? 0}
                                        onChange={v => onStyleChange({ [field.key]: v } as Partial<ElementStyle>)}
                                        min={field.min}
                                        max={field.max}
                                        step={field.step}
                                        suffix={field.suffix}
                                        fullWidth
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {fields.length === 0 && !transform && (
                    <div style={{
                        padding: '30px 10px', textAlign: 'center',
                        fontSize: 9, color: '#64748b', fontWeight: 700,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}>
                        No editable properties
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Subcomponents ──────────────────────────────────────────

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const safeValue = (() => {
        if (!value || value === 'transparent') return '#000000';
        if (value.startsWith('#') && value.length === 7) return value;
        if (value.startsWith('#') && value.length === 9) return value.slice(0, 7);
        return '#000000';
    })();

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{
                fontSize: 9, fontWeight: 700, color: '#94a3b8',
                letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                    fontSize: 8, fontFamily: 'monospace', color: '#64748b',
                }}>{safeValue.toUpperCase()}</span>
                <div style={{
                    position: 'relative', width: 26, height: 26, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
                    overflow: 'hidden', backgroundColor: value,
                }}>
                    <input
                        type="color"
                        value={safeValue}
                        onChange={e => onChange(e.target.value)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                </div>
            </div>
        </div>
    );
}

function NumberField({ label, value, onChange, min, max, step = 1, suffix, fullWidth = false }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    fullWidth?: boolean;
}) {
    if (fullWidth) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{
                    fontSize: 9, fontWeight: 700, color: '#94a3b8',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="number"
                        value={value}
                        min={min}
                        max={max}
                        step={step}
                        onChange={e => onChange(Number(e.target.value))}
                        style={{
                            width: 70, padding: '5px 8px', fontSize: 10, fontWeight: 700,
                            color: '#fff', background: 'rgba(15,23,42,0.8)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                            fontFamily: 'monospace', outline: 'none', textAlign: 'right',
                        }}
                    />
                    {suffix && <span style={{ fontSize: 8, color: '#64748b', fontFamily: 'monospace' }}>{suffix}</span>}
                </div>
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
                fontSize: 8, fontWeight: 700, color: '#64748b',
                letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>{label}</span>
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={e => onChange(Number(e.target.value))}
                style={{
                    width: '100%', padding: '6px 10px', fontSize: 11, fontWeight: 800,
                    color: '#fff', background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                    fontFamily: 'monospace', outline: 'none',
                }}
            />
        </div>
    );
}
