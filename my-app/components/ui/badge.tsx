import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-zinc-100 text-zinc-900 shadow hover:bg-zinc-200',
        secondary:
          'border-zinc-800 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800',
        destructive:
          'border-red-900/50 bg-red-950/60 text-red-400',
        outline: 'border-zinc-800 text-zinc-400',
        success:
          'border-emerald-900/50 bg-emerald-950/60 text-emerald-400',
        warning:
          'border-amber-900/50 bg-amber-950/60 text-amber-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
