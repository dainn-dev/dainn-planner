# Use the official .NET 8.0 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["DailyPlanner.Api/DailyPlanner.Api.csproj", "DailyPlanner.Api/"]
COPY ["DailyPlanner.Application/DailyPlanner.Application.csproj", "DailyPlanner.Application/"]
COPY ["DailyPlanner.Domain/DailyPlanner.Domain.csproj", "DailyPlanner.Domain/"]
COPY ["DailyPlanner.Infrastructure/DailyPlanner.Infrastructure.csproj", "DailyPlanner.Infrastructure/"]

RUN dotnet restore "DailyPlanner.Api/DailyPlanner.Api.csproj"

# Copy the rest of the source code
COPY . .

# Build the application
WORKDIR "/src/DailyPlanner.Api"
RUN dotnet build "DailyPlanner.Api.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "DailyPlanner.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the official .NET 8.0 runtime image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs

# Copy the published application
COPY --from=publish /app/publish .

# Expose port 8080 (default for .NET 8 in containers)
EXPOSE 8080

ENTRYPOINT ["dotnet", "DailyPlanner.Api.dll"]