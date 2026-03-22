using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoistIntegrationAndTodoistTaskId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TodoistTaskId",
                table: "DailyTasks",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyTasks_UserId_TodoistTaskId",
                table: "DailyTasks",
                columns: new[] { "UserId", "TodoistTaskId" },
                unique: true,
                filter: "\"TodoistTaskId\" IS NOT NULL");

            migrationBuilder.CreateTable(
                name: "UserTodoistIntegrations",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    AccessToken = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTodoistIntegrations", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserTodoistIntegrations_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserTodoistIntegrations_UserId",
                table: "UserTodoistIntegrations",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserTodoistIntegrations");

            migrationBuilder.DropIndex(
                name: "IX_DailyTasks_UserId_TodoistTaskId",
                table: "DailyTasks");

            migrationBuilder.DropColumn(
                name: "TodoistTaskId",
                table: "DailyTasks");
        }
    }
}
