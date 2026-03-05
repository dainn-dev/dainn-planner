import React, { useState } from 'react';

const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = 'Nhập mật khẩu',
  required = false,
  className = '',
  label,
  showStrengthIndicator = false,
  onStrengthChange,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    onChange(e);
    
    if (showStrengthIndicator && onStrengthChange && name === 'password') {
      const password = e.target.value;
      let strength = 0;
      if (password.length >= 8) strength += 25;
      if (password.length >= 12) strength += 25;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
      if (/\d/.test(password)) strength += 12.5;
      if (/[^a-zA-Z\d]/.test(password)) strength += 12.5;
      
      const finalStrength = Math.min(strength, 100);
      onStrengthChange(finalStrength);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-text-main text-sm font-semibold" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          className={`input-minimal ${className} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
          id={id}
          name={name}
          placeholder={placeholder}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary-dark transition-colors cursor-pointer outline-none"
          type="button"
          onClick={togglePasswordVisibility}
        >
          <span className="material-symbols-outlined text-[20px]">
            {showPassword ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PasswordInput;

