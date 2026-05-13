import { router } from '@inertiajs/react';

import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';

type TraceRow = {
    id: string;
    correlation_id: string;
    method: string;
    uri: string;
    status_code: number | null;
    duration_ms: number | null;
    db_queries_count: number;
    has_errors: boolean;
    environment: string | null;
    occurred_at: string | null;
};

type Props = {
    traces: Paginated<TraceRow>;
    filters: { status: string | null };
};

const STATUS_TABS = [
    { label: 'All', value: 'all' },
    { label: 'Success', value: 'success' },
    { label: 'Error', value: 'error' },
] as const;

export default function RequestsIndex({ traces, filters }: Props) {
    const current = filters.status ?? 'all';

    const onFilter = (value: string) => {
        const url = new URL(window.location.href);
        if (value && value !== 'all') {
            url.searchParams.set('status', value);
        } else {
            url.searchParams.delete('status');
        }
        router.visit(url.pathname + url.search, { preserveScroll: true });
    };

    return (
        <AppLayout title="Requests">
            <PageHeader
                title="Requests"
                breadcrumbs={[{ label: 'Activity' }, { label: 'Requests' }]}
                selectedRange="1h"
                actions={
                    <Tabs value={current} onValueChange={onFilter}>
                        <TabsList className="h-8">
                            {STATUS_TABS.map((tab) => (
                                <TabsTrigger key={tab.value} value={tab.value} className="px-3">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                }
            />

            <div className="px-6 py-6">
                <Card className="overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Method</TableHead>
                                <TableHead>URI</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                                <TableHead className="text-right">Queries</TableHead>
                                <TableHead>When</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {traces.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                        No requests captured yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                traces.data.map((trace) => (
                                    <TableRow key={trace.id}>
                                        <TableCell className="py-2 font-mono">
                                            <Badge variant="muted" className="font-mono">
                                                {trace.method}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-2 font-mono text-xs">{trace.uri}</TableCell>
                                        <TableCell className="py-2">
                                            <StatusBadge status={trace.status_code} />
                                        </TableCell>
                                        <TableCell className="py-2 text-right font-mono text-xs">
                                            {trace.duration_ms !== null ? `${trace.duration_ms} ms` : '—'}
                                        </TableCell>
                                        <TableCell className="py-2 text-right font-mono text-xs">{trace.db_queries_count}</TableCell>
                                        <TableCell className="py-2 text-xs text-muted-foreground">
                                            {formatRelative(trace.occurred_at)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <Pagination links={traces.links} from={traces.from} to={traces.to} total={traces.total} />
                </Card>
            </div>
        </AppLayout>
    );
}

function StatusBadge({ status }: { status: number | null }) {
    if (status === null) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    let variant: 'success' | 'warning' | 'destructive' | 'secondary' = 'success';
    if (status >= 500) variant = 'destructive';
    else if (status >= 400) variant = 'warning';
    else if (status >= 300) variant = 'secondary';

    return (
        <Badge variant={variant} className="font-mono">
            {status}
        </Badge>
    );
}

function formatRelative(iso: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
