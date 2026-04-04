import assert from "node:assert/strict";
import test from "node:test";
import { buildTravelSettlementOverview } from "./finalization.ts";
import type { TravelTripSettlementItemPayload } from "./types.ts";

const recommended = [
  {
    fromMemberId: "masha",
    fromMemberDisplayName: "Masha",
    toMemberId: "anna",
    toMemberDisplayName: "Anna",
    amount: 7,
  },
  {
    fromMemberId: "ilya",
    fromMemberDisplayName: "Ilya",
    toMemberId: "anna",
    toMemberDisplayName: "Anna",
    amount: 1,
  },
];

test("buildTravelSettlementOverview: active uses recommended open transfers", () => {
  const overview = buildTravelSettlementOverview({
    tripStatus: "active",
    recommendedSettlements: recommended,
    settlementItems: [],
  });

  assert.equal(overview.unsettledCount, 2);
  assert.equal(overview.settledCount, 0);
  assert.equal(overview.unsettledTotal, 8);
  assert.equal(overview.readyForClosure, false);
});

test("buildTravelSettlementOverview: closing uses settlement item statuses", () => {
  const items: TravelTripSettlementItemPayload[] = [
    {
      id: "s1",
      tripId: "trip",
      fromMemberId: "masha",
      fromMemberDisplayName: "Masha",
      toMemberId: "anna",
      toMemberDisplayName: "Anna",
      amount: 7,
      status: "open",
      settledAt: null,
      createdAt: "2026-04-04T12:00:00.000Z",
      updatedAt: "2026-04-04T12:00:00.000Z",
    },
    {
      id: "s2",
      tripId: "trip",
      fromMemberId: "ilya",
      fromMemberDisplayName: "Ilya",
      toMemberId: "anna",
      toMemberDisplayName: "Anna",
      amount: 1,
      status: "settled",
      settledAt: "2026-04-04T12:05:00.000Z",
      createdAt: "2026-04-04T12:00:00.000Z",
      updatedAt: "2026-04-04T12:05:00.000Z",
    },
  ];

  const overview = buildTravelSettlementOverview({
    tripStatus: "closing",
    recommendedSettlements: recommended,
    settlementItems: items,
  });

  assert.equal(overview.unsettledCount, 1);
  assert.equal(overview.settledCount, 1);
  assert.equal(overview.unsettledTotal, 7);
  assert.equal(overview.settledTotal, 1);
  assert.equal(overview.readyForClosure, false);
});

test("buildTravelSettlementOverview: closing fallback when snapshot is empty", () => {
  const overview = buildTravelSettlementOverview({
    tripStatus: "closing",
    recommendedSettlements: recommended,
    settlementItems: [],
  });

  assert.equal(overview.unsettledCount, 2);
  assert.equal(overview.settledCount, 0);
  assert.equal(overview.readyForClosure, false);
});
