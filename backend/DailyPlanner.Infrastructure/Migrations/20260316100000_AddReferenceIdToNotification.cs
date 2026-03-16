using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReferenceIdToNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReferenceId",
                table: "Notifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_Type_ReferenceId",
                table: "Notifications",
                columns: new[] { "Type", "ReferenceId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_Type_ReferenceId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "ReferenceId",
                table: "Notifications");
        }
    }
}
