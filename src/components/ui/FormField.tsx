import React from 'react';
import { cn } from '../../lib/cn';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

const fieldBase =
  'w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint transition-all duration-150 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60 disabled:cursor-not-allowed';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, className)} {...props} />
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(fieldBase, 'resize-none', className)} {...props} />
);
Textarea.displayName = 'Textarea';

export interface SelectChangeEvent {
  target: { value: any };
  currentTarget?: { value: any };
}

export interface SelectProps extends Omit<React.ComponentProps<typeof CustomSelect>, 'onChange'> {
  onChange?: (e: SelectChangeEvent | any) => void;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, options, value, onChange, disabled, title, placeholder, ...props }, ref) => {
    const handleChange = (val: any) => {
      if (onChange) {
        onChange({
          target: { value: val },
          currentTarget: { value: val },
        });
      }
    };

    return (
      <CustomSelect
        options={options}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        title={title}
        placeholder={placeholder}
      >
        {children}
      </CustomSelect>
    );
  }
);
Select.displayName = 'Select';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Labeled wrapper for a single form control. */
export const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, required, hint, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-muted">
      {label}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-ink-faint">{hint}</p>}
  </div>
);
