import { Link, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Crumb = {
    label: string;
    href?: string;
};

type PageHeaderProps = {
    title: ReactNode;
    breadcrumbs?: Crumb[];
    selectedRange?: string;
    onRangeChange?: (range: string) => void;
    actions?: ReactNode;
};

const RANGES = ['15m', '1h', '24h', '7d', '14d', '30d'] as const;

export function PageHeader({ title, breadcrumbs, selectedRange, onRangeChange, actions }: PageHeaderProps) {
    return (
        <header className="border-b border-border bg-background px-6 py-4">
            {breadcrumbs ? (
                <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {breadcrumbs.map((crumb, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {crumb.href ? (
                                <Link href={crumb.href} className="hover:text-foreground">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span>{crumb.label}</span>
                            )}
                            {i < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
                        </span>
                    ))}
                </nav>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-semibold tracking-tight">{title}</h1>

                <div className="flex items-center gap-3">
                    {selectedRange ? <RangeTabs value={selectedRange} onChange={onRangeChange} /> : null}
                    {actions ? (
                        <>
                            {selectedRange ? <Separator orientation="vertical" className="h-6" /> : null}
                            {actions}
                        </>
                    ) : null}
                </div>
            </div>
        </header>
    );
}

function RangeTabs({ value, onChange }: { value: string; onChange?: (range: string) => void }) {
    return (
        <Tabs
            value={value}
            onValueChange={(range) => {
                if (onChange) {
                    onChange(range);
                    return;
                }
                const url = new URL(window.location.href);
                url.searchParams.set('range', range);
                router.visit(url.pathname + url.search, { preserveScroll: true });
            }}
        >
            <TabsList className="h-8">
                {RANGES.map((range) => (
                    <TabsTrigger key={range} value={range} className="px-2.5">
                        {range}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
