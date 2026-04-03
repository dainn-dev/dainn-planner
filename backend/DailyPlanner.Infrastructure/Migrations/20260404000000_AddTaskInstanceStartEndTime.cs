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
            migrationBuilder.AddColumn<string>(
                name: "StartTime",
                table: "TaskInstances",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EndTime",
                table: "TaskInstances",
                type: "text",
                nullable: true);
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
