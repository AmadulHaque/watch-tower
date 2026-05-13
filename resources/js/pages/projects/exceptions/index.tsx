import { router } from '@inertiajs/react';
import { PartyPopper } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';

type ExceptionRow = {
    id: string;
    fingerprint: string;
    exception_class: string;
    first_message: string;
    first_file: string | null;
    first_line: number | null;
    total_count: number;
    first_occurrence_at: string | null;
    last_occurrence_at: string | null;
    status: string;
};

type Props = {
    groups: Paginated<ExceptionRow>;
    filters: { status: string };
};

const STATUS_TABS = [
    { label: 'Unresolved', value: 'unresolved' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Ignored', value: 'ignored' },
    { label: 'All', value: 'all' },
] as const;

export default function ExceptionsIndex({ groups, filters }: Props) {
    const onFilter = (value: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('status', value);
        router.visit(url.pathname + url.search, { preserveScroll: true });
    };

    return (
        <AppLayout title="Exceptions">
            <PageHeader
                title="Exceptions"
                breadcrumbs={[{ label: 'Activity' }, { label: 'Exceptions' }]}
                actions={
                    <Tabs value={filters.status} onValueChange={onFilter}>
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
                    {groups.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <PartyPopper className="h-8 w-8 text-emerald-500" />
                            <p className="mt-2 text-sm font-medium">No exceptions match the filter</p>
                            <p className="text-xs text-muted-foreground">Try widening the time range or status</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {groups.data.map((group) => (
                                <li key={group.id} className="px-5 py-4 transition-colors hover:bg-muted/40">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <Badge variant="destructive" className="font-mono">
                                                    {shortClass(group.exception_class)}
                                                </Badge>
                                                <span className="truncate text-muted-foreground">
                                                    {group.first_file ?? 'unknown'}
                                                    {group.first_line ? `:${group.first_line}` : ''}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-sm font-medium">{group.first_message}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {group.total_count.toLocaleString()} occurrence
                                                {group.total_count === 1 ? '' : 's'}
                                                <Separator orientation="vertical" className="mx-2 inline-block h-3 align-middle" />
                                                last seen {formatRelative(group.last_occurrence_at)}
                                            </p>
                                        </div>
                                        <StatusBadge status={group.status} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination links={groups.links} from={groups.from} to={groups.to} total={groups.total} />
                </Card>
            </div>
        </AppLayout>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variant =
        status === 'resolved'
            ? 'success'
            : status === 'ignored'
                ? 'muted'
                : 'warning';

    return (
        <Badge variant={variant} className="capitalize">
            {status}
        </Badge>
    );
}

function shortClass(fqcn: string): string {
    const parts = fqcn.split('\\');
    return parts[parts.length - 1] ?? fqcn;
}

function formatRelative(iso: string | null): string {
    if (!iso) return 'never';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
