using CashFlow.Domain.Common;
using CashFlow.Domain.Exceptions;

namespace CashFlow.Domain.ValueObjects;

/// <summary>
/// Represents a monetary amount. Immutable and self-validating: it is
/// impossible to construct a <see cref="Money"/> instance with a value
/// that is zero or negative, which keeps that invariant in a single place
/// instead of scattered across the codebase.
/// </summary>
public sealed class Money : ValueObject
{
    public decimal Amount { get; }

    private Money(decimal amount)
    {
        Amount = amount;
    }

    public static Money Create(decimal amount)
    {
        if (amount <= 0)
        {
            throw new InvalidLaunchAmountException(amount);
        }

        // Guard against floating rounding surprises by normalizing to 2 decimal places.
        return new Money(decimal.Round(amount, 2, MidpointRounding.ToEven));
    }

    public Money Add(Money other) => new(Amount + other.Amount);

    public Money Subtract(Money other) => new(Amount - other.Amount);

    public static Money Zero() => new(0);

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Amount;
    }

    public override string ToString() => Amount.ToString("F2");
}
