import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, FolderKanban, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import admins from '@/routes/settings/admins';
import profile from '@/routes/settings/profile';
import projects from '@/routes/settings/projects';
import type { SharedProps } from '@/types/inertia';

type SettingsShellProps = {
    children: ReactNode;
};

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    matches: (path: string) => boolean;
    superAdminOnly?: boolean;
};

export function SettingsShell({ children }: SettingsShellProps) {
    const page = usePage<SharedProps>();
    const user = page.props.auth?.user;
    const path = page.url;
    const isSuperAdmin = Boolean(user?.is_super_admin);

    const items: NavItem[] = [
        {
            label: 'Profile',
            href: profile.show().url,
            icon: UserRound,
            matches: (p: string) => p.startsWith('/settings/profile'),
        },
        {
            label: 'Admins',
            href: admins.index().url,
            icon: ShieldCheck,
            matches: (p: string) => p.startsWith('/settings/admins'),
            superAdminOnly: true,
        },
        {
            label: 'Projects',
            href: projects.index().url,
            icon: FolderKanban,
            matches: (p: string) => p.startsWith('/settings/projects'),
            superAdminOnly: true,
        },
    ].filter((item) => !item.superAdminOnly || isSuperAdmin);

    const onLogout = () => {
        router.post(logout.url());
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start border-r border-sidebar-border bg-sidebar md:flex">
                <div className="px-4 pt-5 pb-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                </div>

                <div className="flex items-center gap-2 px-4 pb-3 text-sm">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
                        {(user?.name ?? 'U').charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate font-medium">{user?.name}</span>
                </div>

                <nav className="space-y-0.5 px-2 py-2">
                    {items.map((item) => {
                        const active = item.matches(path);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                                    active
                                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto px-3 py-4">
                    <Separator className="mb-3" />
                    <div className="mb-2 px-1 text-[11px] leading-tight">
                        <div className="font-medium text-foreground">Signed in as</div>
                        <div className="truncate text-muted-foreground">{user?.email}</div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={onLogout}
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="h-4 w-4" />
                        Log out
                    </Button>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
    );
}
