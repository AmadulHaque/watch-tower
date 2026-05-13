import { router } from '@inertiajs/react';
import { PartyPopper } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AppLayout } from '@/layouts/app-layout';

type ActivityBucket = {
    bucket: string;
    success: number;
    client_error: number;
    server_error: number;
    avg_duration: number | null;
    p95_duration: number | null;
};

type JobBucket = {
    bucket: string;
    total: number;
    failed: number;
};

type DashboardStats = {
    range: { from: string; to: string; label: string };
    activity: {
        requests: { total: number; success: number; client_error: number; server_error: number };
        duration: {
            min_ms: number | null;
            max_ms: number | null;
            avg_ms: number | null;
            p95_ms: number | null;
            p99_ms: number | null;
        };
        buckets: ActivityBucket[];
    };
    exceptions: { total: number; window_label: string };
    jobs: {
        total: number;
        failed: number;
        processed: number;
        released: number;
        duration: { min_ms: number | null; max_ms: number | null; avg_ms: number | null; p95_ms: number | null };
        buckets: JobBucket[];
    };
};

type Props = {
    stats: DashboardStats;
    selectedRange: string;
};

export default function Dashboard({ stats, selectedRange }: Props) {
    return (
        <AppLayout title="Dashboard">
            <PageHeader
                title="Dashboard"
                breadcrumbs={[{ label: 'Activity' }, { label: 'Dashboard' }]}
                selectedRange={selectedRange}
                onRangeChange={(range) => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('range', range);
                    router.visit(url.pathname + url.search, { preserveScroll: true });
                }}
            />

            <div className="space-y-6 px-6 py-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle>Activity</CardTitle>
                        <span className="text-xs text-muted-foreground">Requests over time</span>
                    </CardHeader>
                    <Separator />
                    <CardContent className="grid gap-6 p-5 lg:grid-cols-2">
                        <RequestsPanel activity={stats.activity} />
                        <DurationPanel activity={stats.activity} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle>Application</CardTitle>
                        <span className="text-xs text-muted-foreground">Exceptions &amp; queue jobs</span>
                    </CardHeader>
                    <Separator />
                    <CardContent className="grid gap-6 p-5 lg:grid-cols-2">
                        <ExceptionsPanel exceptions={stats.exceptions} />
                        <JobsPanel jobs={stats.jobs} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function RequestsPanel({ activity }: { activity: DashboardStats['activity'] }) {
    const { requests, buckets } = activity;
    const data = buckets.map((b) => ({
        time: formatTime(b.bucket),
        success: b.success,
        client_error: b.client_error,
        server_error: b.server_error,
    }));

    return (
        <div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                <Stat label="Requests" value={formatNumber(requests.total)} accent="text-foreground" />
                <Stat label="Success" value={formatNumber(requests.success)} accent="text-emerald-600 dark:text-emerald-400" />
                <Stat label="4xx" value={formatNumber(requests.client_error)} accent="text-amber-600 dark:text-amber-400" />
                <Stat label="5xx" value={formatNumber(requests.server_error)} accent="text-rose-600 dark:text-rose-400" />
            </div>

            <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} interval={Math.floor(data.length / 6)} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} width={28} />
                        <Tooltip cursor={{ fill: 'var(--color-muted)' }} contentStyle={tooltipStyle} />
                        <Bar dataKey="success" stackId="status" fill="#10b981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="client_error" stackId="status" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="server_error" stackId="status" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function DurationPanel({ activity }: { activity: DashboardStats['activity'] }) {
    const { duration, buckets } = activity;
    const data = buckets.map((b) => ({
        time: formatTime(b.bucket),
        avg: b.avg_duration ?? 0,
        p95: b.p95_duration ?? 0,
    }));

    return (
        <div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                <Stat label="Avg" value={formatMs(duration.avg_ms)} accent="text-foreground" />
                <Stat label="P95" value={formatMs(duration.p95_ms)} accent="text-indigo-600 dark:text-indigo-400" />
                <Stat label="P99" value={formatMs(duration.p99_ms)} accent="text-violet-600 dark:text-violet-400" />
                <Stat label="Max" value={formatMs(duration.max_ms)} accent="text-rose-600 dark:text-rose-400" />
            </div>

            <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} interval={Math.floor(data.length / 6)} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} width={28} unit="ms" />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${Number(value).toFixed(0)} ms`} />
                        <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="p95" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function ExceptionsPanel({ exceptions }: { exceptions: DashboardStats['exceptions'] }) {
    if (exceptions.total === 0) {
        return (
            <div className="flex h-44 flex-col items-center justify-center rounded-md border border-dashed border-border text-center">
                <PartyPopper className="h-7 w-7 text-emerald-500" />
                <p className="mt-2 text-sm font-medium">No exceptions in {exceptions.window_label}</p>
                <p className="text-xs text-muted-foreground">Everything is running smoothly</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-baseline gap-3">
                <span className="text-4xl font-semibold text-destructive">{formatNumber(exceptions.total)}</span>
                <span className="text-xs text-muted-foreground">in {exceptions.window_label}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
                Visit the Exceptions page for grouped stack traces, status, and frequency.
            </p>
        </div>
    );
}

function JobsPanel({ jobs }: { jobs: DashboardStats['jobs'] }) {
    const data = jobs.buckets.map((b) => ({
        time: formatTime(b.bucket),
        total: b.total,
        failed: b.failed,
    }));

    return (
        <div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                <Stat label="Total" value={formatNumber(jobs.total)} accent="text-foreground" />
                <Stat label="Processed" value={formatNumber(jobs.processed)} accent="text-emerald-600 dark:text-emerald-400" />
                <Stat label="Failed" value={formatNumber(jobs.failed)} accent="text-rose-600 dark:text-rose-400" />
                <Stat label="P95" value={formatMs(jobs.duration.p95_ms)} accent="text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="mt-4 h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} interval={Math.floor(data.length / 6)} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} width={28} />
                        <Tooltip cursor={{ fill: 'var(--color-muted)' }} contentStyle={tooltipStyle} />
                        <Bar dataKey="total" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="failed" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={`text-base font-semibold ${accent}`}>{value}</div>
        </div>
    );
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
}

function formatMs(value: number | null): string {
    if (value === null || Number.isNaN(value)) {
        return '—';
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} s`;
    }
    return `${Math.round(value)} ms`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const tooltipStyle = {
    background: 'var(--color-popover)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    color: 'var(--color-popover-foreground)',
    fontSize: 12,
} as const;
