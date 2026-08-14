using CashFlow.Domain.Common;
using CashFlow.Domain.Enums;

namespace CashFlow.Domain.Entities;

/// <summary>
/// The consolidated balance for a single calendar date. This is a
/// derived/projected entity: it is always fully recomputed from the
/// <see cref="Launch"/> records for its date, which makes consolidation
/// idempotent and safe to retry or replay after a failure.
/// </summary>
public sealed class DailyBalance : Entity
{
    public DateOnly Date { get; private set; }
    public decimal TotalCredits { get; private set; }
    public decimal TotalDebits { get; private set; }
    public decimal Balance { get; private set; }
    public ConsolidationStatus Status { get; private set; }
    public DateTime? ConsolidatedAtUtc { get; private set; }
    public int FailedAttempts { get; private set; }

    // Required by EF Core materialization.
    private DailyBalance(
        Guid id,
        DateOnly date,
        decimal totalCredits,
        decimal totalDebits,
        decimal balance,
        ConsolidationStatus status,
        DateTime? consolidatedAtUtc,
        int failedAttempts)
        : base(id)
    {
        Date = date;
        TotalCredits = totalCredits;
        TotalDebits = totalDebits;
        Balance = balance;
        Status = status;
        ConsolidatedAtUtc = consolidatedAtUtc;
        FailedAttempts = failedAttempts;
    }

    public static DailyBalance CreatePending(DateOnly date) =>
        new(Guid.NewGuid(), date, 0m, 0m, 0m, ConsolidationStatus.Pending, consolidatedAtUtc: null, failedAttempts: 0);

    /// <summary>
    /// Applies the result of a full recomputation for this date.
    /// Consolidation always replaces the previous totals entirely - it never
    /// increments them - so re-running it (e.g. after a retry) is safe.
    /// </summary>
    public void Consolidate(decimal totalCredits, decimal totalDebits, DateTime nowUtc)
    {
        TotalCredits = totalCredits;
        TotalDebits = totalDebits;
        Balance = totalCredits - totalDebits;
        Status = ConsolidationStatus.Consolidated;
        ConsolidatedAtUtc = nowUtc;
        FailedAttempts = 0;
    }

    public void MarkAsFailed() => Status = ConsolidationStatus.Failed;

    public void IncrementFailedAttempts() => FailedAttempts++;
}
