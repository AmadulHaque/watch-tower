import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import ProjectAdminController from '@/actions/App/Http/Controllers/Settings/ProjectAdminController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsShell } from '@/layouts/settings-shell';
import type { SharedProps } from '@/types/inertia';

type Project = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sampling_rate: number;
    retention_days: number;
    admins_count: number;
    open_issues_count: number;
    created_at: string | null;
};

type Props = {
    projects: Project[];
};

export default function ProjectsIndex({ projects }: Props) {
    const { props } = usePage<SharedProps & { flash?: { success?: string } }>();
    const flashSuccess = props.flash?.success;
    const [target, setTarget] = useState<Project | null>(null);

    return (
        <SettingsShell>
            <Head title="Projects" />
            <div className="flex items-center justify-between border-b border-border px-8 py-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
                    <p className="text-sm text-muted-foreground">Create projects and assign admin access.</p>
                </div>
                <Button asChild size="sm">
                    <Link href={ProjectAdminController.create.url()}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        New project
                    </Link>
                </Button>
            </div>

            <div className="mx-auto w-full max-w-5xl px-8 py-8">
                {flashSuccess && (
                    <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {flashSuccess}
                    </div>
                )}

                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-medium">Project</th>
                                <th className="px-4 py-2.5 text-left font-medium">Sampling</th>
                                <th className="px-4 py-2.5 text-left font-medium">Retention</th>
                                <th className="px-4 py-2.5 text-left font-medium">Admins</th>
                                <th className="px-4 py-2.5 text-left font-medium">Open issues</th>
                                <th className="px-4 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                        No projects yet.
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project) => (
                                    <tr key={project.id}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{project.name}</div>
                                            <div className="text-xs text-muted-foreground">{project.slug}</div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {Math.round(project.sampling_rate * 100)}%
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{project.retention_days}d</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" />
                                                {project.admins_count}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {project.open_issues_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link
                                                        href={ProjectAdminController.edit.url({
                                                            project: project.slug,
                                                        })}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setTarget(project)}
                                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {target && <DeleteDialog project={target} onClose={() => setTarget(null)} />}
        </SettingsShell>
    );
}

function DeleteDialog({ project, onClose }: { project: Project; onClose: () => void }) {
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const canDelete = confirmation === project.slug;

    const submit = () => {
        if (!canDelete) {
            return;
        }
        setProcessing(true);
        setError(null);
        router.delete(ProjectAdminController.destroy.url({ project: project.slug }), {
            data: { confirmation },
            onError: (errs) => setError((errs.confirmation as string) ?? 'Failed to delete project.'),
            onFinish: () => setProcessing(false),
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
                <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                        <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold tracking-tight">Delete project</h2>
                        <p className="text-xs text-muted-foreground">
                            This permanently deletes <span className="font-medium text-foreground">{project.name}</span>{' '}
                            and all errors, events, logs, requests, jobs, and other data.
                        </p>
                    </div>
                </div>

                <div className="space-y-2 px-5 py-4">
                    <label className="text-xs text-muted-foreground">
                        Type <span className="font-mono text-foreground">{project.slug}</span> to confirm:
                    </label>
                    <Input
                        autoFocus
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        placeholder={project.slug}
                        className="font-mono"
                    />
                    {error && <p className="text-xs text-rose-600">{error}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={processing}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={submit}
                        disabled={!canDelete || processing}
                    >
                        {processing ? 'Deleting…' : 'Delete project'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
