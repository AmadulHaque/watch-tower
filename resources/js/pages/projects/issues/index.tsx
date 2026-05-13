import { Link, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import issues from '@/routes/projects/issues';
import type { SharedProps } from '@/types/inertia';
import type { Paginated } from '@/types/pagination';

type IssueRow = {
    id: string;
    display_number: number;
    exception_class: string;
    short_class: string;
    first_message: string;
    first_file: string | null;
    first_line: number | null;
    total_count: number;
    users_count: number;
    first_occurrence_at: string | null;
    last_occurrence_at: string | null;
    status: string;
    priority: string;
    is_handled: boolean;
    assigned_to: { id: number; name: string; email: string } | null;
    sparkline: number[];
};

type Counts = {
    open: number;
    unassigned: number;
    mine: number;
    resolved: number;
    ignored: number;
    all: number;
};

type Props = {
    groups: Paginated<IssueRow>;
    filters: { status: string; assignee: string | null; search: string };
    counts: Counts;
};

const STATUS_TABS = [
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'ignored', label: 'Ignored' },
    { value: 'all', label: 'All' },
] as const;

const ASSIGNEE_TABS = [
    { value: 'all', label: 'All' },
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'mine', label: 'Mine' },
] as const;

export default function IssuesIndex({ groups, filters, counts }: Props) {
    const { props } = usePage<SharedProps>();
    const projectSlug = props.currentProject?.slug ?? '';
    const [search, setSearch] = useState(filters.search);

    const applyFilter = (key: string, value: string | null) => {
        const url = new URL(window.location.href);
        if (value === null || value === '' || (key === 'assignee' && value === 'all')) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
        url.searchParams.delete('page');
        router.visit(url.pathname + url.search, { preserveScroll: true, preserveState: true });
    };

    const submitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        applyFilter('search', search.trim() || null);
    };

    const assigneeValue = filters.assignee ?? 'all';

    return (
        <AppLayout title="Issues">
            <PageHeader title="Issues" breadcrumbs={[{ label: 'Issues' }]} />

            <div className="flex flex-col gap-4 px-6 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs value={filters.status} onValueChange={(value) => applyFilter('status', value)}>
                        <TabsList className="h-9">
                            {STATUS_TABS.map((tab) => (
                                <TabsTrigger key={tab.value} value={tab.value} className="gap-2 px-3">
                                    <span>{tab.label}</span>
                                    <CountBadge value={tabCount(tab.value, counts)} active={filters.status === tab.value} />
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <div className="flex items-center gap-2">
                        <Tabs value={assigneeValue} onValueChange={(value) => applyFilter('assignee', value)}>
                            <TabsList className="h-9">
                                {ASSIGNEE_TABS.map((tab) => (
                                    <TabsTrigger key={tab.value} value={tab.value} className="gap-2 px-3">
                                        <span>{tab.label}</span>
                                        {tab.value !== 'all' && (
                                            <CountBadge
                                                value={tab.value === 'unassigned' ? counts.unassigned : counts.mine}
                                                active={assigneeValue === tab.value}
                                            />
                                        )}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <form onSubmit={submitSearch} className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search exceptions"
                                className="h-9 w-64 pl-8"
                            />
                        </form>
                    </div>
                </div>

                <Card className="overflow-hidden">
                    {groups.data.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <ul className="divide-y divide-border">
                            {groups.data.map((issue) => (
                                <IssueListItem key={issue.id} issue={issue} projectSlug={projectSlug} />
                            ))}
                        </ul>
                    )}

                    <Pagination links={groups.links} from={groups.from} to={groups.to} total={groups.total} />
                </Card>
            </div>
        </AppLayout>
    );
}

function IssueListItem({ issue, projectSlug }: { issue: IssueRow; projectSlug: string }) {
    const href = issues.show([projectSlug, issue.display_number]).url;

    return (
        <li>
            <Link
                href={href}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6 px-5 py-4 transition-colors hover:bg-muted/40"
            >
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono text-muted-foreground/80">#{issue.display_number}</span>
                        <Badge variant="muted" className="font-mono text-[10px]">
                            {issue.short_class}
                        </Badge>
                        {issue.is_handled ? (
                            <Badge variant="muted" className="text-[10px] tracking-wide uppercase">
                                Handled
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="text-[10px] tracking-wide uppercase">
                                Unhandled
                            </Badge>
                        )}
                        {issue.priority !== 'none' && <PriorityBadge priority={issue.priority} />}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">{issue.first_message}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {issue.first_file ?? 'unknown'}
                        {issue.first_line ? `:${issue.first_line}` : ''}
                    </p>
                </div>

                <Sparkline values={issue.sparkline} />

                <Stat label="events" value={issue.total_count.toLocaleString()} />
                <Stat label="users" value={issue.users_count.toLocaleString()} />

                <div className="flex items-center gap-2 text-right">
                    <div className="hidden flex-col items-end text-[11px] leading-tight text-muted-foreground sm:flex">
                        <span>{formatRelative(issue.last_occurrence_at)}</span>
                        <span>seen</span>
                    </div>
                    {issue.assigned_to ? (
                        <Avatar name={issue.assigned_to.name} />
                    ) : (
                        <Avatar name="?" muted />
                    )}
                </div>
            </Link>
        </li>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="hidden flex-col items-end text-right md:flex">
            <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</span>
        </div>
    );
}

function Sparkline({ values }: { values: number[] }) {
    if (!values || values.length === 0) {
        return <div className="h-8 w-32" />;
    }

    const max = Math.max(1, ...values);
    const width = 128;
    const height = 32;
    const step = width / values.length;

    const points = values
        .map((value, i) => {
            const x = i * step + step / 2;
            const y = height - (value / max) * (height - 4) - 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg width={width} height={height} className="hidden text-emerald-500 md:block" viewBox={`0 0 ${width} ${height}`}>
            <polyline fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" points={points} />
        </svg>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const variant = priority === 'high' ? 'destructive' : priority === 'medium' ? 'warning' : 'muted';
    return (
        <Badge variant={variant} className="text-[10px] tracking-wide uppercase">
            {priority}
        </Badge>
    );
}

function CountBadge({ value, active }: { value: number; active: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
        >
            {value > 999 ? '999+' : value}
        </span>
    );
}

function Avatar({ name, muted = false }: { name: string; muted?: boolean }) {
    return (
        <span
            className={cn(
                'grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold',
                muted ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
            )}
            title={name}
        >
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <p className="text-sm font-medium">No issues match the filter</p>
            <p className="mt-1 text-xs text-muted-foreground">Try widening the status or assignee filter.</p>
        </div>
    );
}

function tabCount(status: string, counts: Counts): number {
    switch (status) {
        case 'open':
            return counts.open;
        case 'resolved':
            return counts.resolved;
        case 'ignored':
            return counts.ignored;
        case 'all':
            return counts.all;
        default:
            return 0;
    }
}

function formatRelative(iso: string | null): string {
    if (!iso) return 'never';
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}
