import assert from "node:assert/strict";
import test from "node:test";
import {
  filterSubscriptionGuides,
  getGuideCategoryLabel,
  getGuideChannelLabel,
  getLocalizedGuideText,
  subscriptionCancellationGuidesCatalog,
  subscriptionGuideCategories,
} from "./catalog.ts";

const OFFICIAL_HOSTS = new Set([
  "support.apple.com",
  "support.google.com",
  "yandex.ru",
  "start.ru",
  "ask.ivi.ru",
  "help.okko.tv",
  "kion.ru",
  "docs.ozon.ru",
  "x5paket.ru",
  "www.tbank.ru",
  "help.zvuk.com",
  "support.mts.ru",
  "support.google.com",
  "help.netflix.com",
  "support.spotify.com",
  "help.openai.com",
  "www.vtb.ru",
  "support.n26.com",
  "monzo.com",
  "www.walmart.com",
  "www.instacart.com",
  "help.uber.com",
]);

test("subscription guides: expanded services are present", () => {
  const ids = new Set(subscriptionCancellationGuidesCatalog.map((guide) => guide.id));

  for (const requiredId of [
    "apple-app-store-subscriptions",
    "google-play-subscriptions",
    "yandex-plus",
    "start-online-cinema",
    "ivi",
    "okko",
    "kion",
    "ozon-premium",
    "x5-paket",
    "walmart-plus",
    "instacart-plus",
    "uber-one",
    "t-pro",
    "t-premium",
    "tbank-partner-subscriptions",
    "sberprime",
    "vtb-operation-alerts",
    "n26-premium-membership",
    "monzo-plus-premium",
    "mts-premium",
    "youtube-premium",
    "netflix",
    "spotify-premium",
    "chatgpt-plus",
  ]) {
    assert.equal(ids.has(requiredId), true, `${requiredId} is missing from catalog`);
  }
});

test("subscription guides: official links and structure are valid", () => {
  const validCategories = new Set(subscriptionGuideCategories.map((item) => item.id));

  for (const guide of subscriptionCancellationGuidesCatalog) {
    assert.ok(guide.steps.length >= 5, `${guide.id} should have at least 5 steps`);
    assert.ok(
      guide.confirmationChecks.length >= 1,
      `${guide.id} should have at least one confirmation check`,
    );
    assert.ok(guide.officialSources.length > 0, `${guide.id} should have sources`);
    assert.ok(guide.cancellationChannels.length > 0, `${guide.id} should have channels`);
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

test("subscription guides: filtering supports category and aliases", () => {
  const banking = filterSubscriptionGuides("banking_premium_options", "");
  assert.equal(banking.length >= 7, true);
  assert.equal(banking.some((guide) => guide.id === "t-pro"), true);
  assert.equal(banking.some((guide) => guide.id === "n26-premium-membership"), true);

  const retail = filterSubscriptionGuides("marketplace_memberships", "");
  assert.equal(retail.length >= 5, true);
  assert.equal(retail.some((guide) => guide.id === "walmart-plus"), true);

  const queryResult = filterSubscriptionGuides("all", "кинопоиск");
  assert.equal(queryResult.some((guide) => guide.id === "yandex-plus"), true);

  const instacartQuery = filterSubscriptionGuides("all", "instacart");
  assert.equal(instacartQuery.some((guide) => guide.id === "instacart-plus"), true);
});

test("subscription guides: localization helpers return expected values", () => {
  const sample = subscriptionCancellationGuidesCatalog.find((guide) => guide.id === "yandex-plus");
  assert.ok(sample);
  assert.equal(getLocalizedGuideText(sample!.displayName, "ru"), "Яндекс Плюс");
  assert.equal(getLocalizedGuideText(sample!.displayName, "en"), "Yandex Plus");

  assert.equal(
    getGuideCategoryLabel("telecom_mobile_subscriptions", "ru"),
    "Мобильные и телеком-подписки",
  );
  assert.equal(getGuideChannelLabel("app_store", "en"), "App Store");
});
