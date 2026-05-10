import { type ReactNode, useEffect } from 'react';
import { cn } from '../../utils/cn';

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md';

const variantClass: Record<ButtonVariant, string> = {
  primary:   'bg-emerald-600 hover:bg-emerald-700 text-white',
  secondary: 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
  ghost:     'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
  danger:    'border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30',
};
const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Switch ───────────────────────────────────────────────────────────────────

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function Switch({ checked, onChange, label, disabled, size = 'md' }: SwitchProps) {
  const trackSm = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5';
  const thumbSm = size === 'sm'
    ? `w-3 h-3 top-0.5 ${checked ? 'left-4' : 'left-0.5'}`
    : `w-3.5 h-3.5 top-[3px] ${checked ? 'left-[22px]' : 'left-[3px]'}`;

  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', disabled && 'opacity-50 pointer-events-none')}>
      <span
        className={cn(
          'relative rounded-full transition-colors',
          trackSm,
          checked
            ? 'bg-emerald-500'
            : 'bg-gray-300 dark:bg-gray-600',
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            'absolute rounded-full bg-white shadow transition-all duration-200',
            thumbSm,
          )}
        />
      </span>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const badgeClass: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  danger:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  info:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badgeClass[variant], className)}>
      {children}
    </span>
  );
}

export function spiVariant(spi: number): BadgeVariant {
  if (spi >= 1.0) return 'success';
  if (spi >= 0.9) return 'warning';
  return 'danger';
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  // ESC キーで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 背面スクロールをロック
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* modal card */}
      <div className="w-full max-w-lg max-h-[85vh] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>
        {/* body */}
        <div className="px-4 py-3 overflow-y-auto flex-1">{children}</div>
        {/* footer */}
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Labeled input ────────────────────────────────────────────────────────────

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, ...rest }: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <input
        id={id}
        {...rest}
        className={cn(
          'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition',
          rest.className,
        )}
      />
    </label>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

interface ProgressProps {
  value: number;   // 0–100
  className?: string;
  color?: string;
}

export function ProgressBar({ value, className, color }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color ?? 'bg-emerald-500')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
