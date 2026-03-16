import React from 'react';

const FormTextarea = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  validate,
  rows = 4,
  maxLength,
  className = '',
  ...props
}) => {
  const handleBlur = (e) => {
    if (onBlur) {
      onBlur(e);
    }
    // Auto-validate on blur if validate function is provided
    if (validate && !error) {
      const validationError = validate(value);
      if (validationError && onChange) {
        // Trigger validation by calling onChange with current value
        const syntheticEvent = {
          target: { name: id, value, type: 'textarea' },
          preventDefault: () => {},
        };
        onChange(syntheticEvent);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-zinc-900 dark:text-slate-200" htmlFor={id}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={`w-full bg-white dark:bg-slate-700 border ${
          error ? 'border-red-500' : 'border-border-light dark:border-slate-600'
        } rounded-lg px-3 py-3 text-sm text-zinc-900 dark:text-slate-200 focus:outline-none focus:ring-2 ${
          error ? 'focus:ring-red-200' : 'focus:ring-zinc-900 dark:focus:ring-primary'
        } focus:border-transparent transition-all resize-none placeholder-zinc-400 dark:placeholder-slate-500 ${className}`}
        id={id}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {maxLength && (
        <p className="text-xs text-secondary dark:text-slate-400 text-right">
          {value.length}/{maxLength} ký tự
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormTextarea;

