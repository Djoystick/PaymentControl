import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTravelSettlementPlan,
  buildTravelTripSummary,
  resolveTravelExpenseSplits,
} from "./split.ts";

test("resolveTravelExpenseSplits: equal_all distributes with cent remainder", () => {
  const result = resolveTravelExpenseSplits({
    totalAmount: 10,
    splitMode: "equal_all",
    members: [
      { id: "a", displayName: "Anna" },
      { id: "b", displayName: "Ilya" },
      { id: "c", displayName: "Masha" },
    ],
    selectedMemberIds: [],
    fullAmountMemberId: null,
    manualSplits: [],
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(result.splits, [
    { memberId: "a", shareAmount: 3.34 },
    { memberId: "b", shareAmount: 3.33 },
    { memberId: "c", shareAmount: 3.33 },
  ]);
});

test("resolveTravelExpenseSplits: equal_selected validates selected list", () => {
  const valid = resolveTravelExpenseSplits({
    totalAmount: 12,
    splitMode: "equal_selected",
    members: [
      { id: "a", displayName: "Anna" },
      { id: "b", displayName: "Ilya" },
      { id: "c", displayName: "Masha" },
    ],
    selectedMemberIds: ["a", "c"],
    fullAmountMemberId: null,
    manualSplits: [],
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.deepEqual(valid.splits, [
      { memberId: "a", shareAmount: 6 },
      { memberId: "c", shareAmount: 6 },
    ]);
  }

  const invalid = resolveTravelExpenseSplits({
    totalAmount: 12,
    splitMode: "equal_selected",
    members: [
      { id: "a", displayName: "Anna" },
      { id: "b", displayName: "Ilya" },
    ],
    selectedMemberIds: [],
    fullAmountMemberId: null,
    manualSplits: [],
  });

  assert.equal(invalid.ok, false);
});

test("resolveTravelExpenseSplits: manual amounts must match total", () => {
  const invalid = resolveTravelExpenseSplits({
    totalAmount: 10,
    splitMode: "manual_amounts",
    members: [
      { id: "a", displayName: "Anna" },
      { id: "b", displayName: "Ilya" },
    ],
    selectedMemberIds: [],
    fullAmountMemberId: null,
    manualSplits: [
      { memberId: "a", amount: 4 },
      { memberId: "b", amount: 5 },
    ],
  });

  assert.equal(invalid.ok, false);

  const valid = resolveTravelExpenseSplits({
    totalAmount: 10,
    splitMode: "manual_amounts",
    members: [
      { id: "a", displayName: "Anna" },
      { id: "b", displayName: "Ilya" },
    ],
    selectedMemberIds: [],
    fullAmountMemberId: null,
    manualSplits: [
      { memberId: "a", amount: 4 },
      { memberId: "b", amount: 6 },
    ],
  });

  assert.equal(valid.ok, true);
});

test("buildTravelTripSummary: builds balances and settlement transfers", () => {
  const summary = buildTravelTripSummary({
    members: [
      { id: "a", displayName: "Anna" },
      { id: "b", displayName: "Ilya" },
      { id: "c", displayName: "Masha" },
    ],
    expenses: [
      {
        id: "e1",
        amount: 12,
        paidByMemberId: "a",
        splits: [
          { memberId: "a", shareAmount: 4 },
          { memberId: "b", shareAmount: 4 },
          { memberId: "c", shareAmount: 4 },
        ],
      },
      {
        id: "e2",
        amount: 6,
        paidByMemberId: "b",
        splits: [
          { memberId: "b", shareAmount: 3 },
          { memberId: "c", shareAmount: 3 },
        ],
      },
    ],
  });

  assert.equal(summary.totalExpensesCount, 2);
  assert.equal(summary.totalSpent, 18);

  const anna = summary.balances.find((item) => item.memberId === "a");
  const ilya = summary.balances.find((item) => item.memberId === "b");
  const masha = summary.balances.find((item) => item.memberId === "c");
  assert.equal(anna?.netAmount, 8);
  assert.equal(ilya?.netAmount, -1);
  assert.equal(masha?.netAmount, -7);

  assert.deepEqual(summary.settlements, [
    {
      fromMemberId: "c",
      fromMemberDisplayName: "Masha",
      toMemberId: "a",
      toMemberDisplayName: "Anna",
      amount: 7,
    },
    {
      fromMemberId: "b",
      fromMemberDisplayName: "Ilya",
      toMemberId: "a",
      toMemberDisplayName: "Anna",
      amount: 1,
    },
  ]);
  assert.equal(summary.settlementPlanStats.baselineTransferCount, 2);
  assert.equal(summary.settlementPlanStats.optimizedTransferCount, 2);
  assert.equal(summary.settlementPlanStats.reducedTransferCount, 0);
});

test("buildTravelSettlementPlan: optimization stats are deterministic and non-negative", () => {
  const balances = [
    {
      memberId: "a",
      memberDisplayName: "Anna",
      paidAmount: 0,
      owedAmount: 0,
      netAmount: 9,
    },
    {
      memberId: "b",
      memberDisplayName: "Ilya",
      paidAmount: 0,
      owedAmount: 0,
      netAmount: 2,
    },
    {
      memberId: "c",
      memberDisplayName: "Masha",
      paidAmount: 0,
      owedAmount: 0,
      netAmount: -4,
    },
    {
      memberId: "d",
      memberDisplayName: "Sasha",
      paidAmount: 0,
      owedAmount: 0,
      netAmount: -7,
    },
  ];

  const plan = buildTravelSettlementPlan(balances);

  assert.equal(plan.stats.optimizedTransferCount, plan.settlements.length);
  assert.ok(plan.stats.baselineTransferCount >= plan.stats.optimizedTransferCount);
  assert.equal(
    plan.stats.reducedTransferCount,
    plan.stats.baselineTransferCount - plan.stats.optimizedTransferCount,
  );
  assert.deepEqual(plan.settlements, [
    {
      fromMemberId: "d",
      fromMemberDisplayName: "Sasha",
      toMemberId: "a",
      toMemberDisplayName: "Anna",
      amount: 5,
    },
    {
      fromMemberId: "c",
      fromMemberDisplayName: "Masha",
      toMemberId: "a",
      toMemberDisplayName: "Anna",
      amount: 4,
    },
    {
      fromMemberId: "d",
      fromMemberDisplayName: "Sasha",
      toMemberId: "b",
      toMemberDisplayName: "Ilya",
      amount: 2,
    },
  ]);
});

