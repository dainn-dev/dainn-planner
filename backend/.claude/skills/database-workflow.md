# Database Workflow Skill

Dùng khi thêm entity mới, thay đổi schema, hoặc tạo migration.

## Bước 1 — Thêm/Sửa Entity

File location: `DailyPlanner.Domain/Entities/MyEntity.cs`

```csharp
namespace DailyPlanner.Domain.Entities;

public class MyEntity
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    // ... properties

    // Navigation properties
    public ApplicationUser User { get; set; } = null!;
}
```

## Bước 2 — Thêm DbSet vào ApplicationDbContext

File: `DailyPlanner.Infrastructure/Data/ApplicationDbContext.cs`

```csharp
public DbSet<MyEntity> MyEntities { get; set; }
```

Thêm cấu hình trong `OnModelCreating`:
```csharp
builder.Entity<MyEntity>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.SomeField).IsRequired().HasMaxLength(200);
    entity.HasIndex(e => new { e.UserId, e.SomeField });
    entity.HasOne(e => e.User)
        .WithMany(/* navigation nếu có */)
        .HasForeignKey(e => e.UserId)
        .OnDelete(DeleteBehavior.Cascade);
});
```

## Bước 3 — Tạo Migration

```bash
dotnet ef migrations add <MigrationName> \
  --project DailyPlanner.Infrastructure \
  --startup-project DailyPlanner.Api
```

**Naming convention cho migration:** `Add<EntityName>Table`, `Add<FieldName>To<Table>`, `Drop<TableName>`

## Bước 4 — Verify Migration

Đọc migration file vừa tạo trong `DailyPlanner.Infrastructure/Migrations/` để verify SQL đúng trước khi apply.

## Bước 5 — Apply Migration

```bash
dotnet ef database update \
  --project DailyPlanner.Infrastructure \
  --startup-project DailyPlanner.Api
```

Hoặc để app tự apply khi start (vì `Program.cs` có `context.Database.Migrate()` trong startup).

## Bước 6 — Thêm DTOs + Interface + Service

1. `DailyPlanner.Application/DTOs/MyEntityDto.cs` — Response DTO
2. `DailyPlanner.Application/DTOs/CreateMyEntityRequest.cs` — Request DTO
3. `DailyPlanner.Application/Interfaces/IMyEntityService.cs` — Interface
4. `DailyPlanner.Application/Mappings/MappingProfile.cs` — Thêm mapping
5. `DailyPlanner.Infrastructure/Services/MyEntityService.cs` — Implementation
6. `DailyPlanner.Infrastructure/DependencyInjection.cs` — Register service

## Rollback Migration

```bash
# Rollback về migration trước
dotnet ef database update <PreviousMigrationName> \
  --project DailyPlanner.Infrastructure \
  --startup-project DailyPlanner.Api

# Xóa migration file (chưa apply)
dotnet ef migrations remove \
  --project DailyPlanner.Infrastructure \
  --startup-project DailyPlanner.Api
```

## Notes

- **Neon PostgreSQL:** Hỗ trợ `jsonb`, `text[]`, UUID — đã dùng trong CvDocument và DailyTask
- `DateTime` columns: luôn dùng `DateTime.UtcNow` khi set, không dùng `DateTime.Now`
- Index cho foreign keys và các query phổ biến (UserId + Date, UserId + Status, v.v.)
