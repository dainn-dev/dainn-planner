// Color mapping utilities for calendar events and UI elements

export const getColorClasses = (color) => {
  const colorMap = {
    green: 'bg-white border border-slate-200 hover:shadow-sm hover:border-green-200',
    blue: 'bg-blue-50 border border-blue-100 hover:bg-blue-100/50',
    purple: 'bg-purple-50 border border-purple-100 hover:bg-purple-100/50',
    orange: 'bg-white border border-slate-200 hover:shadow-sm hover:border-orange-200',
    emerald: 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100',
    rose: 'bg-white border border-slate-200 hover:shadow-sm hover:border-rose-200',
    indigo: 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/70',
    red: 'bg-red-50 border border-red-100 hover:bg-red-100/50',
  };
  return colorMap[color] || 'bg-white border border-slate-200';
};

export const getTextColorClasses = (color) => {
  const colorMap = {
    green: 'text-slate-800',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    orange: 'text-slate-800',
    emerald: 'text-emerald-700',
    rose: 'text-slate-800',
    indigo: 'text-indigo-700',
    red: 'text-red-700',
  };
  return colorMap[color] || 'text-slate-800';
};

export const getDotColorClasses = (color) => {
  const colorMap = {
    green: 'bg-green-500 ring-2 ring-green-100',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-400 ring-2 ring-orange-100',
    emerald: '',
    rose: 'bg-rose-500 ring-2 ring-rose-100',
    indigo: 'bg-indigo-500',
    red: 'bg-red-500 ring-2 ring-red-100',
  };
  return colorMap[color] || 'bg-gray-500';
};

export const getTimeColorClasses = (color) => {
  const colorMap = {
    green: 'text-slate-500',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-slate-500',
    emerald: '',
    rose: 'text-slate-500',
    indigo: 'text-indigo-600',
    red: 'text-red-600',
  };
  return colorMap[color] || 'text-slate-500';
};

export const EVENT_COLORS = [
  { value: 'green', label: 'Xanh lá', bg: 'bg-green-500' },
  { value: 'blue', label: 'Xanh dương', bg: 'bg-blue-500' },
  { value: 'purple', label: 'Tím', bg: 'bg-purple-500' },
  { value: 'orange', label: 'Cam', bg: 'bg-orange-400' },
  { value: 'emerald', label: 'Ngọc', bg: 'bg-emerald-500' },
  { value: 'rose', label: 'Hồng', bg: 'bg-rose-500' },
  { value: 'indigo', label: 'Chàm', bg: 'bg-indigo-500' },
  { value: 'red', label: 'Đỏ', bg: 'bg-red-500' },
];

export const getColorLabel = (color) => {
  const colorOption = EVENT_COLORS.find(c => c.value === color);
  return colorOption ? colorOption.label : color;
};

