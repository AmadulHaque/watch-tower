import { Construction } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/layouts/app-layout';

type Props = { section: string };

export default function Placeholder({ section }: Props) {
    const title = section
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

    return (
        <AppLayout title={title}>
            <PageHeader title={title} breadcrumbs={[{ label: 'Monitoring' }, { label: title }]} />
            <div className="px-6 py-6">
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <Construction className="h-8 w-8 text-muted-foreground" />
                        <h2 className="mt-3 text-lg font-semibold">{title} are coming soon</h2>
                        <p className="mt-2 max-w-md text-sm text-muted-foreground">
                            This section is part of the LaravelWatch MVP roadmap but isn&apos;t wired up yet.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
