# Daily Planner API

A comprehensive task and goal management system built with ASP.NET Core Web API following Clean Architecture principles.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Database Setup](#database-setup)
- [Sample Accounts](#sample-accounts)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [API Endpoints](#api-endpoints)

## ✨ Features

### Core Features
- **User Authentication & Authorization**
  - JWT-based authentication
  - Refresh token support
  - Password reset functionality
  - Role-based access control (Admin/User)
  - Two-Factor Authentication (2FA) with TOTP
  - Social login (Google, Facebook, GitHub)

- **Daily Task Management**
  - Create, update, delete, and toggle tasks
  - Filter tasks by date and completion status
  - Priority-based task organization
  - Main daily goal tracking

- **Long-Term Goals**
  - Goal creation and tracking
  - Milestone management
  - Goal-specific tasks
  - Progress calculation

- **Calendar Events**
  - Event creation and management
  - Date range filtering
  - All-day event support
  - Event categorization

- **Notifications**
  - Real-time notifications
  - Notification filtering (unread, type)
  - Mark as read functionality
  - Pagination support

- **User Profile Management**
  - Profile updates (requires 2FA verification if enabled)
  - Avatar upload
  - User settings (timezone, language)
  - Two-Factor Authentication setup and management
  - Recovery codes generation

- **Admin Dashboard**
  - User management
  - Dashboard statistics
  - User search and filtering
  - Role management

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

```
DailyPlanner.Api (Presentation Layer)
    ↓
DailyPlanner.Application (Application Layer)
    ↓
DailyPlanner.Infrastructure (Infrastructure Layer)
    ↓
DailyPlanner.Domain (Domain Layer)
```

### Layer Responsibilities

- **Domain**: Core business entities and interfaces
- **Application**: Business logic, DTOs, interfaces, validators, mappings
- **Infrastructure**: Data access, external services, JWT, Identity
- **API**: Controllers, middleware, configuration

## 🛠️ Tech Stack

- **.NET 8.0** - Framework
- **ASP.NET Core Web API** - Web framework
- **Entity Framework Core** - ORM
- **PostgreSQL** - Database
- **ASP.NET Core Identity** - Authentication & Authorization
- **JWT Bearer** - Token-based authentication
- **AutoMapper** - Object mapping
- **FluentValidation** - Request validation
- **Swagger/OpenAPI** - API documentation
- **xUnit** - Unit testing framework
- **Moq** - Mocking framework
- **FluentAssertions** - Test assertions

## 📦 Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [PostgreSQL](https://www.postgresql.org/download/) (14 or higher)
- [Visual Studio 2022](https://visualstudio.microsoft.com/) or [Rider](https://www.jetbrains.com/rider/) or [VS Code](https://code.visualstudio.com/)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DailyPlanner
```

### 2. Configure Database Connection

Update `DailyPlanner.Api/appsettings.json` with your PostgreSQL connection string:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=dailyplanner;Username=your_username;Password=your_password"
  }
}
```

### 3. Configure JWT Settings

Update JWT settings in `appsettings.json`:

```json
{
  "Jwt": {
    "Key": "your-secret-key-at-least-32-characters-long",
    "Issuer": "DailyPlanner",
    "Audience": "DailyPlanner"
  }
}
```

**Note**: For production, use a strong, randomly generated key and store it securely (e.g., environment variables or Azure Key Vault).

### 4. Restore Dependencies

```bash
dotnet restore
```

### 5. Run Database Migrations

Run from the **backend** folder (so EF finds `appsettings.json` in the API project):

```bash
cd backend
dotnet ef database update --project DailyPlanner.Infrastructure --startup-project DailyPlanner.Api
```

Or the application will automatically run migrations on startup.

### 6. Run the Application

```bash
dotnet run --project DailyPlanner.Api
```

The API will be available at:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger UI: `https://localhost:5001/swagger`

## ⚙️ Configuration

### Environment Variables

You can override configuration using environment variables:

```bash
# Database
ConnectionStrings__DefaultConnection="Host=localhost;Database=dailyplanner;..."

# JWT
Jwt__Key="your-secret-key"
Jwt__Issuer="DailyPlanner"
Jwt__Audience="DailyPlanner"
```

### CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:5174`

Update `Program.cs` to add your frontend URLs.

## 📚 API Documentation

### Swagger UI

Once the application is running, access Swagger UI at:
```
https://localhost:5001/swagger
```

### Features:
- **Bearer Authentication**: Click the "Authorize" button to enter your JWT token
- **Interactive Testing**: Test all endpoints directly from Swagger
- **Schema Documentation**: View request/response models
- **Hidden Schemas**: Schemas are collapsed by default for cleaner UI

### Authentication in Swagger

1. Click the **"Authorize"** button (top right)
2. Enter your JWT token in the format: `Bearer {your-token}`
3. Click **"Authorize"**
4. All authenticated requests will now include the token

## 🔐 Authentication

### Register a New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "fullName": "John Doe"
    }
  }
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer {your-token}
```

### Refresh Token

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "token": "expired-jwt-token",
  "refreshToken": "refresh-token"
}
```

### Social Login

The API supports OAuth login with Google, Facebook, and GitHub:

```http
GET /api/auth/external-login?provider=Google&returnUrl=http://localhost:3000
```

After successful authentication, the user is redirected to the frontend with JWT tokens.

**Note**: Configure OAuth providers in `appsettings.json` and set `Enable: true` for each provider.

### Two-Factor Authentication (2FA)

#### Setup 2FA

1. **Initialize Setup** - Get QR code and shared key:
```http
GET /api/users/me/2fa/setup
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA setup initiated. Scan the QR code with your authenticator app.",
  "data": {
    "sharedKey": "JBSWY3DPEHPK3PXP",
    "qrCodeUri": "otpauth://totp/Daily Planner:user@example.com?secret=...",
    "recoveryCodes": []
  }
}
```

2. **Scan QR Code** - Use an authenticator app (Google Authenticator, Microsoft Authenticator, etc.)

3. **Enable 2FA** - Verify with a code from your authenticator:
```http
POST /api/users/me/2fa/enable
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "123456"
}
```

#### Update Profile with 2FA

When 2FA is enabled, profile updates require a verification code:

```http
PUT /api/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "John Doe",
  "phone": "+1234567890",
  "twoFactorCode": "654321"
}
```

**Note**: If 2FA is enabled and `twoFactorCode` is missing or invalid, the request will fail.

#### Check 2FA Status

```http
GET /api/users/me/2fa/status
Authorization: Bearer {token}
```

#### Disable 2FA

```http
POST /api/users/me/2fa/disable
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "123456"
}
```

#### Generate Recovery Codes

```http
POST /api/users/me/2fa/recovery-codes
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Recovery codes have been regenerated...",
  "data": [
    "code1",
    "code2",
    ...
  ]
}
```

**Important**: Save recovery codes securely. They can be used to recover your account if you lose access to your authenticator app.

## 🗄️ Database Setup

### Automatic Setup

The application automatically:
1. Creates the database if it doesn't exist
2. Runs migrations on startup
3. Seeds initial data (roles and sample accounts)

### Manual Migration

```bash
# Create a new migration
dotnet ef migrations add MigrationName --project DailyPlanner.Infrastructure --startup-project DailyPlanner.Api

# Apply migrations
dotnet ef database update --project DailyPlanner.Infrastructure --startup-project DailyPlanner.Api
```

## 👤 Sample Accounts

The application seeds the following accounts on first run:

### Admin Account
- **Email**: `admin@dailyplanner.com`
- **Password**: `Admin@123`
- **Role**: Admin

### Regular User Account
- **Email**: `user@dailyplanner.com`
- **Password**: `User@123`
- **Role**: User

**Note**: These accounts are only created if they don't already exist.

## 📁 Project Structure

```
DailyPlanner/
├── DailyPlanner.Api/              # Presentation Layer
│   ├── Controllers/                # API Controllers
│   ├── Middleware/                 # Global exception handler
│   └── Program.cs                  # Application entry point
│
├── DailyPlanner.Application/      # Application Layer
│   ├── DTOs/                       # Data Transfer Objects
│   ├── Interfaces/                 # Service interfaces
│   ├── Mappings/                   # AutoMapper profiles
│   └── Validators/                 # FluentValidation validators
│
├── DailyPlanner.Infrastructure/   # Infrastructure Layer
│   ├── Data/                       # DbContext, migrations, seeding
│   └── Services/                   # Service implementations
│
├── DailyPlanner.Domain/            # Domain Layer
│   └── Entities/                   # Domain entities
│
└── DailyPlanner.Infrastructure.Tests/  # Unit Tests
    ├── Helpers/                    # Test helpers
    └── Services/                   # Service tests
```

## 🧪 Testing

### Run All Tests

```bash
dotnet test
```

### Run Tests with Coverage

```bash
dotnet test /p:CollectCoverage=true
```

### Run Specific Test Project

```bash
dotnet test DailyPlanner.Infrastructure.Tests
```

### Test Coverage

The project includes comprehensive unit tests with **100% coverage** for all services:
- ✅ JwtService (10 tests)
- ✅ AuthService (11 tests)
- ✅ UserService (7 tests)
- ✅ DailyTaskService (12 tests)
- ✅ NotificationService (8 tests)
- ✅ CalendarEventService (7 tests)
- ✅ LongTermGoalService (12 tests)
- ✅ AdminService (8 tests)

**Total: 80 tests** - All passing ✅

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /refresh-token` - Refresh JWT token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `POST /logout` - Logout user
- `POST /social-login` - Social login with access token
- `GET /external-login` - Initiate OAuth flow
- `GET /external-login-callback` - OAuth callback handler

### Users (`/api/users`)
- `GET /me` - Get current user
- `PUT /me` - Update user profile (requires 2FA code if 2FA is enabled)
- `POST /me/avatar` - Upload avatar
- `GET /me/settings` - Get user settings
- `PUT /me/settings` - Update user settings
- `GET /me/2fa/setup` - Setup 2FA (get QR code)
- `POST /me/2fa/enable` - Enable 2FA
- `POST /me/2fa/disable` - Disable 2FA
- `GET /me/2fa/status` - Check 2FA status
- `POST /me/2fa/recovery-codes` - Generate recovery codes

### Tasks (`/api/tasks`)
- `GET /` - Get tasks (with filters: date, completed)
- `POST /` - Create task
- `PUT /{id}` - Update task
- `DELETE /{id}` - Delete task
- `POST /{id}/toggle` - Toggle task completion
- `GET /main-goal` - Get main daily goal
- `PUT /main-goal` - Upsert main daily goal

### Goals (`/api/goals`)
- `GET /` - Get long-term goals
- `GET /{id}` - Get goal by ID
- `POST /` - Create goal
- `PUT /{id}` - Update goal
- `DELETE /{id}` - Delete goal
- `POST /{id}/milestones` - Create milestone
- `PUT /{id}/milestones/{milestoneId}` - Update milestone
- `DELETE /{id}/milestones/{milestoneId}` - Delete milestone
- `POST /{id}/milestones/{milestoneId}/toggle` - Toggle milestone
- `POST /{id}/tasks` - Create goal task
- `PUT /{id}/tasks/{taskId}` - Update goal task
- `DELETE /{id}/tasks/{taskId}` - Delete goal task
- `POST /{id}/tasks/{taskId}/toggle` - Toggle goal task

### Events (`/api/events`)
- `GET /` - Get events (with date filters)
- `GET /{id}` - Get event by ID
- `POST /` - Create event
- `PUT /{id}` - Update event
- `DELETE /{id}` - Delete event

### Notifications (`/api/notifications`)
- `GET /` - Get notifications (with filters: unread, type, pagination)
- `POST /{id}/read` - Mark notification as read
- `POST /read-all` - Mark all as read
- `DELETE /{id}` - Delete notification
- `DELETE /all` - Delete all notifications

### Admin (`/api/admin`) - Admin Only
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /users` - Get users (with search, pagination)
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

## 🔒 Security Features

- JWT-based authentication
- Password hashing with ASP.NET Core Identity
- Refresh token rotation
- Role-based authorization
- **Two-Factor Authentication (2FA)** with TOTP support
- Recovery codes for account recovery
- Social OAuth authentication (Google, Facebook, GitHub)
- CORS configuration
- Global exception handling
- Input validation with FluentValidation
- 2FA verification required for sensitive operations (profile updates)

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ using Clean Architecture and ASP.NET Core**

