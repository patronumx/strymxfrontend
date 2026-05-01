/**
 * Broadcast-style display fonts for esports overlays.
 * Each font is loaded from Google Fonts via a single link injected once per page.
 */
export interface BroadcastFont {
    id: string;
    name: string;
    family: string; // the CSS font-family value
    weights: number[];
    italic: boolean;
    preview?: string;
}

export const BROADCAST_FONTS: BroadcastFont[] = [
    { id: 'ttlakes',    name: 'TT Lakes Neue', family: '"TT Lakes Neue", sans-serif',                  weights: [700], italic: false },
    { id: 'impact',     name: 'Impact',       family: 'Impact, "Arial Black", system-ui, sans-serif', weights: [900], italic: true },
    { id: 'oswald',     name: 'Oswald',       family: '"Oswald", sans-serif',                          weights: [700, 900], italic: false },
    { id: 'bebas',      name: 'Bebas Neue',   family: '"Bebas Neue", sans-serif',                      weights: [400], italic: false },
    { id: 'anton',      name: 'Anton',        family: '"Anton", sans-serif',                           weights: [400], italic: false },
    { id: 'teko',       name: 'Teko',         family: '"Teko", sans-serif',                            weights: [700], italic: false },
    { id: 'rajdhani',   name: 'Rajdhani',     family: '"Rajdhani", sans-serif',                        weights: [700], italic: false },
    { id: 'russoone',   name: 'Russo One',    family: '"Russo One", sans-serif',                       weights: [400], italic: false },
    { id: 'blackops',   name: 'Black Ops',    family: '"Black Ops One", sans-serif',                   weights: [400], italic: false },
    { id: 'orbitron',   name: 'Orbitron',     family: '"Orbitron", sans-serif',                        weights: [900], italic: false },
    { id: 'saira',      name: 'Saira Condensed', family: '"Saira Condensed", sans-serif',             weights: [900], italic: true },
];

/** Injects a single Google Fonts link + local font-face for all broadcast fonts. */
export function injectBroadcastFonts() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('strymx-broadcast-fonts')) return;

    // Local Font Face
    const style = document.createElement('style');
    style.id = 'strymx-broadcast-fonts-local';
    style.textContent = `
        @font-face {
            font-family: 'TT Lakes Neue';
            src: url('/assets/fonts/tt-lakes.ttf') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
    `;
    document.head.appendChild(style);

    const link = document.createElement('link');
    link.id = 'strymx-broadcast-fonts';
    link.rel = 'stylesheet';
    link.href = [
        'https://fonts.googleapis.com/css2',
        '?family=Oswald:wght@700;900',
        '&family=Bebas+Neue',
        '&family=Anton',
        '&family=Teko:wght@700',
        '&family=Rajdhani:wght@700',
        '&family=Russo+One',
        '&family=Black+Ops+One',
        '&family=Orbitron:wght@900',
        '&family=Saira+Condensed:ital,wght@0,900;1,900',
        '&display=swap',
    ].join('');
    document.head.appendChild(link);
}

export function getFontById(id: string): BroadcastFont | undefined {
    return BROADCAST_FONTS.find(f => f.id === id);
}
