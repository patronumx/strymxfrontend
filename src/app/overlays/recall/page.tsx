"use client"
import React, { Suspense, useEffect, useState } from 'react';
import RecallAnimationGraphic from '@/components/ui/RecallAnimationGraphic';
import RecallV2 from '@/components/ui/RecallV2';

function RecallRouter() {
    const [isEdit, setIsEdit] = useState<boolean | null>(null);
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        setIsEdit(p.get('edit') === 'true' || p.get('layout') === 'custom');
    }, []);
    if (isEdit === null) return null;
    if (isEdit) return <RecallV2 />;
    return <RecallAnimationGraphic />;
}

export default function RecallOverlayPage() {
    return <Suspense fallback={null}><RecallRouter /></Suspense>;
}
