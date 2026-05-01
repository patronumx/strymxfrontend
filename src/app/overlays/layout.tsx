import type { Metadata } from 'next'
import './overlays.css'

export const metadata: Metadata = {
    title: 'STRYMX | OBS Overlay',
}

export default function OverlaysLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        // Crucial: The background must be completely transparent for OBS Browser Source to work
        // We override any dark mode backgrounds here.
        <div style={{ backgroundColor: 'transparent', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {children}
        </div>
    )
}
