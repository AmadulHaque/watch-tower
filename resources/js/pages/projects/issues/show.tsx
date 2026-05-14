import { router, usePage } from '@inertiajs/react';
import {
    Bell,
    BellOff,
    ChevronDown,
    ChevronRight,
    Circle,
    Clipboard,
    ExternalLink,
    Folder,
    LinkIcon,
    MoreHorizontal,
    Sparkles,
    UserCircle2,
} from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import comments from '@/routes/projects/issues/comments';
import issues from '@/routes/projects/issues';
import type { SharedProps } from '@/types/inertia';

type StackFrame = {
    file: string;
    source: string;
    code: Record<string, string> | null;
};

type OccurrenceListItem = {
    id: string;
    occurred_at: string | null;
    message: string | null;
    user_identifier: string | null;
    user_email: string | null;
    user_name: string | null;
    source_type: string;
    source_label: string | null;
};

type IssueComment = {
    id: number;
    body: string;
    type: string;
    created_at: string | null;
    user: { id: number; name: string; email: string } | null;
};

type Issue = {
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
    description: string | null;
    is_handled: boolean;
    framework_version: string | null;
    language_version: string | null;
    linear_issue_url: string | null;
    subscriber_ids: number[];
    assigned_to: { id: number; name: string; email: string } | null;
    environments: { environment: string; count: number }[];
    sparkline: number[];
    latest_occurrence: {
        id: string;
        message: string;
        file: string | null;
        line: number | null;
        stacktrace: StackFrame[];
        context: Record<string, unknown>;
        occurred_at: string | null;
    } | null;
    occurrence_list: OccurrenceListItem[];
    comments: IssueComment[];
};

type AssignableUser = {
    id: number;
    name: string;
    email: string;
};

type Props = {
    issue: Issue;
    assignableUsers: AssignableUser[];
};

export default function IssueShow({ issue, assignableUsers }: Props) {
    const { props } = usePage<SharedProps>();
    const slug = props.currentProject?.slug ?? '';
    const currentUserId = props.auth?.user?.id ?? null;
    const isSubscribed = currentUserId !== null && issue.subscriber_ids.includes(Number(currentUserId));

    const update = (payload: Record<string, string | number | boolean | null>) => {
        router.patch(issues.update([slug, issue.display_number]).url, payload, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const statusLabel = statusToLabel(issue.status);

    return (
        <AppLayout title={`#${issue.display_number} ${issue.short_class}`}>
            <PageHeader
                title={
                    <span className="block max-w-5xl text-2xl font-semibold leading-tight">
                        {issue.exception_class}: {issue.first_message}
                    </span>
                }
                breadcrumbs={[
                    { label: statusLabel, href: issues.index({ project: slug }, { query: { status: 'open' } }).url },
                    { label: String(issue.display_number) },
                ]}
            />

            <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_300px]">
                <div className="flex flex-col gap-6">
                    <DescriptionEditor
                        description={issue.description}
                        onSave={(value) => update({ description: value })}
                    />
                    <StacktraceCard issue={issue} />
                    <OccurrencesSection issue={issue} />
                    <ActivitySection
                        issue={issue}
                        projectSlug={slug}
                        currentUser={props.auth?.user ?? null}
                    />
                </div>

                <aside className="flex flex-col gap-3">
                    <ManagePanel
                        issue={issue}
                        assignableUsers={assignableUsers}
                        onStatus={(status) => update({ status })}
                        onPriority={(priority) => update({ priority })}
                        onAssignee={(assigned_to_user_id) => update({ assigned_to_user_id })}
                    />
                    <DetailsPanel issue={issue} />
                    <OccurrencesPanel issue={issue} />
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => update({ subscribe: !isSubscribed })}
                    >
                        {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                    </Button>
                    <LinearButton issue={issue} onSave={(url) => update({ linear_issue_url: url })} />
                </aside>
            </div>
        </AppLayout>
    );
}

function DescriptionEditor({ description, onSave }: { description: string | null; onSave: (value: string) => void }) {
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    const [value, setValue] = useState(description ?? '');

    const dirty = (description ?? '') !== value;

    const handleSave = () => {
        if (!dirty) return;
        onSave(value);
    };

    const handleGenerate = () => {
        setValue('## Summary\n\nDescribe the issue, its impact, and the next steps.\n');
        setMode('write');
    };

    return (
        <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                    <TabsList className="h-7 bg-transparent p-0">
                        <TabsTrigger value="write" className="px-3 text-xs data-[state=active]:bg-muted">
                            Write
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="px-3 text-xs data-[state=active]:bg-muted">
                            Preview
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <button
                    type="button"
                    onClick={handleGenerate}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    Generate Description
                    <Sparkles className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="px-4 py-3">
                {mode === 'write' ? (
                    <textarea
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        onBlur={handleSave}
                        placeholder="Type or # generate a description"
                        className="min-h-15 w-full resize-y border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                ) : (
                    <PreviewMarkdown value={value} />
                )}
            </div>
        </Card>
    );
}

function PreviewMarkdown({ value }: { value: string }) {
    if (value.trim() === '') {
        return <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>;
    }

    return (
        <div className="space-y-3 text-sm whitespace-pre-wrap text-foreground">{value}</div>
    );
}

function StacktraceCard({ issue }: { issue: Issue }) {
    const frames = issue.latest_occurrence?.stacktrace ?? [];
    const groups = groupFrames(frames);
    const [copied, setCopied] = useState(false);

    const copyMarkdown = () => {
        const md = [
            `**${issue.short_class}**`,
            '',
            issue.first_message,
            '',
            '```',
            ...frames.slice(0, 10).map((f) => `${f.file} — ${f.source}`),
            '```',
        ].join('\n');
        void navigator.clipboard.writeText(md).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <Card className="overflow-hidden p-0">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0 flex-1">
                    <HandledBadge handled={issue.is_handled} />
                    <h2 className="mt-3 text-lg font-semibold tracking-tight">{issue.exception_class}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{issue.first_message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyMarkdown} className="gap-1.5">
                        <Clipboard className="h-3.5 w-3.5" />
                        {copied ? 'Copied!' : 'Copy as Markdown'}
                    </Button>
                    {issue.framework_version && <VersionPill label="Laravel" value={issue.framework_version} />}
                    {issue.language_version && <VersionPill label="PHP" value={issue.language_version} />}
                </div>
            </div>

            {frames.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No stacktrace captured for the latest occurrence.
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {groups.map((group, i) => {
                        if (group.type === 'frame') {
                            return <FrameRow key={`frame-${i}`} frame={group.frame} defaultOpen={i === 0} />;
                        }

                        if (group.type === 'vendor') {
                            return <VendorFrames key={`vendor-${i}`} frames={group.frames} />;
                        }

                        return <EntrypointFrame key={`entry-${i}`} frame={group.frame} />;
                    })}
                </div>
            )}
        </Card>
    );
}

type FrameGroup =
    | { type: 'frame'; frame: StackFrame; index: number }
    | { type: 'vendor'; frames: StackFrame[]; index: number }
    | { type: 'entry'; frame: StackFrame; index: number };

function groupFrames(frames: StackFrame[]): FrameGroup[] {
    const groups: FrameGroup[] = [];
    let buffer: StackFrame[] = [];

    const flushVendor = (atIndex: number) => {
        if (buffer.length === 0) return;
        groups.push({ type: 'vendor', frames: buffer, index: atIndex });
        buffer = [];
    };

    frames.forEach((frame, i) => {
        if (i === frames.length - 1 && isEntrypoint(frame)) {
            flushVendor(i);
            groups.push({ type: 'entry', frame, index: i });
            return;
        }

        if (isVendor(frame) && !hasCode(frame)) {
            buffer.push(frame);
            return;
        }

        flushVendor(i);
        groups.push({ type: 'frame', frame, index: i });
    });

    flushVendor(frames.length);

    return groups;
}

function isVendor(frame: StackFrame): boolean {
    const path = parseFile(frame.file).path;
    return /^vendor\//.test(path) || /\/vendor\//.test(path);
}

function hasCode(frame: StackFrame): boolean {
    return !!frame.code && Object.keys(frame.code).length > 0;
}

function isEntrypoint(frame: StackFrame): boolean {
    const path = parseFile(frame.file).path;
    return /(^|\/)(artisan|public\/index\.php|server\.php)$/.test(path);
}

function parseFile(file: string | null | undefined): { path: string; line: number | null } {
    if (!file) return { path: '', line: null };
    const match = file.match(/^(.*):(\d+)$/);
    if (match) return { path: match[1], line: Number(match[2]) };
    return { path: file, line: null };
}

function FrameRow({ frame, defaultOpen }: { frame: StackFrame; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(!!defaultOpen);
    const { path, line } = parseFile(frame.file);
    const chain = buildChain(frame);
    const snippet = buildSnippet(frame);

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40"
            >
                <Circle className="h-2 w-2 shrink-0 fill-muted-foreground/60 text-muted-foreground/60" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground" title={chain}>
                    {chain}
                </span>
                <span className="shrink-0 truncate font-mono text-[11px] text-muted-foreground" title={frame.file}>
                    {shortenFile(path)}
                    {line ? <span className="text-violet-500 dark:text-violet-400">:{line}</span> : null}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')} />
            </button>
            {open && snippet.length > 0 && (
                <pre className="overflow-x-auto bg-muted/20 px-4 py-3 font-mono text-xs leading-relaxed">
                    {snippet.map((entry) => (
                        <div
                            key={entry.line}
                            className={cn(
                                'grid grid-cols-[40px_1fr] items-baseline gap-3',
                                entry.highlighted && 'bg-destructive/15 text-foreground',
                            )}
                        >
                            <span className="text-right text-muted-foreground/60 select-none">{entry.line}</span>
                            <span className="whitespace-pre">{entry.text}</span>
                        </div>
                    ))}
                </pre>
            )}
        </div>
    );
}

function VendorFrames({ frames }: { frames: StackFrame[] }) {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40"
            >
                <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">
                    {frames.length} vendor frame{frames.length === 1 ? '' : 's'}
                </span>
                <span className="flex-1" />
                <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
            </button>
            {open && (
                <ul className="divide-y divide-border/60 bg-muted/10">
                    {frames.map((frame, i) => {
                        const { path, line } = parseFile(frame.file);
                        const chain = buildChain(frame);

                        return (
                            <li key={i} className="flex items-center gap-3 px-4 py-2">
                                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground" title={chain}>
                                    {chain}
                                </span>
                                <span className="shrink-0 truncate font-mono text-[11px] text-muted-foreground/80" title={frame.file}>
                                    {shortenFile(path)}
                                    {line ? `:${line}` : ''}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function EntrypointFrame({ frame }: { frame: StackFrame }) {
    const { path, line } = parseFile(frame.file);

    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            <Circle className="h-2 w-2 shrink-0 fill-muted-foreground/60 text-muted-foreground/60" />
            <span className="text-[12px] text-muted-foreground">Entrypoint</span>
            <span className="flex-1" />
            <span className="font-mono text-[11px] text-muted-foreground">
                {shortenFile(path)}
                {line ? `:${line}` : ''}
            </span>
        </div>
    );
}

type SnippetLine = { line: number; text: string; highlighted: boolean };

function buildSnippet(frame: StackFrame | undefined): SnippetLine[] {
    if (!frame || !frame.code) return [];

    const target = parseFile(frame.file).line;

    return Object.entries(frame.code)
        .map(([key, text]) => {
            const lineNumber = Number(key);
            return {
                line: lineNumber,
                text,
                highlighted: target !== null && lineNumber === target,
            };
        })
        .sort((a, b) => a.line - b.line);
}

function buildChain(frame: StackFrame): string {
    if (frame.source) return frame.source;
    return shortenFile(parseFile(frame.file).path);
}

function shortenFile(file: string): string {
    if (!file) return '';
    return file.replace(/^.*?\/(app|vendor)\//, '$1/');
}

function OccurrencesSection({ issue }: { issue: Issue }) {
    const list = issue.occurrence_list ?? [];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                    <Circle className="h-3 w-3 fill-rose-500 text-rose-500" />
                    <span className="font-medium">{list.length} {list.length === 1 ? 'occurrence' : 'occurrences'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Last 30 days</span>
                    <Separator orientation="vertical" className="h-4" />
                    {issue.environments.slice(0, 1).map((env) => (
                        <span key={env.environment} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5">
                            <Circle className="h-2 w-2 fill-orange-500 text-orange-500" />
                            <span className="capitalize">{env.environment}</span>
                        </span>
                    ))}
                </div>
            </div>

            <Card className="overflow-hidden p-0">
                <div className="grid grid-cols-[160px_220px_minmax(0,1fr)_140px] gap-4 border-b border-border px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Date</span>
                    <span>Source</span>
                    <span>Message</span>
                    <span className="text-right">User</span>
                </div>
                {list.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-muted-foreground">No occurrences captured.</div>
                ) : (
                    <ul className="divide-y divide-border">
                        {list.map((row) => (
                            <li
                                key={row.id}
                                className="grid grid-cols-[160px_220px_minmax(0,1fr)_140px] items-center gap-4 px-5 py-2.5 text-sm"
                            >
                                <span className="font-mono text-[11px] text-muted-foreground">{formatRelative(row.occurred_at)}</span>
                                <span className="flex min-w-0 items-center gap-2">
                                    <SourceBadge type={row.source_type} />
                                    {row.source_label && (
                                        <span className="truncate font-mono text-[11px] text-muted-foreground" title={row.source_label}>
                                            {row.source_label}
                                        </span>
                                    )}
                                </span>
                                <span className="truncate text-[12px] text-foreground" title={row.message ?? ''}>
                                    {row.message ?? '—'}
                                </span>
                                <span className="flex items-center justify-end gap-1.5 truncate text-right text-[12px] text-muted-foreground">
                                    <span className="truncate">{row.user_name ?? row.user_email ?? row.user_identifier ?? 'Guest'}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

function SourceBadge({ type }: { type: string }) {
    return (
        <span className="inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {type}
        </span>
    );
}

function ActivitySection({
    issue,
    projectSlug,
    currentUser,
}: {
    issue: Issue;
    projectSlug: string;
    currentUser: { id: number | string; name?: string; email?: string } | null;
}) {
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submitComment = (resolve: boolean) => {
        if (!body.trim()) return;
        setSubmitting(true);
        router.post(
            comments.store([projectSlug, issue.display_number]).url,
            { body, resolve },
            {
                preserveScroll: true,
                onSuccess: () => setBody(''),
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const deleteComment = (commentId: number) => {
        router.delete(comments.destroy([projectSlug, issue.display_number, commentId]).url, {
            preserveScroll: true,
        });
    };

    const userInitial = currentUser?.name?.charAt(0).toUpperCase() ?? 'A';

    return (
        <section className="space-y-4">
            <h3 className="text-base font-semibold tracking-tight">Activity</h3>

            <ul className="space-y-4">
                <li className="flex items-start gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-500/20 text-blue-500">
                        <Circle className="h-3 w-3 fill-current" />
                    </span>
                    <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Watchtower</span> created the issue ·{' '}
                        {formatRelative(issue.first_occurrence_at)}
                    </div>
                </li>

                {issue.comments.map((comment) => (
                    <li key={comment.id} className="flex items-start gap-3">
                        <Avatar name={comment.user?.name ?? '?'} />
                        <div className="flex-1 rounded-lg border border-border bg-card">
                            <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs">
                                <span>
                                    <span className="font-medium text-foreground">{comment.user?.name ?? 'Unknown'}</span>{' '}
                                    <span className="text-muted-foreground">commented · {formatRelative(comment.created_at)}</span>
                                </span>
                                {currentUser && comment.user?.id === Number(currentUser.id) && (
                                    <button
                                        type="button"
                                        onClick={() => deleteComment(comment.id)}
                                        className="text-muted-foreground hover:text-foreground"
                                        aria-label="Delete comment"
                                    >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="px-3 py-2 text-sm whitespace-pre-wrap">{comment.body}</div>
                        </div>
                    </li>
                ))}
            </ul>

            <div className="flex items-start gap-3">
                <Avatar name={userInitial} />
                <Card className="flex-1 overflow-hidden p-0">
                    <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                        <span className="text-sm font-medium">Add a comment</span>
                    </div>
                    <div className="border-b border-border px-3 py-1.5">
                        <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                            <TabsList className="h-7 bg-transparent p-0">
                                <TabsTrigger value="write" className="px-3 text-xs data-[state=active]:bg-muted">
                                    Write
                                </TabsTrigger>
                                <TabsTrigger value="preview" className="px-3 text-xs data-[state=active]:bg-muted">
                                    Preview
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="px-3 py-2">
                        {mode === 'write' ? (
                            <textarea
                                value={body}
                                onChange={(event) => setBody(event.target.value)}
                                placeholder="Add a comment..."
                                className="min-h-20 w-full resize-y border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />
                        ) : (
                            <PreviewMarkdown value={body} />
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-3 py-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!body.trim() || submitting}
                            onClick={() => submitComment(true)}
                        >
                            Resolve now
                            <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                        <Button size="sm" disabled={!body.trim() || submitting} onClick={() => submitComment(false)}>
                            Comment
                        </Button>
                    </div>
                </Card>
            </div>
        </section>
    );
}

function ManagePanel({
    issue,
    assignableUsers,
    onStatus,
    onPriority,
    onAssignee,
}: {
    issue: Issue;
    assignableUsers: AssignableUser[];
    onStatus: (status: string) => void;
    onPriority: (priority: string) => void;
    onAssignee: (id: number | null) => void;
}) {
    return (
        <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Manage
            </div>
            <div className="flex flex-col">
                <PanelRow label="Status">
                    <Select value={issue.status} onValueChange={onStatus}>
                        <SelectTrigger className="h-7 w-auto border-0 bg-transparent px-1 text-xs hover:bg-muted/50">
                            <span className="inline-flex items-center gap-1.5">
                                <Circle className={cn('h-2 w-2', statusDotColor(issue.status))} />
                                <SelectValue />
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unresolved">Open</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="ignored">Ignored</SelectItem>
                        </SelectContent>
                    </Select>
                </PanelRow>
                <PanelRow label="Priority">
                    <Select value={issue.priority} onValueChange={onPriority}>
                        <SelectTrigger className="h-7 w-auto border-0 bg-transparent px-1 text-xs hover:bg-muted/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No priority</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </PanelRow>
                <PanelRow label="Assignee">
                    <Select
                        value={issue.assigned_to ? String(issue.assigned_to.id) : 'unassigned'}
                        onValueChange={(value) => onAssignee(value === 'unassigned' ? null : Number(value))}
                    >
                        <SelectTrigger className="h-7 w-auto border-0 bg-transparent px-1 text-xs hover:bg-muted/50">
                            <span className="inline-flex items-center gap-1.5">
                                <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <SelectValue />
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {assignableUsers.map((user) => (
                                <SelectItem key={user.id} value={String(user.id)}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </PanelRow>
            </div>
        </Card>
    );
}

function DetailsPanel({ issue }: { issue: Issue }) {
    return (
        <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Details
            </div>
            <div className="flex flex-col">
                <PanelRow label="First seen">
                    <span className="text-xs">{formatRelative(issue.first_occurrence_at)}</span>
                </PanelRow>
                <PanelRow label="Last seen">
                    <span className="text-xs">{formatRelative(issue.last_occurrence_at)}</span>
                </PanelRow>
            </div>
        </Card>
    );
}

function OccurrencesPanel({ issue }: { issue: Issue }) {
    return (
        <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-2 text-[11px] tracking-wider uppercase">
                <span className="font-semibold text-muted-foreground">Occurrences</span>
                <span className="text-muted-foreground">Last 14 days</span>
            </div>
            <ul className="flex flex-col">
                {issue.environments.length === 0 ? (
                    <li className="px-4 py-3 text-xs text-muted-foreground">No environments captured</li>
                ) : (
                    issue.environments.map((env) => (
                        <li
                            key={env.environment}
                            className="flex items-baseline gap-2 px-4 py-2 text-xs"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Circle className="h-2 w-2 fill-orange-500 text-orange-500" />
                                <span className="capitalize">{env.environment}</span>
                            </span>
                            <span
                                aria-hidden
                                className="flex-1 self-center border-b border-dotted border-border/80"
                            />
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                {env.count}
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </span>
                        </li>
                    ))
                )}
            </ul>
        </Card>
    );
}

function LinearButton({ issue, onSave }: { issue: Issue; onSave: (url: string | null) => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(issue.linear_issue_url ?? '');

    if (issue.linear_issue_url && !editing) {
        return (
            <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs">
                <a
                    href={issue.linear_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 truncate font-medium hover:underline"
                >
                    <LinkIcon className="h-4 w-4" />
                    Linear issue
                    <ExternalLink className="h-3 w-3" />
                </a>
                <button type="button" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                    Edit
                </button>
            </div>
        );
    }

    if (!editing) {
        return (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setEditing(true)}>
                <LinkIcon className="h-4 w-4" />
                Link to Linear
            </Button>
        );
    }

    return (
        <form
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-2"
            onSubmit={(event) => {
                event.preventDefault();
                onSave(value.trim() === '' ? null : value.trim());
                setEditing(false);
            }}
        >
            <Input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="https://linear.app/..."
                className="h-8 text-xs"
            />
            <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                </Button>
                <Button type="submit" size="sm">
                    Save
                </Button>
            </div>
        </form>
    );
}

function PanelRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <div className="flex items-center">{children}</div>
        </div>
    );
}

function HandledBadge({ handled }: { handled: boolean }) {
    if (handled) {
        return (
            <Badge variant="muted" className="font-mono text-[10px] tracking-wide uppercase">
                Handled
            </Badge>
        );
    }
    return (
        <Badge variant="destructive" className="font-mono text-[10px] tracking-wide uppercase">
            Unhandled
        </Badge>
    );
}

function VersionPill({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px]">
            <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="font-mono font-semibold text-foreground">{value}</span>
        </span>
    );
}

function Avatar({ name }: { name: string }) {
    return (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

function statusToLabel(status: string): string {
    switch (status) {
        case 'resolved':
            return 'Resolved';
        case 'ignored':
            return 'Ignored';
        default:
            return 'Open';
    }
}

function statusDotColor(status: string): string {
    switch (status) {
        case 'resolved':
            return 'fill-emerald-500 text-emerald-500';
        case 'ignored':
            return 'fill-muted-foreground text-muted-foreground';
        default:
            return 'fill-blue-500 text-blue-500';
    }
}

function formatRelative(iso: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
}
