using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <summary>
    /// Removes MainDailyGoals — unused (no client integration; long-term goals use LongTermGoals).
    /// </summary>
    public partial class DropMainDailyGoalsTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""MainDailyGoals"";");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE ""MainDailyGoals"" (
    ""Id"" uuid NOT NULL,
    ""UserId"" text NOT NULL,
    ""Title"" character varying(200) NOT NULL,
    ""Description"" text NULL,
    ""Date"" timestamp with time zone NOT NULL,
    ""IsCompleted"" boolean NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    CONSTRAINT ""PK_MainDailyGoals"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_MainDailyGoals_AspNetUsers_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE
);
CREATE UNIQUE INDEX ""IX_MainDailyGoals_UserId_Date"" ON ""MainDailyGoals"" (""UserId"", ""Date"");
");
        }
    }
}
