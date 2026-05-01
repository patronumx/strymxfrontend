"use client"

import React, { useEffect, useState, ReactNode } from 'react';
import { Rnd, RndResizeCallback, RndDragCallback } from 'react-rnd';

export interface ElementTransform {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    visible?: boolean;
}

/** Optional style overrides — any subset can be applied per element */
export interface ElementStyle {
    // Colors
    bgColor?: string;
    gradientStart?: string;
    gradientEnd?: string;
    textColor?: string;
    borderColor?: string;
    shadowColor?: string;
    glowColor?: string;
    // Typography
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    letterSpacing?: number;
    // Shape
    borderRadius?: number;
    borderWidth?: number;
    opacity?: number;
    hueRotate?: number;
    saturate?: number;
    // Text content
    text?: string;
    // Visibility
    visible?: boolean;
}

export interface ElementConfig {
    transform: ElementTransform;
    style: ElementStyle;
}

interface EditableGraphicElementProps {
    id: string;
    overlayKey: string;
    defaultTransform: ElementTransform;
    defaultStyle?: ElementStyle;
    editMode: boolean;
    selected?: boolean;
    onSelect?: (id: string) => void;
    onConfigChange?: (id: string, config: ElementConfig) => void;
    /**
     * Children can be a ReactNode OR a render function that receives
     * the current merged style so the element can use the custom values.
     */
    children: ReactNode | ((style: ElementStyle) => ReactNode);
    label?: string;
    lockAspect?: boolean;
    disableResize?: boolean;
    /** Bounds selector or "parent"/"window" — defaults to no bounds */
    bounds?: string;
    /** Canvas scale factor — passed to react-rnd so drag distances are correct */
    scale?: number;
    /** If true, the root wrapper won't apply style.opacity, allowing children to apply it selectively */
    useIndividualOpacity?: boolean;
}

/**
 * EditableGraphicElement
 * ──────────────────────
 * Wraps any overlay element. In output mode → plain absolute positioned div.
 * In edit mode → react-rnd wrapped with drag + resize handles.
 *
 * Stores BOTH transform AND style in localStorage keyed by `overlayKey:id`.
 * Children can be a render-prop function to consume the custom style.
 */
export default function EditableGraphicElement({
    id,
    overlayKey,
    defaultTransform,
    defaultStyle = {},
    editMode,
    selected = false,
    onSelect,
    onConfigChange,
    children,
    label,
    lockAspect = false,
    disableResize = false,
    bounds,
    scale = 1,
    useIndividualOpacity = false,
}: EditableGraphicElementProps) {
    const storageKey = `strymx_layout:${overlayKey}:${id}`;

    const [transform, setTransform] = useState<ElementTransform>(defaultTransform);
    const [style, setStyle] = useState<ElementStyle>(defaultStyle);

    // Load saved config on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.transform) setTransform({ ...defaultTransform, ...parsed.transform });
                if (parsed.style) setStyle({ ...defaultStyle, ...parsed.style });
            } else {
                // If no saved config, use defaults
                setTransform(defaultTransform);
                setStyle(defaultStyle);
            }
        } catch { /* ignore */ }
    }, [storageKey, defaultTransform, defaultStyle]);

    // Sync with props if they change (e.g. from parent re-render with fresh localStorage data)
    useEffect(() => {
        // Only sync if we don't have a saved version, OR if the parent is passing a "fresh" version
        // Actually, in the editor, the parent reads the "current" style and passes it as defaultStyle
        // so we should sync it.
        setTransform(prev => ({ ...prev, ...defaultTransform }));
        setStyle(prev => ({ ...prev, ...defaultStyle }));
    }, [defaultTransform, defaultStyle]);

    // Listen for cross-tab updates
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === storageKey && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed.transform) setTransform({ ...defaultTransform, ...parsed.transform });
                    if (parsed.style) setStyle({ ...defaultStyle, ...parsed.style });
                } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey]);

    const persist = (nextTransform: ElementTransform, nextStyle: ElementStyle) => {
        setTransform(nextTransform);
        setStyle(nextStyle);
        try {
            localStorage.setItem(storageKey, JSON.stringify({ transform: nextTransform, style: nextStyle }));
        } catch { /* ignore */ }
        onConfigChange?.(id, { transform: nextTransform, style: nextStyle });
    };

    const handleDragStop: RndDragCallback = (_e, data) => {
        persist({ ...transform, x: data.x, y: data.y }, style);
    };

    const handleResizeStop: RndResizeCallback = (_e, _dir, ref, _delta, position) => {
        persist({
            ...transform,
            x: position.x,
            y: position.y,
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
        }, style);
    };

    if ((transform.visible === false || style.visible === false) && !editMode) return null;

    const renderedChildren = typeof children === 'function' ? children(style) : children;

    const rootOpacity = useIndividualOpacity ? 1 : ((style.visible === false || transform.visible === false) ? 0.3 : (style.opacity ?? 1));

    // OUTPUT MODE — plain absolute div, no handles
    if (!editMode) {
        return (
            <div
                style={{
                    position: 'absolute',
                    left: transform.x,
                    top: transform.y,
                    width: transform.width,
                    height: transform.height,
                    transform: transform.rotation ? `rotate(${transform.rotation}deg)` : undefined,
                    opacity: rootOpacity,
                    pointerEvents: 'none',
                }}
            >
                {renderedChildren}
            </div>
        );
    }

    // EDIT MODE — wrapped in react-rnd
    return (
        <Rnd
            size={{ width: transform.width, height: transform.height }}
            position={{ x: transform.x, y: transform.y }}
            onDragStop={handleDragStop}
            onResizeStop={handleResizeStop}
            bounds={bounds}
            enableResizing={!disableResize}
            lockAspectRatio={lockAspect}
            onMouseDown={() => onSelect?.(id)}
            scale={scale}
            resizeHandleStyles={{
                topLeft: { zIndex: 10 }, topRight: { zIndex: 10 },
                bottomLeft: { zIndex: 10 }, bottomRight: { zIndex: 10 },
            }}
            style={{
                outline: selected ? '2px solid #3b82f6' : '1px dashed rgba(59,130,246,0.5)',
                outlineOffset: 2,
                zIndex: selected ? 1000 : 'auto',
                opacity: rootOpacity,
            }}
        >
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {label && (
                    <div
                        style={{
                            position: 'absolute',
                            top: -22,
                            left: 0,
                            fontSize: 9,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: '#fff',
                            background: selected ? '#3b82f6' : 'rgba(30,41,59,0.9)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                        }}
                    >
                        {label}
                    </div>
                )}
                {renderedChildren}
            </div>
        </Rnd>
    );
}

/** Update only the style portion of an element's saved config */
export function updateElementStyle(overlayKey: string, id: string, patch: Partial<ElementStyle>) {
    const key = `strymx_layout:${overlayKey}:${id}`;
    try {
        const raw = localStorage.getItem(key);
        const prev = raw ? JSON.parse(raw) : { transform: {}, style: {} };
        const next = { ...prev, style: { ...(prev.style || {}), ...patch } };
        localStorage.setItem(key, JSON.stringify(next));
        // Fire a storage event manually (same-tab listeners need this)
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(next) }));
    } catch { /* ignore */ }
}

/** Update only the transform portion of an element's saved config */
export function updateElementTransform(overlayKey: string, id: string, patch: Partial<ElementTransform>) {
    const key = `strymx_layout:${overlayKey}:${id}`;
    try {
        const raw = localStorage.getItem(key);
        const prev = raw ? JSON.parse(raw) : { transform: {}, style: {} };
        const next = { ...prev, transform: { ...(prev.transform || {}), ...patch } };
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(next) }));
    } catch { /* ignore */ }
}

/** Read the saved transform for an element (returns empty object if none) */
export function readElementTransform(overlayKey: string, id: string): Partial<ElementTransform> {
    const key = `strymx_layout:${overlayKey}:${id}`;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed.transform || {};
    } catch {
        return {};
    }
}

/** Read the saved style for an element (returns empty object if none) */
export function readElementStyle(overlayKey: string, id: string): ElementStyle {
    const key = `strymx_layout:${overlayKey}:${id}`;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed.style || {};
    } catch {
        return {};
    }
}

/** Clear all saved layout data for an overlay (Reset to defaults) */
export function clearOverlayLayout(overlayKey: string) {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(`strymx_layout:${overlayKey}:`)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
}
