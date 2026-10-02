import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button — primary reusable button component
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon = null,
    iconRight = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const baseClass = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline-primary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn inline-flex items-center gap-2 text-gray-600 hover:text-navy hover:bg-gray-100',
    link: 'btn inline-flex items-center gap-2 text-primary hover:underline p-0 shadow-none',
  };
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    icon: 'btn-icon',
  };

  const cls = [
    baseClass,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cls}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && Icon && !iconRight && <Icon className="w-4 h-4 flex-shrink-0" />}
      {children}
      {!loading && Icon && iconRight && <Icon className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
});

export default Button;
