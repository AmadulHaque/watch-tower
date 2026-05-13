import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Bell,
    Boxes,
    Braces,
    Bug,
    CalendarClock,
    Database,
    Eye,
    FileText,
    HardDrive,
    LayoutDashboard,
    Layers,
    Mail,
    Moon,
    Network,
    Server,
    ShieldCheck,
    Sun,
    Terminal,
    Users,
    Workflow,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { dashboard, placeholder } from '@/routes/projects';
import exceptions from '@/routes/projects/exceptions';
import issues from '@/routes/projects/issues';
import requests from '@/routes/projects/requests';
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

    return (
        <div className="flex min-h-screen">
            <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
                <div className="flex h-14 items-center gap-2 px-4">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500 text-xs font-semibold text-white">
                        LW
                    </span>
                    <span className="text-sm font-semibold tracking-tight">LaravelWatch</span>
                </div>
                <Separator />

                <ProjectSwitcher current={project} projects={projects} />
                <Separator />

                <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 text-sm">
                    {groups.map((group, idx) => (
                        <div key={group.label ?? `group-${idx}`}>
                            {group.label && (
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
                                                className={cn(
                                                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                                                    active
                                                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                                )}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                <span className="flex-1">{item.label}</span>
                                                {typeof item.badge === 'number' && item.badge > 0 && (
                                                    <Badge variant="muted" className="px-1.5 text-[10px] font-medium">
                                                        {item.badge > 999 ? '999+' : item.badge}
                                                    </Badge>
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
                <UserFooter user={user} />
            </aside>

            <main className="flex flex-1 flex-col bg-muted/30">{children}</main>
        </div>
    );
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
            <div className="mt-2 flex items-center justify-between text-[10px] tracking-wider text-muted-foreground uppercase">
                <span>Environment</span>
                <Badge variant="muted" className="font-mono normal-case">
                    {current.environment}
                </Badge>
            </div>
        </div>
    );
}

function UserFooter({ user }: { user: User | null }) {
    const { theme, toggle } = useTheme();

    return (
        <div className="flex items-center gap-2 px-3 py-3 text-xs">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {(user?.name ?? 'G').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-medium text-foreground">{user?.name ?? 'Guest'}</div>
                <div className="truncate text-muted-foreground">{user?.email ?? 'Not signed in'}</div>
            </div>
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
                    href: placeholder({ project: slug, section: 'jobs' }).url,
                    matches: (p) => p.endsWith('/jobs'),
                },
                {
                    label: 'Commands',
                    icon: Terminal,
                    href: placeholder({ project: slug, section: 'commands' }).url,
                    matches: (p) => p.endsWith('/commands'),
                },
                {
                    label: 'Scheduled Tasks',
                    icon: CalendarClock,
                    href: placeholder({ project: slug, section: 'schedule' }).url,
                    matches: (p) => p.endsWith('/schedule'),
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
                    href: placeholder({ project: slug, section: 'queries' }).url,
                    matches: (p) => p.endsWith('/queries'),
                },
                {
                    label: 'Models',
                    icon: Layers,
                    href: placeholder({ project: slug, section: 'models' }).url,
                    matches: (p) => p.endsWith('/models'),
                },
                {
                    label: 'Cache',
                    icon: HardDrive,
                    href: placeholder({ project: slug, section: 'cache' }).url,
                    matches: (p) => p.endsWith('/cache'),
                },
                {
                    label: 'Notifications',
                    icon: Bell,
                    href: placeholder({ project: slug, section: 'notifications' }).url,
                    matches: (p) => p.endsWith('/notifications'),
                },
                {
                    label: 'Mail',
                    icon: Mail,
                    href: placeholder({ project: slug, section: 'mail' }).url,
                    matches: (p) => p.endsWith('/mail'),
                },
                {
                    label: 'HTTP Client',
                    icon: Network,
                    href: placeholder({ project: slug, section: 'http-client' }).url,
                    matches: (p) => p.endsWith('/http-client'),
                },
                {
                    label: 'Events',
                    icon: Boxes,
                    href: placeholder({ project: slug, section: 'events' }).url,
                    matches: (p) => p.endsWith('/events'),
                },
            ],
        },
        {
            label: 'Monitoring',
            items: [
                {
                    label: 'Users',
                    icon: Users,
                    href: placeholder({ project: slug, section: 'logs' }).url,
                    matches: (p) => p.endsWith('/users'),
                },
                {
                    label: 'Logs',
                    icon: FileText,
                    href: placeholder({ project: slug, section: 'logs' }).url,
                    matches: (p) => p.endsWith('/logs'),
                },
                {
                    label: 'Dumps',
                    icon: Braces,
                    href: placeholder({ project: slug, section: 'dumps' }).url,
                    matches: (p) => p.endsWith('/dumps'),
                },
                {
                    label: 'Views',
                    icon: Eye,
                    href: placeholder({ project: slug, section: 'views' }).url,
                    matches: (p) => p.endsWith('/views'),
                },
                {
                    label: 'Gates',
                    icon: ShieldCheck,
                    href: placeholder({ project: slug, section: 'gates' }).url,
                    matches: (p) => p.endsWith('/gates'),
                },
                {
                    label: 'Redis',
                    icon: Server,
                    href: placeholder({ project: slug, section: 'redis' }).url,
                    matches: (p) => p.endsWith('/redis'),
                },
            ],
        },
    ];
}
