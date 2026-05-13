import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import ProjectAdminController from '@/actions/App/Http/Controllers/Settings/ProjectAdminController';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SettingsShell } from '@/layouts/settings-shell';

type AdminOption = { id: number; name: string; email: string };

type Project = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sampling_rate: number;
    retention_days: number;
    admin_ids: number[];
};

type Props = {
    project: Project;
    admins: AdminOption[];
};

export default function ProjectEdit({ project, admins }: Props) {
    const assignedSet = new Set(project.admin_ids);

    return (
        <SettingsShell>
            <Head title={`Edit ${project.name}`} />
            <div className="border-b border-border px-8 py-6">
                <Link
                    href={ProjectAdminController.index.url()}
                    className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Back to projects
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight">Edit project</h1>
                <p className="text-sm text-muted-foreground">Update settings and admin access.</p>
            </div>

            <div className="mx-auto w-full max-w-3xl px-8 py-8">
                <Form {...ProjectAdminController.update.form({ project: project.slug })} className="space-y-6">
                    {({ errors, processing, recentlySuccessful }) => (
                        <>
                            <input type="hidden" name="_method" value="patch" />

                            <section className="rounded-lg border border-border bg-card">
                                <div className="border-b border-border px-5 py-3">
                                    <h2 className="text-base font-semibold tracking-tight">Details</h2>
                                </div>
                                <div className="divide-y divide-border">
                                    <Row label="Name">
                                        <Input name="name" defaultValue={project.name} required />
                                        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                                    </Row>
                                    <Row label="Slug">
                                        <Input
                                            name="slug"
                                            defaultValue={project.slug}
                                            required
                                            className="font-mono"
                                        />
                                        {errors.slug && <p className="mt-1 text-xs text-rose-600">{errors.slug}</p>}
                                    </Row>
                                    <Row label="Description" hint="Optional">
                                        <textarea
                                            name="description"
                                            rows={3}
                                            defaultValue={project.description ?? ''}
                                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-xs text-rose-600">{errors.description}</p>
                                        )}
                                    </Row>
                                    <Row label="Sampling rate" hint="0 to 1.">
                                        <Input
                                            type="number"
                                            name="sampling_rate"
                                            defaultValue={project.sampling_rate}
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            required
                                        />
                                        {errors.sampling_rate && (
                                            <p className="mt-1 text-xs text-rose-600">{errors.sampling_rate}</p>
                                        )}
                                    </Row>
                                    <Row label="Retention (days)">
                                        <Input
                                            type="number"
                                            name="retention_days"
                                            defaultValue={project.retention_days}
                                            min="1"
                                            max="365"
                                            required
                                        />
                                        {errors.retention_days && (
                                            <p className="mt-1 text-xs text-rose-600">{errors.retention_days}</p>
                                        )}
                                    </Row>
                                </div>
                            </section>

                            <section className="rounded-lg border border-border bg-card">
                                <div className="border-b border-border px-5 py-3">
                                    <h2 className="text-base font-semibold tracking-tight">Admins with access</h2>
                                </div>
                                <div className="px-5 py-4">
                                    {admins.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No admins yet.</p>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {admins.map((admin) => (
                                                <label
                                                    key={admin.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <Checkbox
                                                        name="admin_ids[]"
                                                        value={admin.id}
                                                        defaultChecked={assignedSet.has(admin.id)}
                                                    />
                                                    <span className="flex flex-col">
                                                        <span className="font-medium">{admin.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {admin.email}
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <div className="flex items-center justify-end gap-2">
                                {recentlySuccessful && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
                                )}
                                <Button asChild type="button" variant="ghost" size="sm">
                                    <Link href={ProjectAdminController.index.url()}>Cancel</Link>
                                </Button>
                                <Button type="submit" size="sm" disabled={processing}>
                                    {processing ? 'Saving…' : 'Save'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </SettingsShell>
    );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-start">
            <div className="pt-1.5">
                <div className="text-sm font-medium">{label}</div>
                {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
            </div>
            <div>{children}</div>
        </div>
    );
}
