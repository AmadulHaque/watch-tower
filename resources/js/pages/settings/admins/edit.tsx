import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import AdminsController from '@/actions/App/Http/Controllers/Settings/AdminsController';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SettingsShell } from '@/layouts/settings-shell';

type ProjectOption = { id: string; name: string; slug: string };

type Admin = {
    id: number;
    name: string;
    email: string;
    project_ids: string[];
};

type Props = {
    admin: Admin;
    projects: ProjectOption[];
};

export default function AdminEdit({ admin, projects }: Props) {
    const assignedSet = new Set(admin.project_ids);

    return (
        <SettingsShell>
            <Head title={`Edit ${admin.name}`} />
            <div className="border-b border-border px-8 py-6">
                <Link
                    href={AdminsController.index.url()}
                    className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Back to admins
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight">Edit admin</h1>
                <p className="text-sm text-muted-foreground">Update details and project access.</p>
            </div>

            <div className="mx-auto w-full max-w-3xl px-8 py-8">
                <Form
                    {...AdminsController.update.form({ admin: admin.id })}
                    resetOnSuccess={['password', 'password_confirmation']}
                    className="space-y-6"
                >
                    {({ errors, processing, recentlySuccessful }) => (
                        <>
                            <input type="hidden" name="_method" value="patch" />

                            <section className="rounded-lg border border-border bg-card">
                                <div className="border-b border-border px-5 py-3">
                                    <h2 className="text-base font-semibold tracking-tight">Account</h2>
                                </div>
                                <div className="divide-y divide-border">
                                    <Row label="Full name">
                                        <Input name="name" defaultValue={admin.name} required />
                                        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                                    </Row>
                                    <Row label="Email">
                                        <Input type="email" name="email" defaultValue={admin.email} required />
                                        {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                                    </Row>
                                    <Row label="New password" hint="Leave blank to keep existing password.">
                                        <Input type="password" name="password" autoComplete="new-password" />
                                        {errors.password && (
                                            <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
                                        )}
                                    </Row>
                                    <Row label="Confirm new password">
                                        <Input
                                            type="password"
                                            name="password_confirmation"
                                            autoComplete="new-password"
                                        />
                                    </Row>
                                </div>
                            </section>

                            <section className="rounded-lg border border-border bg-card">
                                <div className="border-b border-border px-5 py-3">
                                    <h2 className="text-base font-semibold tracking-tight">Project access</h2>
                                </div>
                                <div className="px-5 py-4">
                                    {projects.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No projects yet.</p>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {projects.map((project) => (
                                                <label
                                                    key={project.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <Checkbox
                                                        name="project_ids[]"
                                                        value={project.id}
                                                        defaultChecked={assignedSet.has(project.id)}
                                                    />
                                                    <span className="flex flex-col">
                                                        <span className="font-medium">{project.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {project.slug}
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    {errors.project_ids && (
                                        <p className="mt-2 text-xs text-rose-600">{errors.project_ids}</p>
                                    )}
                                </div>
                            </section>

                            <div className="flex items-center justify-end gap-2">
                                {recentlySuccessful && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
                                )}
                                <Button asChild type="button" variant="ghost" size="sm">
                                    <Link href={AdminsController.index.url()}>Cancel</Link>
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
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-center">
            <div>
                <div className="text-sm font-medium">{label}</div>
                {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
            </div>
            <div>{children}</div>
        </div>
    );
}
