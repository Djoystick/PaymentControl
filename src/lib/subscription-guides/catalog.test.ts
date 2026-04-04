import assert from "node:assert/strict";
import test from "node:test";
import {
  filterSubscriptionGuides,
  getGuideCategoryLabel,
  getLocalizedGuideText,
  subscriptionCancellationGuidesCatalog,
  subscriptionGuideCategories,
} from "./catalog.ts";

const OFFICIAL_HOSTS = new Set([
  "yandex.ru",
  "docs.ozon.ru",
  "help.zvuk.com",
  "www.tbank.ru",
  "support.mts.ru",
  "support.apple.com",
  "support.google.com",
  "help.okko.tv",
  "ask.ivi.ru",
  "x5paket.ru",
]);

test("subscription guides: required expanded services are present", () => {
  const ids = new Set(subscriptionCancellationGuidesCatalog.map((guide) => guide.id));

  for (const requiredId of [
    "apple-app-store-subscriptions",
    "google-play-subscriptions",
    "yandex-plus",
    "ozon-premium",
    "sberprime",
    "t-premium",
    "t-pro",
    "mts-premium",
    "okko",
    "ivi",
    "x5-paket",
  ]) {
    assert.equal(ids.has(requiredId), true, `${requiredId} is missing from catalog`);
  }
});

test("subscription guides: official links use allowed hosts and https", () => {
  const validCategories = new Set(subscriptionGuideCategories.map((item) => item.id));

  for (const guide of subscriptionCancellationGuidesCatalog) {
    assert.ok(guide.steps.length >= 3, `${guide.id} should have at least 3 steps`);
    assert.ok(guide.officialSources.length > 0, `${guide.id} should have sources`);
    assert.equal(
      validCategories.has(guide.categoryId),
      true,
      `${guide.id} contains invalid category`,
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

test("subscription guides: filtering supports category and query aliases", () => {
  const telecomOnly = filterSubscriptionGuides("telecom_bundles", "");
  assert.ok(telecomOnly.length >= 1);
  assert.equal(telecomOnly.some((guide) => guide.id === "mts-premium"), true);

  const queryResult = filterSubscriptionGuides("all", "пятерочка");
  assert.equal(queryResult.length >= 1, true);
  assert.equal(queryResult[0]?.id, "x5-paket");
});

test("subscription guides: localization helpers return expected values", () => {
  const sample = subscriptionCancellationGuidesCatalog.find(
    (guide) => guide.id === "yandex-plus",
  );
  assert.ok(sample);
  assert.equal(getLocalizedGuideText(sample!.displayName, "ru"), "Яндекс Плюс");
  assert.equal(getLocalizedGuideText(sample!.displayName, "en"), "Yandex Plus");

  assert.equal(
    getGuideCategoryLabel("media_digital_services", "ru"),
    "Медиа и digital-сервисы",
  );
});

