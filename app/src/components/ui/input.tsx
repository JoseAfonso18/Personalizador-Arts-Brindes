import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-card placeholder:text-muted-foreground flex h-10 w-full min-w-0 rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow,border-color] hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:opacity-50 md:h-9 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
