

import React, { forwardRef, useId } from 'react';

export interface BrandInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  invalid?: boolean;
}

const sizeMap = {
  sm: 'h-9 text-xs px-3',
  md: 'h-11 text-sm px-3.5',
  lg: 'h-12 text-base px-4',
} as const;

export const BrandInput = forwardRef<HTMLInputElement, BrandInputProps>(
  function BrandInput(
    {
      inputSize = 'md',
      leftIcon,
      rightSlot,
      invalid = false,
      className = '',
      ...rest
    },
    ref,
  ) {
    return (
      <div
        className={[
          'relative flex items-center w-full rounded-brand border bg-white transition-colors',
          invalid
            ? 'border-[var(--brand-danger)] focus-within:border-[var(--brand-danger)]'
            : 'border-[var(--brand-border)] focus-within:border-[var(--brand-orange)]',
          'focus-within:ring-2 focus-within:ring-[var(--brand-orange)]/25',
          className,
        ].join(' ')}
      >
        {leftIcon && (
          <span className="pl-3 text-[var(--brand-muted)] flex items-center">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          {...rest}
          className={[
            'w-full bg-transparent outline-none placeholder:text-[var(--brand-muted)]/80',
            'text-[var(--brand-dark)]',
            leftIcon ? 'pl-2' : '',
            rightSlot ? 'pr-2' : '',
            sizeMap[inputSize],
          ].join(' ')}
        />
        {rightSlot && (
          <span className="pr-3 text-[var(--brand-muted)] flex items-center">
            {rightSlot}
          </span>
        )}
      </div>
    );
  },
);

export interface BrandFieldProps {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactElement;
  className?: string;
}

export const BrandField: React.FC<BrandFieldProps> = ({
  label,
  helperText,
  errorText,
  required,
  htmlFor,
  children,
  className = '',
}) => {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  
  const childProps: Record<string, unknown> = {};
  const childElement = children as React.ReactElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>;
  if (!childElement.props.id) childProps.id = id;
  if (errorText || helperText) {
    childProps['aria-describedby'] = errorText ? errorId : helpId;
  }
  if (errorText) childProps['aria-invalid'] = true;
  const enhanced = React.cloneElement(childElement, childProps);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-bold text-[var(--brand-dark)] flex items-center gap-1"
        >
          {label}
          {required && (
            <span className="text-[var(--brand-primary)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {enhanced}
      {errorText ? (
        <p id={errorId} className="text-xs text-[var(--brand-danger)] font-semibold">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={helpId} className="text-xs text-[var(--brand-muted)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export default BrandInput;