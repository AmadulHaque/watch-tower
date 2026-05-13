import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { ProjectShell } from '@/layouts/project-shell';
import type { SharedProps } from '@/types/inertia';

type AppLayoutProps = {
    title: string;
    children: ReactNode;
};

export function AppLayout({ title, children }: AppLayoutProps) {
    const { props } = usePage<SharedProps>();

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-background text-foreground">
                {props.currentProject ? (
                    <ProjectShell
                        project={props.currentProject}
                        projects={props.projects}
                        user={props.auth?.user ?? null}
                    >
                        {children}
                    </ProjectShell>
                ) : (
                    <div className="mx-auto max-w-3xl p-10">{children}</div>
                )}
            </div>
        </>
    );
}
