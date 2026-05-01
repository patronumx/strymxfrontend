import DashboardLayout from '@/components/DashboardLayout';
import ThemeDecorator from '@/components/ThemeDecorator';

export default function OverlayDesignPage() {
    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8 pt-8">
                <ThemeDecorator />
            </div>
        </DashboardLayout>
    );
}
