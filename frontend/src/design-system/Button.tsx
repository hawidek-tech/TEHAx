import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'af-transition inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-center no-underline disabled:cursor-not-allowed disabled:opacity-60'
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong border-2 border-primary',
  secondary: 'bg-surface text-primary border-2 border-primary hover:bg-primary-soft',
  ghost: 'bg-transparent text-ink border-2 border-transparent hover:border-line underline-offset-4',
  danger: 'bg-danger text-white border-2 border-danger hover:opacity-90',
}
// Minimum target sizes: sm 44px, md 48px, lg 56px (WCAG 2.5.8 needs 24px; we exceed it for motor accessibility).
const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  busy?: boolean
  ref?: Ref<HTMLButtonElement>
}

/** Accessible button. Icons are decorative; the visible text is always the accessible name. */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  busy,
  children,
  className = '',
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  )
}

interface LinkButtonProps extends LinkProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      <span>{children as ReactNode}</span>
    </Link>
  )
}
