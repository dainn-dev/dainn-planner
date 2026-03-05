# PlanDaily - Daily Planner Application

A modern React-based daily planner and goal management application with admin dashboard capabilities.

## Features

### User Features
- **Daily Planning**: Create, manage, and track daily tasks with priorities and tags
- **Goal Management**: Set goals, track milestones, and monitor progress with visual indicators
- **Calendar View**: Monthly calendar with event management and color-coded categories
- **Settings**: Comprehensive settings for profile, notifications, security, and preferences
- **Task Management**: Add tasks with descriptions, due dates, reminders, and custom tags

### Admin Features
- **Dashboard**: Overview of user statistics, growth charts, and activity metrics
- **User Management**: View, edit, and manage user accounts with role and status controls
- **User Details**: Detailed user profiles with activity tracking and statistics
- **Export Functionality**: Export user data in CSV, Excel, or PDF formats

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
```bash
pnpm install
# or
npm install
```

2. Start the development server:
```bash
pnpm dev
# or
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
pnpm build
# or
npm run build
```

This creates an optimized production build in the `build` folder.

## Technologies Used

- **React 18** - UI library
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Material Symbols** - Icon library (Google Fonts)
- **Inter Font Family** - Typography

## Project Structure

```
src/
  components/
    Header.js              # Unified header for authenticated pages
    PublicHeader.js        # Header for public pages
    Sidebar.js             # Unified sidebar navigation
    FormInput.js           # Reusable form input component
    FormSelect.js          # Reusable form select component
    FormTextarea.js        # Reusable form textarea component
    Toggle.js              # Reusable toggle switch component
    PasswordInput.js       # Password input with visibility toggle
    ErrorMessage.js        # Error message display component
    SuccessMessage.js      # Success message display component
    # Homepage components
    Hero.js
    SmartScheduling.js
    GoalBreakdown.js
    FocusMode.js
    AdditionalFeatures.js
    CTA.js
    Footer.js
    # Other components
    ContactHeader.js
    ContactFooter.js
    LoginHeader.js
    ForgotPasswordHeader.js
    ResetPasswordHeader.js
    TermsHeader.js
    TermsFooter.js
    PrivacyPolicyHeader.js
    PrivacyPolicyFooter.js

  pages/
    # Public pages
    HomePage.js
    LoginPage.js
    RegisterPage.js
    ForgotPasswordPage.js
    ResetPasswordPage.js
    ContactPage.js
    TermsPage.js
    PrivacyPolicyPage.js
    
    # Authenticated pages
    DailyPage.js           # Daily task planning
    GoalsPage.js           # Goals listing
    GoalDetailPage.js      # Individual goal details
    CalendarPage.js        # Calendar view with events
    SettingsPage.js        # User settings
    
    # Admin pages
    AdminDashboardPage.js  # Admin dashboard overview
    AdminUsersPage.js      # User management
    AdminUserDetailPage.js # Individual user details

  constants/
    settings.js            # Settings constants and initial values
    tasks.js               # Task-related constants (tags, priorities, etc.)

  hooks/
    useForm.js             # Custom hook for form handling

  utils/
    colorMappings.js      # Color mapping utilities for calendar events
    formValidation.js     # Form validation utilities

  App.js                  # Main app component with routing
  index.js                # Entry point
  index.css               # Global styles
```

## Key Features Implementation

### Unified Components
- **Header Component**: Consistent header across authenticated pages with notifications and user profile
- **PublicHeader Component**: Unified header for public-facing pages
- **Sidebar Component**: Consistent navigation sidebar across all authenticated pages
- **Form Components**: Reusable form elements (Input, Select, Textarea, Toggle)

### Routing
- Public routes: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/contact`, `/term`, `/conditions`
- Authenticated routes: `/daily`, `/goals`, `/goals/:id`, `/calendar`, `/settings`
- Admin routes: `/admin/dashboard`, `/admin/users`, `/admin/users/:id`

### State Management
- Local component state with React Hooks
- Centralized constants for reusable values
- Custom hooks for form handling

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests

## License

© 2024 PlanDaily Inc. All rights reserved.
