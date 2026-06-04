

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = 'text-rose-600',
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-transparent border-rose-200 ${sizeClasses[size]} ${color}`}
        style={{ borderStyle: 'solid', borderTopColor: 'transparent' }}
        role="status"
        aria-label="loading"
      />
    </div>
  );
}
