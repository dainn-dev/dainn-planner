import React from 'react';

const FormInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  validate,
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
        // The parent component should handle the error state
        const syntheticEvent = {
          target: { name: id, value, type: 'text' },
          preventDefault: () => {},
        };
        onChange(syntheticEvent);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-zinc-900" htmlFor={id}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full bg-white border ${
            error ? 'border-red-500' : 'border-border-light'
          } rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 ${
            error ? 'focus:ring-red-200' : 'focus:ring-zinc-900'
          } focus:border-transparent transition-all placeholder-zinc-400 ${className}`}
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;

