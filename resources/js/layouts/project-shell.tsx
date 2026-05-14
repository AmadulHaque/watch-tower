import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Bell,
    Bug,
    CalendarClock,
    Database,
    FileText,
    HardDrive,
    LayoutDashboard,
    Mail,
    Moon,
    Network,
    PanelLeftClose,
    PanelLeftOpen,
    Settings,
    Sun,
    Terminal,
    Users,
    Workflow,
} from 'lucide-react';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/projects';
import commands from '@/routes/projects/commands';
import exceptions from '@/routes/projects/exceptions';
import issues from '@/routes/projects/issues';
import cache from '@/routes/projects/cache';
import httpClient from '@/routes/projects/http-client';
import jobs from '@/routes/projects/jobs';
import logs from '@/routes/projects/logs';
import mail from '@/routes/projects/mail';
import notifications from '@/routes/projects/notifications';
import queries from '@/routes/projects/queries';
import requests from '@/routes/projects/requests';
import scheduledTasks from '@/routes/projects/scheduled-tasks';
import users from '@/routes/projects/users';
import profile from '@/routes/settings/profile';
import type { User } from '@/types/auth';
import type { CurrentProject, ProjectSummary } from '@/types/inertia';

type ProjectShellProps = {
    project: CurrentProject;
    projects: ProjectSummary[];
    user: User | null;
    children: ReactNode;
};

type NavGroup = {
    label: string | null;
    items: NavItem[];
};

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    matches: (path: string) => boolean;
    badge?: number;
};

export function ProjectShell({ project, projects, user, children }: ProjectShellProps) {
    const groups = navigationGroups(project);
    const path = usePage().url;
    const [collapsed, toggleCollapsed] = useSidebarCollapsed();

    return (
        <div className="flex min-h-screen">
            <aside
                className={cn(
                    'sticky top-0 hidden h-screen shrink-0 flex-col self-start border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
                    collapsed ? 'w-14' : 'w-60',
                )}
            >
                <div
                    className={cn(
                        'flex h-14 items-center',
                        collapsed ? 'justify-center px-2' : 'gap-2 px-4',
                    )}
                >
                    {collapsed ? (
                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            aria-label="Expand sidebar"
                            title="Expand sidebar"
                            className="group relative grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500 text-xs font-semibold text-white transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                            <span className="group-hover:opacity-0">LW</span>
                            <PanelLeftOpen className="absolute h-4 w-4 opacity-0 group-hover:opacity-100" />
                        </button>
                    ) : (
                        <>
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500 text-xs font-semibold text-white">
                                LW
                            </span>
                            <span className="text-sm font-semibold tracking-tight">LaravelWatch</span>
                            <Button
                                type="button"
                                onClick={toggleCollapsed}
                                variant="ghost"
                                size="icon"
                                className="ml-auto h-7 w-7"
                                aria-label="Collapse sidebar"
                            >
                                <PanelLeftClose className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
                <Separator />

                {!collapsed && (
                    <>
                        <ProjectSwitcher current={project} projects={projects} />
                        <Separator />
                    </>
                )}

                <nav
                    className={cn(
                        'flex-1 overflow-y-auto py-4 text-sm',
                        collapsed ? 'space-y-2 px-2' : 'space-y-5 px-3',
                    )}
                >
                    {groups.map((group, idx) => (
                        <div key={group.label ?? `group-${idx}`}>
                            {group.label && !collapsed && (
                                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                    {group.label}
                                </div>
                            )}
                            <ul className="space-y-0.5">
                                {group.items.map((item) => {
                                    const active = item.matches(path);
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.label}>
                                            <Link
                                                href={item.href}
                                                title={collapsed ? item.label : undefined}
                                                className={cn(
                                                    'flex items-center rounded-md text-[13px] transition-colors',
                                                    collapsed ? 'h-9 w-9 justify-center' : 'gap-2 px-2 py-1.5',
                                                    active
                                                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                                )}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                {!collapsed && (
                                                    <>
                                                        <span className="flex-1">{item.label}</span>
                                                        {typeof item.badge === 'number' && item.badge > 0 && (
                                                            <Badge variant="muted" className="px-1.5 text-[10px] font-medium">
                                                                {item.badge > 999 ? '999+' : item.badge}
                                                            </Badge>
                                                        )}
                                                    </>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <Separator />
                <UserFooter user={user} collapsed={collapsed} />
            </aside>

            <main className="flex min-w-0 flex-1 flex-col bg-muted/30">{children}</main>
        </div>
    );
}

function useSidebarCollapsed(): [boolean, () => void] {
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('sidebar:collapsed') === '1';
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0');
        } catch {
            // ignore quota / privacy errors
        }
    }, [collapsed]);

    return [collapsed, () => setCollapsed((c) => !c)];
}

function ProjectSwitcher({ current, projects }: { current: CurrentProject; projects: ProjectSummary[] }) {
    return (
        <div className="px-3 py-3">
            <div className="pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Project</div>
            <Select
                value={current.slug}
                onValueChange={(slug) => {
                    window.location.href = dashboard(slug).url;
                }}
            >
                <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                    {projects.map((project) => (
                        <SelectItem key={project.id} value={project.slug}>
                            {project.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function UserFooter({ user, collapsed }: { user: User | null; collapsed: boolean }) {
    const { theme, toggle } = useTheme();

    if (collapsed) {
        return (
            <div className="flex flex-col items-center gap-1 px-2 py-3">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Settings">
                    <Link href={profile.show().url} aria-label="Settings">
                        <Settings className="h-4 w-4" />
                    </Link>
                </Button>
                <Button
                    type="button"
                    onClick={toggle}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
                >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Link
                    href={profile.show().url}
                    className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
                    title={user?.name ?? 'Guest'}
                >
                    {(user?.name ?? 'G').charAt(0).toUpperCase()}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-3 text-xs">
            <Link
                href={profile.show().url}
                className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-80"
                title="Settings"
            >
                {(user?.name ?? 'G').charAt(0).toUpperCase()}
            </Link>
            <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-medium text-foreground">{user?.name ?? 'Guest'}</div>
                <div className="truncate text-muted-foreground">{user?.email ?? 'Not signed in'}</div>
            </div>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Settings">
                <Link href={profile.show().url} aria-label="Settings">
                    <Settings className="h-4 w-4" />
                </Link>
            </Button>
            <Button
                type="button"
                onClick={toggle}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
        </div>
    );
}

function navigationGroups(project: CurrentProject): NavGroup[] {
    const slug = project.slug;

    return [
        {
            label: null,
            items: [
                { label: 'Dashboard', icon: LayoutDashboard, href: dashboard(slug).url, matches: (p) => p.endsWith('/dashboard') },
                {
                    label: 'Issues',
                    icon: Bug,
                    href: issues.index(slug).url,
                    matches: (p) => p.endsWith('/issues') || p.includes('/issues?') || p.includes('/issues/'),
                    badge: project.open_issues_count,
                },
            ],
        },
        {
            label: 'Activity',
            items: [
                {
                    label: 'Requests',
                    icon: Activity,
                    href: requests.index(slug).url,
                    matches: (p) => p.endsWith('/requests') || p.includes('/requests?'),
                },
                {
                    label: 'Jobs',
                    icon: Workflow,
                    href: jobs.index(slug).url,
                    matches: (p) => p.endsWith('/jobs') || p.includes('/jobs?') || p.includes('/jobs/'),
                },
                {
                    label: 'Commands',
                    icon: Terminal,
                    href: commands.index(slug).url,
                    matches: (p) => p.endsWith('/commands') || p.includes('/commands?') || p.includes('/commands/'),
                },
                {
                    label: 'Scheduled Tasks',
                    icon: CalendarClock,
                    href: scheduledTasks.index(slug).url,
                    matches: (p) => p.endsWith('/scheduled-tasks') || p.includes('/scheduled-tasks?') || p.includes('/scheduled-tasks/'),
                },
                {
                    label: 'Exceptions',
                    icon: AlertTriangle,
                    href: exceptions.index(slug).url,
                    matches: (p) => p.endsWith('/exceptions') || p.includes('/exceptions?'),
                },
                {
                    label: 'Queries',
                    icon: Database,
                    href: queries.index(slug).url,
                    matches: (p) => p.endsWith('/queries') || p.includes('/queries?') || p.includes('/queries/'),
                },
                {
                    label: 'Cache',
                    icon: HardDrive,
                    href: cache.index(slug).url,
                    matches: (p) => p.includes('/cache'),
                },
                {
                    label: 'Notifications',
                    icon: Bell,
                    href: notifications.index(slug).url,
                    matches: (p) => p.includes('/notifications'),
                },
                {
                    label: 'Mail',
                    icon: Mail,
                    href: mail.index(slug).url,
                    matches: (p) => p.includes('/mail'),
                },
                {
                    label: 'HTTP Client',
                    icon: Network,
                    href: httpClient.index(slug).url,
                    matches: (p) => p.includes('/http-client'),
                },
            ],
        },
        {
            label: 'Monitoring',
            items: [
                {
                    label: 'Users',
                    icon: Users,
                    href: users.index(slug).url,
                    matches: (p) => p.endsWith('/users') || p.includes('/users?') || p.includes('/users/'),
                },
                {
                    label: 'Logs',
                    icon: FileText,
                    href: logs.index(slug).url,
                    matches: (p) => p.endsWith('/logs') || p.includes('/logs?'),
                },
            ],
        },
    ];
}
