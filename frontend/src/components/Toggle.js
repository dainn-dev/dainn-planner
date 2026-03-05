import React from 'react';

const Toggle = ({
  id,
  label,
  description,
  checked,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex flex-col gap-1">
        {label && <span className="text-sm font-medium text-zinc-900">{label}</span>}
        {description && <span className="text-sm text-secondary">{description}</span>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer" htmlFor={id}>
        <input
          className="sr-only peer"
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
      </label>
    </div>
  );
};

export default Toggle;

