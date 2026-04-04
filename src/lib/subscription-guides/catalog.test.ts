import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocalizedGuideText,
  subscriptionCancellationGuidesCatalog,
} from "./catalog.ts";

const OFFICIAL_HOSTS = new Set([
  "yandex.ru",
  "docs.ozon.ru",
  "help.zvuk.com",
  "www.tbank.ru",
  "support.mts.ru",
  "support.apple.com",
  "support.google.com",
]);

test("subscription guides: required first-wave services are present", () => {
  const ids = new Set(subscriptionCancellationGuidesCatalog.map((guide) => guide.id));

  for (const requiredId of [
    "yandex-plus",
    "ozon-premium",
    "sberprime",
    "t-premium",
    "t-pro",
    "mts-premium",
  ]) {
    assert.equal(ids.has(requiredId), true, `${requiredId} is missing from catalog`);
  }
});

test("subscription guides: official links use allowed hosts and https", () => {
  for (const guide of subscriptionCancellationGuidesCatalog) {
    assert.ok(guide.steps.length >= 3, `${guide.id} should have at least 3 steps`);
    assert.ok(
      guide.officialSources.length > 0,
      `${guide.id} should have at least one official source`,
    );

    for (const source of guide.officialSources) {
      const parsed = new URL(source.url);
      assert.equal(parsed.protocol, "https:");
      assert.equal(
        OFFICIAL_HOSTS.has(parsed.hostname),
        true,
        `${guide.id} contains unsupported host: ${parsed.hostname}`,
      );
    }
  }
});

test("subscription guides: localization helper returns language-specific text", () => {
  const sample = subscriptionCancellationGuidesCatalog[0]!;
  assert.equal(getLocalizedGuideText(sample.serviceName, "ru"), "Яндекс Плюс");
  assert.equal(getLocalizedGuideText(sample.serviceName, "en"), "Yandex Plus");
});

