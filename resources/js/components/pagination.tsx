import { Link } from '@inertiajs/react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PaginatedLink } from '@/types/pagination';

type PaginationProps = {
    links: PaginatedLink[];
    from: number | null;
    to: number | null;
    total: number;
};

export function Pagination({ links, from, to, total }: PaginationProps) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs">
            <div className="text-muted-foreground">
                Showing {from ?? 0}–{to ?? 0} of {total.toLocaleString()}
            </div>
            <div className="flex flex-wrap items-center gap-1">
                {links.map((link, i) => (
                    <Link
                        key={`${link.label}-${i}`}
                        href={link.url ?? '#'}
                        preserveScroll
                        only={[]}
                        className={cn(
                            buttonVariants({ variant: link.active ? 'default' : 'outline', size: 'sm' }),
                            'h-7 min-w-8 px-2 text-xs',
                            !link.url && 'pointer-events-none opacity-40',
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
        </div>
    );
}
