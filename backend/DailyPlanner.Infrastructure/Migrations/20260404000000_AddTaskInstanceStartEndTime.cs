using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskInstanceStartEndTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"TaskInstances\" ADD COLUMN IF NOT EXISTS \"StartTime\" text;");
            migrationBuilder.Sql("ALTER TABLE \"TaskInstances\" ADD COLUMN IF NOT EXISTS \"EndTime\" text;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "TaskInstances");

            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "TaskInstances");
        }
    }
}
