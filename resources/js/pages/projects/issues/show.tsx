import { router, usePage } from '@inertiajs/react';
import {
    Bell,
    BellOff,
    Bookmark,
    ChevronRight,
    Code2,
    ExternalLink,
    Eye,
    LinkIcon,
    Sparkles,
    Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';

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
import issues from '@/routes/projects/issues';
import type { SharedProps } from '@/types/inertia';

type StackFrame = {
    file: string;
    line: number;
    function?: string | null;
    class?: string | null;
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

    const update = (payload: Record<string, unknown>) => {
        router.patch(issues.update([slug, issue.display_number]).url, payload, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <AppLayout title={`#${issue.display_number} ${issue.short_class}`}>
            <PageHeader
                title={
                    <span className="flex items-center gap-2">
                        <span className="font-mono text-base font-medium text-muted-foreground">#{issue.display_number}</span>
                        <span>{issue.short_class}</span>
                    </span>
                }
                breadcrumbs={[
                    { label: 'Issues', href: issues.index(slug).url },
                    { label: `#${issue.display_number}` },
                ]}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant={isSubscribed ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => update({ subscribe: !isSubscribed })}
                        >
                            {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                            {isSubscribed ? 'Subscribed' : 'Subscribe'}
                        </Button>
                        <Button variant="outline" size="sm" disabled title="Coming soon">
                            <Sparkles className="h-4 w-4" />
                            Ask AI
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col gap-6">
                    <HeaderSummary issue={issue} />
                    <DescriptionSection
                        description={issue.description}
                        onSave={(value) => update({ description: value })}
                    />
                    <StacktraceSection issue={issue} />
                </div>

                <aside className="flex flex-col gap-4">
                    <ManagePanel
                        issue={issue}
                        assignableUsers={assignableUsers}
                        onStatus={(status) => update({ status })}
                        onPriority={(priority) => update({ priority })}
                        onAssignee={(assigned_to_user_id) => update({ assigned_to_user_id })}
                    />
                    <DetailsPanel issue={issue} />
                    <OccurrencesPanel environments={issue.environments} total={issue.total_count} />
                    <LinkedPanel issue={issue} onSave={(linear_issue_url) => update({ linear_issue_url })} />
                </aside>
            </div>
        </AppLayout>
    );
}

function HeaderSummary({ issue }: { issue: Issue }) {
    return (
        <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="muted" className="font-mono text-[10px]">
                    {issue.exception_class}
                </Badge>
                {issue.is_handled ? (
                    <Badge variant="muted" className="tracking-wide uppercase">
                        Handled
                    </Badge>
                ) : (
                    <Badge variant="destructive" className="tracking-wide uppercase">
                        Unhandled
                    </Badge>
                )}
                {issue.priority !== 'none' && <PriorityBadge priority={issue.priority} />}
                <StatusBadge status={issue.status} />
            </div>
            <p className="mt-3 text-base font-medium text-foreground">{issue.first_message}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
                {issue.first_file ?? 'unknown'}
                {issue.first_line ? `:${issue.first_line}` : ''}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-4">
                <Stat label="Events" value={issue.total_count.toLocaleString()} />
                <Stat label="Users" value={issue.users_count.toLocaleString()} />
                <Stat
                    label="Last seen"
                    value={formatRelative(issue.last_occurrence_at)}
                    hint={issue.last_occurrence_at ? formatAbsolute(issue.last_occurrence_at) : undefined}
                />
            </div>
        </Card>
    );
}

function DescriptionSection({ description, onSave }: { description: string | null; onSave: (value: string) => void }) {
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    const [value, setValue] = useState(description ?? '');
    const [savedAt, setSavedAt] = useState<number | null>(null);

    const dirty = (description ?? '') !== value;

    const handleSave = () => {
        onSave(value);
        setSavedAt(Date.now());
    };

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Bookmark className="h-4 w-4 text-muted-foreground" />
                    <span>Description</span>
                </div>
                <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                    <TabsList className="h-7">
                        <TabsTrigger value="write" className="px-3 text-xs">
                            Write
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="px-3 text-xs">
                            Preview
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <div className="px-4 py-4">
                {mode === 'write' ? (
                    <textarea
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="Add notes for your team. Markdown supported."
                        className="min-h-[140px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    />
                ) : (
                    <PreviewMarkdown value={value} />
                )}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                <span>
                    {dirty
                        ? 'Unsaved changes'
                        : savedAt
                          ? `Saved ${formatRelative(new Date(savedAt).toISOString())}`
                          : 'Markdown supported'}
                </span>
                <Button size="sm" onClick={handleSave} disabled={!dirty}>
                    Save
                </Button>
            </div>
        </Card>
    );
}

function PreviewMarkdown({ value }: { value: string }) {
    if (value.trim() === '') {
        return <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>;
    }

    const blocks = value.split(/\n{2,}/);

    return (
        <div className="space-y-3 text-sm text-foreground">
            {blocks.map((block, i) => {
                if (block.startsWith('- ')) {
                    return (
                        <ul key={i} className="list-disc space-y-1 pl-5">
                            {block.split('\n').map((line, j) => (
                                <li key={j}>{renderInline(line.replace(/^- /, ''))}</li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <p key={i} className="whitespace-pre-wrap">
                        {renderInline(block)}
                    </p>
                );
            })}
        </div>
    );
}

function renderInline(text: string) {
    const tokens: React.ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        }
        const token = match[0];
        if (token.startsWith('**')) {
            tokens.push(
                <strong key={key++} className="font-semibold">
                    {token.slice(2, -2)}
                </strong>,
            );
        } else {
            tokens.push(
                <code key={key++} className="rounded bg-muted px-1 font-mono text-xs">
                    {token.slice(1, -1)}
                </code>,
            );
        }
        lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
        tokens.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }
    return tokens;
}

function StacktraceSection({ issue }: { issue: Issue }) {
    const occurrence = issue.latest_occurrence;
    const frames = occurrence?.stacktrace ?? [];

    const [activeFrame, setActiveFrame] = useState(0);

    const selected = frames[activeFrame];

    const snippet = useMemo(() => buildSnippet(selected), [selected]);

    if (!occurrence || frames.length === 0) {
        return (
            <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <span>Stacktrace</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">No stacktrace captured for the latest occurrence.</p>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <span>Stacktrace</span>
                </div>
                <span className="text-xs text-muted-foreground">
                    Latest event {occurrence.occurred_at ? `· ${formatRelative(occurrence.occurred_at)}` : ''}
                </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
                <ul className="max-h-[440px] divide-y divide-border overflow-y-auto">
                    {frames.map((frame, i) => (
                        <li key={i}>
                            <button
                                type="button"
                                onClick={() => setActiveFrame(i)}
                                className={cn(
                                    'w-full px-3 py-2 text-left transition-colors',
                                    i === activeFrame
                                        ? 'bg-muted/70'
                                        : 'hover:bg-muted/40',
                                )}
                            >
                                <div className="truncate font-mono text-[11px] text-foreground">{shortenFile(frame.file)}</div>
                                <div className="truncate text-[10px] text-muted-foreground">
                                    {frame.function ? `${frame.class ? frame.class + '::' : ''}${frame.function}` : ''}
                                    {' · '}
                                    line {frame.line}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="bg-background">
                    <div className="border-b border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
                        {selected?.file}:{selected?.line}
                    </div>
                    <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed">
                        {snippet.map((entry) => (
                            <div
                                key={entry.line}
                                className={cn(
                                    'grid grid-cols-[40px_1fr] items-baseline gap-3',
                                    entry.highlighted && 'bg-destructive/10 text-foreground',
                                )}
                            >
                                <span className="text-right text-muted-foreground/60 select-none">{entry.line}</span>
                                <span>{entry.text}</span>
                            </div>
                        ))}
                    </pre>
                </div>
            </div>
        </Card>
    );
}

type SnippetLine = { line: number; text: string; highlighted: boolean };

function buildSnippet(frame: StackFrame | undefined): SnippetLine[] {
    if (!frame) {
        return [];
    }

    const target = frame.line;
    const start = Math.max(1, target - 4);
    const end = target + 4;

    const lines: SnippetLine[] = [];
    for (let i = start; i <= end; i++) {
        lines.push({
            line: i,
            text: i === target ? `// ${frame.function ?? 'method'} threw here` : '...',
            highlighted: i === target,
        });
    }
    return lines;
}

function shortenFile(file: string | null | undefined): string {
    if (!file) return '';
    return file.replace(/^.*?\/(app|vendor)\//, '$1/');
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
        <Card className="p-4">
            <SectionTitle icon={<ChevronRight className="h-4 w-4" />}>Manage</SectionTitle>
            <div className="mt-3 flex flex-col gap-3 text-sm">
                <Field label="Status">
                    <Select value={issue.status} onValueChange={onStatus}>
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unresolved">Unresolved</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="ignored">Ignored</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="Priority">
                    <Select value={issue.priority} onValueChange={onPriority}>
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No priority</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="Assignee">
                    <Select
                        value={issue.assigned_to ? String(issue.assigned_to.id) : 'unassigned'}
                        onValueChange={(value) => onAssignee(value === 'unassigned' ? null : Number(value))}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue />
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
                </Field>
            </div>
        </Card>
    );
}

function DetailsPanel({ issue }: { issue: Issue }) {
    return (
        <Card className="p-4">
            <SectionTitle icon={<Tag className="h-4 w-4" />}>Details</SectionTitle>
            <dl className="mt-3 space-y-2 text-xs">
                <DetailRow label="First seen" value={formatAbsolute(issue.first_occurrence_at)} />
                <DetailRow label="Last seen" value={formatAbsolute(issue.last_occurrence_at)} />
                <DetailRow label="Framework" value={issue.framework_version ? `Laravel ${issue.framework_version}` : '—'} />
                <DetailRow label="Language" value={issue.language_version ? `PHP ${issue.language_version}` : '—'} />
                <DetailRow label="Class" value={issue.exception_class} mono />
            </dl>
        </Card>
    );
}

function OccurrencesPanel({ environments, total }: { environments: { environment: string; count: number }[]; total: number }) {
    return (
        <Card className="p-4">
            <SectionTitle icon={<Eye className="h-4 w-4" />}>Occurrences</SectionTitle>
            <ul className="mt-3 space-y-2 text-xs">
                {environments.length === 0 && <li className="text-muted-foreground">No environment data</li>}
                {environments.map((row) => {
                    const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                    return (
                        <li key={row.environment} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-foreground capitalize">{row.environment}</span>
                                <span className="tabular-nums text-muted-foreground">
                                    {row.count.toLocaleString()} ({pct}%)
                                </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

function LinkedPanel({ issue, onSave }: { issue: Issue; onSave: (url: string | null) => void }) {
    const [url, setUrl] = useState(issue.linear_issue_url ?? '');
    const dirty = (issue.linear_issue_url ?? '') !== url;

    return (
        <Card className="p-4">
            <SectionTitle icon={<LinkIcon className="h-4 w-4" />}>Linear</SectionTitle>
            {issue.linear_issue_url ? (
                <a
                    href={issue.linear_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 text-xs text-foreground hover:underline"
                >
                    <span className="truncate">{issue.linear_issue_url}</span>
                    <ExternalLink className="h-3 w-3" />
                </a>
            ) : (
                <p className="mt-2 text-xs text-muted-foreground">No linked issue.</p>
            )}
            <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSave(url.trim() === '' ? null : url.trim());
                }}
            >
                <Input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://linear.app/..."
                    className="h-8 text-xs"
                />
                <div className="flex justify-end">
                    <Button type="submit" size="sm" variant="outline" disabled={!dirty}>
                        {issue.linear_issue_url ? 'Update' : 'Link issue'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {icon}
            <span>{children}</span>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</label>
            {children}
        </div>
    );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className={cn('text-right text-foreground', mono && 'font-mono text-[11px] break-all')}>{value}</dd>
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</span>
            {hint && <span className="mt-0.5 text-[10px] text-muted-foreground">{hint}</span>}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variant = status === 'resolved' ? 'success' : status === 'ignored' ? 'muted' : 'warning';
    return (
        <Badge variant={variant} className="tracking-wide uppercase">
            {status}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const variant = priority === 'high' ? 'destructive' : priority === 'medium' ? 'warning' : 'muted';
    return (
        <Badge variant={variant} className="tracking-wide uppercase">
            {priority}
        </Badge>
    );
}

function formatRelative(iso: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

function formatAbsolute(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}
