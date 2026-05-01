import DashboardLayout from '@/components/DashboardLayout';
import ThemeDecorator from '@/components/ThemeDecorator';
import * as React from 'react';

export default function DesignSettingsPage({ params }: { params: Promise<{ designId: string }> }) {
    const resolvedParams = React.use(params);
    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8 pt-8">
                <ThemeDecorator designId={resolvedParams.designId} />
            </div>
        </DashboardLayout>
    );
}
