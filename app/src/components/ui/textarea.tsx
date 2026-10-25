import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input bg-card placeholder:text-muted-foreground flex min-h-20 w-full rounded-md border px-3 py-2 text-base outline-none hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/20 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
