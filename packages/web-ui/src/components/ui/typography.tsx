import { forwardRef } from 'react'
import { ComponentPropsWithRef } from 'react'

import { cva, VariantProps } from 'class-variance-authority'

export interface TypographyProps
  extends ComponentPropsWithRef<'div'>,
    VariantProps<typeof typographyVariant> {
  component?: VariantProps<typeof typographyVariant>['variant'] | 'div' | 'span'
}

const typographyVariant = cva('', {
  variants: {
    variant: {
      h1: 'text-4xl text-foreground lg:text-5xl font-sans',
      h2: 'text-3xl text-foreground font-sans',
      h3: 'text-2xl text-foreground font-sans',
      h4: 'text-xl text-foreground tracking-tight font-sans',
      h5: 'text-lg text-foreground lg:text-xl font-sans',
      h6: 'text-base text-foreground lg:text-lg font-sans',
      p: 'text-base text-foreground font-serif',
      blockquote: 'mt-6 border-l-2 border-border pl-6 text-base text-foreground italic font-serif',
      code: 'relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] text-sm text-foreground font-semibold',
      lead: 'text-xl text-muted-foreground',
      large: 'text-xl text-foreground font-semibold',
      small: 'text-sm text-foreground font-medium leading-none',
      muted: 'text-sm text-muted-foreground',
    },
    fontWeight: {
      light: 'font-light',
      regular: 'font-normal',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'p',
    fontWeight: 'regular',
  },
})

const variantsMapping = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  tiny: 'p',
  p: 'p',
  blockquote: 'p',
  code: 'code',
  lead: 'p',
  large: 'p',
  small: 'p',
  muted: 'p',
  div: 'div',
  span: 'span',
} as const

export const Typography = forwardRef<HTMLDivElement, TypographyProps>(
  ({ className, variant, fontWeight, component, ...props }, ref) => {
    const Component = component ? variantsMapping[component] : 'p'

    return (
      <Component
        {...props}
        className={typographyVariant({ fontWeight, variant, className })}
        ref={ref}
      />
    )
  }
)

Typography.displayName = 'Typography'
