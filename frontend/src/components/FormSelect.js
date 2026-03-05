import React from 'react';

const FormSelect = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  required = false,
  error,
  validate,
  className = '',
  placeholder,
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
          target: { name: id, value, type: 'select-one' },
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
        <select
          className={`w-full appearance-none bg-white border ${
            error ? 'border-red-500' : 'border-border-light'
          } rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 ${
            error ? 'focus:ring-red-200' : 'focus:ring-zinc-900'
          } focus:border-transparent transition-all shadow-sm cursor-pointer ${className}`}
          id={id}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value || option} value={option.value || option}>
              {option.label || option}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-2.5 text-zinc-400 pointer-events-none text-[18px]">
          expand_more
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormSelect;

