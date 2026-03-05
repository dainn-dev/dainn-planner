using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Domain.Entities;

namespace DailyPlanner.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<ApplicationUser, UserDto>();
        CreateMap<DailyTask, DailyTaskDto>()
            .ForMember(d => d.Tags, o => o.MapFrom(s => s.Tags ?? new List<string>()));
        CreateMap<MainDailyGoal, MainDailyGoalDto>();
        CreateMap<LongTermGoal, LongTermGoalDto>();
        CreateMap<GoalMilestone, GoalMilestoneDto>();
        CreateMap<GoalTask, GoalTaskDto>();
        CreateMap<CalendarEvent, CalendarEventDto>();
        CreateMap<Notification, NotificationDto>();
    }
}

