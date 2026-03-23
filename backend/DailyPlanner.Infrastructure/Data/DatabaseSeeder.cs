using DailyPlanner.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext context,
        UserManager<Domain.Entities.ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        // Ensure roles exist
        await EnsureRoleExistsAsync(roleManager, "Admin");
        await EnsureRoleExistsAsync(roleManager, "User");
        await EnsureRoleExistsAsync(roleManager, "platform_admin");

        // Seed admin user
        await SeedAdminUserAsync(userManager);

        // Seed sample user
        await SeedSampleUserAsync(userManager);
    }

    private static async Task EnsureRoleExistsAsync(RoleManager<IdentityRole> roleManager, string roleName)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            await roleManager.CreateAsync(new IdentityRole(roleName));
        }
    }

    private static async Task SeedAdminUserAsync(UserManager<ApplicationUser> userManager)
    {
        const string adminEmail = "admin@dailyplanner.com";
        const string adminPassword = "Admin@123";

        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FullName = "Administrator",
                Timezone = "Asia/Ho_Chi_Minh",
                Language = "vi",
                CreatedAt = DateTime.UtcNow
            };

            var result = await userManager.CreateAsync(adminUser, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
                await userManager.AddToRoleAsync(adminUser, "platform_admin");
            }
        }
        else
        {
            // Ensure admin has Admin role
            var roles = await userManager.GetRolesAsync(adminUser);
            if (!roles.Contains("Admin"))
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }

            if (!roles.Contains("platform_admin"))
            {
                await userManager.AddToRoleAsync(adminUser, "platform_admin");
            }
        }
    }

    private static async Task SeedSampleUserAsync(UserManager<ApplicationUser> userManager)
    {
        const string userEmail = "user@dailyplanner.com";
        const string userPassword = "User@123";

        var sampleUser = await userManager.FindByEmailAsync(userEmail);
        if (sampleUser == null)
        {
            sampleUser = new ApplicationUser
            {
                UserName = userEmail,
                Email = userEmail,
                EmailConfirmed = true,
                FullName = "Sample User",
                Phone = "+84123456789",
                Location = "Ho Chi Minh City, Vietnam",
                Timezone = "Asia/Ho_Chi_Minh",
                Language = "vi",
                CreatedAt = DateTime.UtcNow
            };

            var result = await userManager.CreateAsync(sampleUser, userPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(sampleUser, "User");
            }
        }
        else
        {
            // Ensure user has User role
            var roles = await userManager.GetRolesAsync(sampleUser);
            if (!roles.Contains("User"))
            {
                await userManager.AddToRoleAsync(sampleUser, "User");
            }
        }
    }
}

