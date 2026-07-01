---
name: writing-tests
description: Use when writing, adding, or modifying tests, or when adding or changing production code that requires test coverage. Covers coverage completeness, AAA structure, whole-object AssertJ assertions, and naming.
---

# Writing Tests

## Overview

Tests must prove that a change does what it claims and protect it from regression. A reader should understand, from the test alone, *what behavior changed and what is now expected* — without reading the production code.

**Core principle:** every behavior change ships with tests that exercise it; assertions verify the whole result, not a convenient slice of it.

## The Rules (quick reference)

| # | Rule | What it means in practice |
|---|------|---------------------------|
| 1 | **Enough coverage** | Every scenario the new/changed code introduces has a test: happy path, edge cases, error/exception paths, boundary values. |
| 2 | **No untested code** | No production code is added or changed without a test covering it. If you can't test it, that's a design smell — raise it. |
| 3 | **AAA format** | Structure every test as Arrange → Act → Assert, separated by blank lines. One clear Act per test. |
| 4 | **Assert the whole object** | Compare the full result, not cherry-picked fields. Use AssertJ `usingRecursiveComparison()` for objects. |
| 5 | **AssertJ** | Use AssertJ (`assertThat(...)`). Do not use JUnit `assertEquals`/`assertTrue` or Hamcrest. |
| 6 | **Match existing naming** | Read a sibling test in the same package/file FIRST, then follow its naming convention exactly. Do not invent a new style. |
| 7 | **Readability** | The test name + body explain the change and the expectation on their own. No hidden setup, no magic literals — name the values. |

## The AAA + whole-object recipe (copy this shape)

```java
@Test
void appliesLoyaltyDiscountForGoldCustomers() {
    // Arrange
    Customer customer = aCustomer().withTier(GOLD).build();
    Order order = anOrder().withSubtotal(money("100.00")).forCustomer(customer).build();

    // Act
    Receipt receipt = checkout.process(order);

    // Assert
    Receipt expected = aReceipt()
            .withSubtotal(money("100.00"))
            .withDiscount(money("10.00"))
            .withTotal(money("90.00"))
            .build();
    assertThat(receipt)
            .usingRecursiveComparison()
            .isEqualTo(expected);
}
```

Why this shape: the three blocks are visually distinct (rule 3); the assertion compares the entire `Receipt` so an unexpected change to *any* field fails the test (rules 4); it reads top-to-bottom as "for a gold customer's $100 order, the receipt is $90 after a $10 discount" (rule 7).

**When recursive comparison needs tuning:** ignore only volatile fields explicitly —
`assertThat(actual).usingRecursiveComparison().ignoringFields("id", "createdAt").isEqualTo(expected)`. Ignore the field, never drop to asserting one field instead.

## Before you finish — coverage gate

Do NOT consider the change done until:
- [ ] Every new/changed production method has at least one test exercising it (rule 2).
- [ ] Each branch/scenario the change introduces has a test — including error and boundary cases (rule 1).
- [ ] Assertions compare whole objects, not single fields (rule 4).
- [ ] Assertions use AssertJ (rule 5).
- [ ] Test names match the convention already used in that test class (rule 6 — go read one).

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Asserting one field "to keep it simple" | Use `usingRecursiveComparison().isEqualTo(expected)`; ignore volatile fields explicitly. |
| Only the happy path is tested | List the scenarios first (errors, empty, boundaries), then write one test each. |
| Inventing a test-name style | Open a sibling test, mirror its naming. |
| `assertEquals(expected, actual)` | `assertThat(actual).isEqualTo(expected)`. |
| Multiple Acts in one test | Split into separate tests, one behavior each. |
| Magic literals (`assertThat(x).isEqualTo(42)`) | Bind to a named value/builder that explains intent. |
