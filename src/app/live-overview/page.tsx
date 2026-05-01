import DashboardLayout from '@/components/DashboardLayout';
import LiveMatchControl from '@/components/LiveMatchControl';
import SheetDataManager from '@/components/SheetDataManager';

export default function LiveOverviewPage() {
    return (
        <DashboardLayout>
            <LiveMatchControl />
            <div className="mt-8">
                <SheetDataManager />
            </div>
        </DashboardLayout>
    );
}
