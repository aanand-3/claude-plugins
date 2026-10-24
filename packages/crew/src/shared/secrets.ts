/** High-confidence secret patterns, the one home for both users: the hub refuses them in knowledge entries
 * (hub/core/memory/knowledge.ts) and git-setup's pre-commit check blocks them in staged changes
 * (tools/git-setup/check_secrets.ts). A line carrying `pk:allow-secret` is exempt in both. */
export const SECRET_PATTERNS: Record<string, RegExp> = {
  "AWS access key": /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
  "private key": /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  "GitHub token": /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  "Slack token": /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  "Anthropic API key": /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  "OpenAI API key": /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{35}\b/,
  "Stripe live key": /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/,
  "HubSpot private app token": /\bpat-(na|eu)\d-[0-9a-f]{8}-[0-9a-f-]{27}\b/,
  "credentials in URL": /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]{8,}@(?!localhost|127\.0\.0\.1|postgres|redis|db\b)/,
};

export const ALLOW_SECRET = "pk:allow-secret";
