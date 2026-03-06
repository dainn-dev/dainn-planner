# Dainn Planner

A full-stack daily planner application for managing tasks, goals, and calendar events.

## Tech Stack

| Layer    | Stack |
|----------|--------|
| **Backend** | ASP.NET Core 8, Entity Framework Core 8, PostgreSQL, JWT auth, Hangfire (recurring jobs), Serilog |
| **Frontend** | React 18, React Router 6, Tailwind CSS |

## Features

- **Daily tasks** – Create, edit, complete tasks with due date, reminder, priority, tags, and recurrence (daily/weekly/monthly)
- **Goals** – Long-term goals and milestones
- **Calendar** – Events and schedule view
- **Settings** – Profile, preferences, notifications
- **Admin** – Dashboard, user management (admin role)

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (LTS, e.g. 18+)
- [PostgreSQL](https://www.postgresql.org/) (e.g. 14+)

## Getting Started

### 1. Database

Create a PostgreSQL database and run migrations:

```bash
cd backend
dotnet ef database update --project DailyPlanner.Infrastructure --startup-project DailyPlanner.Api
```

### 2. Backend

From the repo root:

```bash
cd backend
dotnet run --project DailyPlanner.Api
```

API runs at **http://localhost:5113** (or the port in `launchSettings.json`). Swagger UI: `http://localhost:5113/swagger`.

Configure connection and JWT in `backend/DailyPlanner.Api/appsettings.json` (or use `appsettings.Development.json` and environment variables).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Default dev server is often **http://localhost:3000**. To use a port allowed by the API CORS (e.g. 3005):

```bash
npm run dev:3001
```

Then set `PORT=3005` if needed, or add your port to `Cors:AllowedOrigins` in the API.

### 4. Login

Use the credentials of a user created by the seeder (or register). Default admin (if seeded): see `DatabaseSeeder` in the backend.

## Project Structure

```
dainn-planner/
├── backend/
│   ├── DailyPlanner.Api/          # ASP.NET Core Web API, controllers, auth, Hangfire
│   ├── DailyPlanner.Application/  # DTOs, interfaces, validation, mapping
│   ├── DailyPlanner.Domain/       # Entities
│   ├── DailyPlanner.Infrastructure/ # EF Core, services, migrations
│   └── DailyPlanner.Infrastructure.Tests/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/                 # Daily, Goals, Calendar, Settings, Admin
│       ├── services/              # API client
│       └── constants/
└── README.md
```

## Configuration

- **Backend**: `ConnectionStrings:DefaultConnection`, `Jwt:Key`, `Cors:AllowedOrigins` in `appsettings.json`.
- **Frontend**: API base URL is set in the API service (e.g. `src/services/api.js`); point it to the backend URL (e.g. `http://localhost:5113`).

## Hangfire

Recurring task renewal runs daily (e.g. midnight UTC). Dashboard: **http://localhost:5113/hangfire** (when enabled).

## License

Private / All rights reserved (adjust as needed).
