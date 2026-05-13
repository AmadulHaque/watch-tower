import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, checked, ...props }, ref) => (
    <label className={cn('relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center', className)}>
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            className="peer absolute h-4 w-4 cursor-pointer opacity-0"
            {...props}
        />
        <span className="grid h-4 w-4 place-items-center rounded-sm border border-input bg-background text-primary-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
            <Check className={cn('h-3 w-3', checked ? 'opacity-100' : 'opacity-0')} />
        </span>
    </label>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
