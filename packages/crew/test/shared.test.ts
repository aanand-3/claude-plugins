/** src/shared/: the secret patterns the hub's knowledge check and git-setup's pre-commit check both use. */
import { expect, it } from "vitest";
import { secretsIn } from "../src/hub/core/memory/knowledge.js";
import { SECRET_PATTERNS } from "../src/shared/secrets.js";

// Built at runtime so this file never contains a real-looking secret.
const HUBSPOT = "pat-na1-" + "a".repeat(8) + "-" + "b".repeat(4) + "-" + "c".repeat(4) + "-" + "d".repeat(4) + "-" + "e".repeat(12);

it("the knowledge check knows every pattern the pre-commit check blocks, HubSpot tokens included", () => {
  expect(SECRET_PATTERNS["HubSpot private app token"].test(HUBSPOT)).toBe(true);
  expect(secretsIn(`token: ${HUBSPOT}`)).toEqual(["HubSpot private app token"]);
  expect(secretsIn(`token: ${HUBSPOT} pk:allow-secret`)).toEqual([]);
});
