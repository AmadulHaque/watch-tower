import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import AdminsController from '@/actions/App/Http/Controllers/Settings/AdminsController';
import { Button } from '@/components/ui/button';
import { SettingsShell } from '@/layouts/settings-shell';
import type { SharedProps } from '@/types/inertia';

type Admin = {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'admin';
    projects_count: number;
    last_login_at: string | null;
    created_at: string | null;
};

type Props = {
    admins: Admin[];
};

export default function AdminsIndex({ admins }: Props) {
    const { props } = usePage<SharedProps & { flash?: { success?: string } }>();
    const flashSuccess = props.flash?.success;
    const [deleting, setDeleting] = useState<number | null>(null);

    const onDelete = (admin: Admin) => {
        if (!confirm(`Remove ${admin.name}? They will lose access immediately.`)) {
            return;
        }
        setDeleting(admin.id);
        router.delete(AdminsController.destroy.url({ admin: admin.id }), {
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <SettingsShell>
            <Head title="Admins" />
            <div className="flex items-center justify-between border-b border-border px-8 py-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Admins</h1>
                    <p className="text-sm text-muted-foreground">Manage users with admin access to projects.</p>
                </div>
                <Button asChild size="sm">
                    <Link href={AdminsController.create.url()}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add admin
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
                                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                                <th className="px-4 py-2.5 text-left font-medium">Projects</th>
                                <th className="px-4 py-2.5 text-left font-medium">Last login</th>
                                <th className="px-4 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {admins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                        No admins yet.
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr key={admin.id}>
                                        <td className="px-4 py-2.5 font-medium">{admin.name}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">{admin.email}</td>
                                        <td className="px-4 py-2.5">
                                            <span
                                                className={
                                                    admin.role === 'super_admin'
                                                        ? 'inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                        : 'inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                                                }
                                            >
                                                {admin.role === 'super_admin' ? 'Super admin' : 'Admin'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground">{admin.projects_count}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {admin.last_login_at
                                                ? new Date(admin.last_login_at).toLocaleString()
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            {admin.role !== 'super_admin' && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={AdminsController.edit.url({ admin: admin.id })}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onDelete(admin)}
                                                        disabled={deleting === admin.id}
                                                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </SettingsShell>
    );
}
