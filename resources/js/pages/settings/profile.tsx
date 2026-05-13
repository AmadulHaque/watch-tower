import { Form, Head, router, usePage } from '@inertiajs/react';
import { Moon, Sun, Upload } from 'lucide-react';
import { useState } from 'react';

import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/hooks/use-theme';
import { SettingsShell } from '@/layouts/settings-shell';
import type { SharedProps } from '@/types/inertia';

type Props = {
    user: { id: number; name: string; email: string; avatar_url: string | null };
};

export default function ProfileSettings({ user }: Props) {
    const { props } = usePage<SharedProps & { flash?: { success?: string; error?: string } }>();
    const flashSuccess = props.flash?.success;

    return (
        <SettingsShell>
            <Head title="Profile" />
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
                <p className="text-sm text-muted-foreground">Your personal information and preferences.</p>
            </div>

            <div className="mx-auto w-full max-w-3xl space-y-6 px-8 py-8">
                {flashSuccess && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {flashSuccess}
                    </div>
                )}

                <GeneralSection user={user} />
                <PasswordSection />
                <PreferencesSection />
                <DangerZone isSuperAdmin={Boolean(props.auth?.user?.is_super_admin)} />
            </div>
        </SettingsShell>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
                <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            </div>
            <div className="divide-y divide-border">{children}</div>
        </section>
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

function GeneralSection({ user }: { user: Props['user'] }) {
    return (
        <Section title="General">
            <Form
                {...ProfileController.update.form()}
                className="contents"
                encType="multipart/form-data"
            >
                {({ errors, processing, recentlySuccessful }) => (
                    <>
                        <input type="hidden" name="_method" value="patch" />

                        <Row label="Profile picture" hint="Optional">
                            <div className="flex items-center gap-3">
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={user.name}
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload
                                    <input type="file" name="avatar" accept="image/*" className="sr-only" />
                                </label>
                            </div>
                            {errors.avatar && <p className="mt-1 text-xs text-rose-600">{errors.avatar}</p>}
                        </Row>

                        <Row label="Full name">
                            <Input name="name" defaultValue={user.name} required />
                            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                        </Row>

                        <Row label="Email address">
                            <Input type="email" name="email" defaultValue={user.email} required />
                            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                        </Row>

                        <div className="flex items-center justify-end gap-2 px-5 py-3">
                            {recentlySuccessful && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
                            )}
                            <Button type="submit" size="sm" disabled={processing}>
                                {processing ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </Section>
    );
}

function PasswordSection() {
    return (
        <Section title="Security">
            <Form
                {...PasswordController.update.form()}
                resetOnSuccess={['current_password', 'password', 'password_confirmation']}
                className="contents"
            >
                {({ errors, processing, recentlySuccessful }) => (
                    <>
                        <input type="hidden" name="_method" value="patch" />

                        <Row label="Current password">
                            <Input type="password" name="current_password" autoComplete="current-password" />
                            {errors.current_password && (
                                <p className="mt-1 text-xs text-rose-600">{errors.current_password}</p>
                            )}
                        </Row>

                        <Row label="New password">
                            <Input type="password" name="password" autoComplete="new-password" />
                            {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
                        </Row>

                        <Row label="Confirm new password">
                            <Input type="password" name="password_confirmation" autoComplete="new-password" />
                        </Row>

                        <div className="flex items-center justify-end gap-2 px-5 py-3">
                            {recentlySuccessful && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">Password updated</span>
                            )}
                            <Button type="submit" size="sm" disabled={processing}>
                                {processing ? 'Updating…' : 'Update password'}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </Section>
    );
}

function PreferencesSection() {
    const { theme, setTheme } = useTheme();
    return (
        <Section title="Preferences">
            <Row label="Theme" hint="Choose your preferred theme">
                <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark')}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light">
                            <span className="flex items-center gap-2">
                                <Sun className="h-3.5 w-3.5" /> Light
                            </span>
                        </SelectItem>
                        <SelectItem value="dark">
                            <span className="flex items-center gap-2">
                                <Moon className="h-3.5 w-3.5" /> Dark
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </Row>
        </Section>
    );
}

function DangerZone({ isSuperAdmin }: { isSuperAdmin: boolean }) {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (isSuperAdmin) {
        return (
            <Section title="Danger Zone">
                <div className="px-5 py-4 text-sm text-muted-foreground">
                    Super admins cannot delete their own account.
                </div>
            </Section>
        );
    }

    const submit = () => {
        setError(null);
        router.delete(ProfileController.destroy.url(), {
            data: { password },
            onError: (errs) => setError((errs.password as string) ?? 'Failed to delete account.'),
        });
    };

    return (
        <Section title="Danger Zone">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                    <div className="text-sm font-medium">Delete account</div>
                    <div className="text-xs text-muted-foreground">
                        Once deleted, all your data is permanently removed.
                    </div>
                </div>
                {!open ? (
                    <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
                        Delete account
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Input
                            type="password"
                            placeholder="Current password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-48"
                        />
                        <Button variant="destructive" size="sm" onClick={submit} disabled={!password}>
                            Confirm
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
            {error && <div className="px-5 pb-3 text-xs text-rose-600">{error}</div>}
        </Section>
    );
}
