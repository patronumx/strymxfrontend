"use client"
import React, { Suspense, useEffect, useState } from 'react';
import TeamDominationGraphic from '@/components/ui/TeamDominationGraphic';
import TeamDominationV2 from '@/components/ui/TeamDominationV2';

function TeamDomRouter() {
    const [isEdit, setIsEdit] = useState<boolean | null>(null);
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        setIsEdit(p.get('edit') === 'true' || p.get('layout') === 'custom');
    }, []);
    if (isEdit === null) return null;
    if (isEdit) return <TeamDominationV2 />;
    return <TeamDominationGraphic />;
}

export default function TeamDominationOverlayPage() {
    return <Suspense fallback={null}><TeamDomRouter /></Suspense>;
}
