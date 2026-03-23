# React Patterns Skill — PlanDaily Frontend

Dùng khi tạo component mới, page mới, hoặc cần follow conventions của codebase.

## Component Pattern

```jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// imports từ api.js nếu cần
import { tasksAPI } from '../services/api';

const MyComponent = ({ propA, propB }) => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await tasksAPI.getTasks();
      setData(result);
    } catch (error) {
      // apiRequest đã toast error tự động — chỉ cần log nếu cần debug
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div className="...tailwind classes...">
      {/* content */}
    </div>
  );
};

export default MyComponent;
```

## Page Pattern

```jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MyPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen bg-white dark:bg-background-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {/* page content */}
        </main>
      </div>
    </div>
  );
};

export default MyPage;
```

## Route Registration (src/App.js)

Thêm route mới vào `App.js`:
```jsx
// Protected (cần login)
<Route path="/new-page" element={
  <ProtectedRoute>
    <NewPage />
  </ProtectedRoute>
} />

// Admin only
<Route path="/admin/new" element={
  <AdminRoute>
    <AdminNewPage />
  </AdminRoute>
} />
```

## Icons

**Material Symbols** (đang dùng chủ yếu):
```jsx
<span className="material-symbols-rounded">icon_name</span>
// Filled variant: thêm style={{ fontVariationSettings: "'FILL' 1" }}
```

**Lucide React** (một số component mới):
```jsx
import { IconName } from 'lucide-react';
<IconName className="w-5 h-5" />
```

## Tailwind Dark Mode

Luôn thêm `dark:` variant cho colors:
```jsx
// Đúng
<div className="bg-white dark:bg-background-dark text-text-main dark:text-gray-100">

// Sai — không có dark mode
<div className="bg-white text-text-main">
```

## Auth Check trong Component

```jsx
import { getStoredUser, isAdminUser, isCvPlatformStaffUser } from '../utils/auth';

const user = getStoredUser();
const isAdmin = isAdminUser(user);
const isCvStaff = isCvPlatformStaffUser(user);
```

## Custom Events

```jsx
// Dispatch khi settings thay đổi
window.dispatchEvent(new CustomEvent('userSettingsUpdated'));

// Listen
useEffect(() => {
  const handler = () => { /* reload settings */ };
  window.addEventListener('userSettingsUpdated', handler);
  return () => window.removeEventListener('userSettingsUpdated', handler);
}, []);
```

## Form Pattern (với useForm hook)

```jsx
import { useForm } from '../hooks/useForm';

const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    const errors = {};
    if (!values.email) errors.email = t('validation.required');
    return errors;
  },
  onSubmit: async (values) => {
    await authAPI.login(values.email, values.password);
  },
});
```
