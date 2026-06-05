'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputScoreProps {
  value: number | ''
  onChange: (value: number | '') => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

const InputScore = React.forwardRef<HTMLInputElement, InputScoreProps>(
  ({ value, onChange, disabled, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="number"
        min={0}
        max={99}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (v === '') {
            onChange('')
          } else {
            const n = parseInt(v, 10)
            if (!isNaN(n) && n >= 0 && n <= 99) onChange(n)
          }
        }}
        disabled={disabled}
        className={cn(
          'h-14 w-14 rounded-xl border border-input bg-background text-center font-display text-3xl font-bold text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          className,
        )}
        {...props}
      />
    )
  },
)
InputScore.displayName = 'InputScore'

export { InputScore }
