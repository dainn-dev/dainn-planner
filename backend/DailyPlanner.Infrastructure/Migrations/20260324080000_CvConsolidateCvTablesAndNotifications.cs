using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CvConsolidateCvTablesAndNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PayloadJson",
                table: "Notifications",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadAt",
                table: "Notifications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Notifications",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Notifications",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            // cv_app_notifications may be missing (DB never had CV hosting migration, or table already dropped).
            // Table renames must still run so EF "Sites"/"Documents" mappings match PostgreSQL.
            migrationBuilder.Sql(
                """
                DO $CvConsolidate$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'cv_app_notifications') THEN
                    INSERT INTO "Notifications" ("Id", "UserId", "Type", "Title", "Message", "Icon", "IconColor", "IsRead", "CreatedAt", "ReferenceId", "PayloadJson", "ReadAt", "IdempotencyKey")
                    SELECT n."Id", n."UserId", n."Type", n."Title", n."Body", NULL, NULL, (n."ReadAt" IS NOT NULL), n."CreatedAt", NULL, n."PayloadJson", n."ReadAt", n."IdempotencyKey"
                    FROM cv_app_notifications n
                    WHERE NOT EXISTS (SELECT 1 FROM "Notifications" x WHERE x."Id" = n."Id");
                    DROP TABLE cv_app_notifications;
                  END IF;

                  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'cv_sites')
                     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'Sites') THEN
                    ALTER TABLE cv_sites RENAME TO "Sites";
                  END IF;

                  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'cv_documents')
                     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'Documents') THEN
                    ALTER TABLE cv_documents RENAME TO "Documents";
                  END IF;

                  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace
                             WHERE n.nspname = 'public' AND r.relname = 'Sites' AND c.conname = 'PK_cv_sites') THEN
                    ALTER TABLE "Sites" RENAME CONSTRAINT "PK_cv_sites" TO "PK_Sites";
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'IX_cv_sites_OwnerUserId') THEN
                    ALTER INDEX "IX_cv_sites_OwnerUserId" RENAME TO "IX_Sites_OwnerUserId";
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'IX_cv_sites_ReviewedByUserId') THEN
                    ALTER INDEX "IX_cv_sites_ReviewedByUserId" RENAME TO "IX_Sites_ReviewedByUserId";
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'IX_cv_sites_Slug') THEN
                    ALTER INDEX "IX_cv_sites_Slug" RENAME TO "IX_Sites_Slug";
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'IX_cv_sites_Status') THEN
                    ALTER INDEX "IX_cv_sites_Status" RENAME TO "IX_Sites_Status";
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace
                             WHERE n.nspname = 'public' AND r.relname = 'Sites' AND c.conname = 'FK_cv_sites_AspNetUsers_OwnerUserId') THEN
                    ALTER TABLE "Sites" RENAME CONSTRAINT "FK_cv_sites_AspNetUsers_OwnerUserId" TO "FK_Sites_AspNetUsers_OwnerUserId";
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace
                             WHERE n.nspname = 'public' AND r.relname = 'Sites' AND c.conname = 'FK_cv_sites_AspNetUsers_ReviewedByUserId') THEN
                    ALTER TABLE "Sites" RENAME CONSTRAINT "FK_cv_sites_AspNetUsers_ReviewedByUserId" TO "FK_Sites_AspNetUsers_ReviewedByUserId";
                  END IF;

                  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace
                             WHERE n.nspname = 'public' AND r.relname = 'Documents' AND c.conname = 'PK_cv_documents') THEN
                    ALTER TABLE "Documents" RENAME CONSTRAINT "PK_cv_documents" TO "PK_Documents";
                  END IF;
                  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace
                             WHERE n.nspname = 'public' AND r.relname = 'Documents' AND c.conname = 'FK_cv_documents_AspNetUsers_UserId') THEN
                    ALTER TABLE "Documents" RENAME CONSTRAINT "FK_cv_documents_AspNetUsers_UserId" TO "FK_Documents_AspNetUsers_UserId";
                  END IF;
                END $CvConsolidate$;
                """);

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_Notifications_UserId_ReadAt_CreatedAt" ON "Notifications" ("UserId", "ReadAt", "CreatedAt");
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Notifications_IdempotencyKey" ON "Notifications" ("IdempotencyKey") WHERE "IdempotencyKey" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Documents" RENAME CONSTRAINT "FK_Documents_AspNetUsers_UserId" TO "FK_cv_documents_AspNetUsers_UserId";
                ALTER TABLE "Documents" RENAME CONSTRAINT "PK_Documents" TO "PK_cv_documents";
                ALTER TABLE "Sites" RENAME CONSTRAINT "FK_Sites_AspNetUsers_ReviewedByUserId" TO "FK_cv_sites_AspNetUsers_ReviewedByUserId";
                ALTER TABLE "Sites" RENAME CONSTRAINT "FK_Sites_AspNetUsers_OwnerUserId" TO "FK_cv_sites_AspNetUsers_OwnerUserId";
                ALTER INDEX "IX_Sites_Status" RENAME TO "IX_cv_sites_Status";
                ALTER INDEX "IX_Sites_Slug" RENAME TO "IX_cv_sites_Slug";
                ALTER INDEX "IX_Sites_ReviewedByUserId" RENAME TO "IX_cv_sites_ReviewedByUserId";
                ALTER INDEX "IX_Sites_OwnerUserId" RENAME TO "IX_cv_sites_OwnerUserId";
                ALTER TABLE "Sites" RENAME CONSTRAINT "PK_Sites" TO "PK_cv_sites";
                """);

            migrationBuilder.RenameTable(
                name: "Documents",
                newName: "cv_documents");

            migrationBuilder.RenameTable(
                name: "Sites",
                newName: "cv_sites");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_IdempotencyKey",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId_ReadAt_CreatedAt",
                table: "Notifications");

            migrationBuilder.CreateTable(
                name: "cv_app_notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Body = table.Column<string>(type: "text", nullable: false),
                    PayloadJson = table.Column<string>(type: "jsonb", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cv_app_notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cv_app_notifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO cv_app_notifications ("Id", "UserId", "Type", "Title", "Body", "PayloadJson", "ReadAt", "CreatedAt", "IdempotencyKey")
                SELECT n."Id", n."UserId", n."Type", n."Title", n."Message", n."PayloadJson", n."ReadAt", n."CreatedAt", n."IdempotencyKey"
                FROM "Notifications" n
                WHERE n."Type" IN ('site_approved', 'site_rejected', 'site_suspended');
                """);

            migrationBuilder.Sql(
                """
                DELETE FROM "Notifications" WHERE "Type" IN ('site_approved', 'site_rejected', 'site_suspended');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_cv_app_notifications_IdempotencyKey",
                table: "cv_app_notifications",
                column: "IdempotencyKey",
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_cv_app_notifications_UserId_ReadAt_CreatedAt",
                table: "cv_app_notifications",
                columns: new[] { "UserId", "ReadAt", "CreatedAt" });

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Notifications",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "ReadAt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "PayloadJson",
                table: "Notifications");
        }
    }
}
