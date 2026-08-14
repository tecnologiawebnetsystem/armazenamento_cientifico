using CashFlow.Domain.Entities;
using CashFlow.Domain.Enums;

namespace CashFlow.Application.DTOs;

public sealed record DailyBalanceDto(
    DateOnly Date,
    decimal TotalCredits,
    decimal TotalDebits,
    decimal Balance,
    ConsolidationStatus Status,
    DateTime? ConsolidatedAtUtc)
{
    public static DailyBalanceDto FromDomain(DailyBalance dailyBalance) => new(
        dailyBalance.Date,
        dailyBalance.TotalCredits,
        dailyBalance.TotalDebits,
        dailyBalance.Balance,
        dailyBalance.Status,
        dailyBalance.ConsolidatedAtUtc);
}
