# Research method

## Evidence schema (`docs/research/evidence.jsonl`, one JSON object per line)
```json
{"id": "E12", "lane": "products|prior-art|voice|market", "claim": "Acme charges $29/user/month for the Team tier",
 "url": "https://acme.example/pricing", "quote": "Team $29 per user / month", "published": "2026-03-01",
 "accessed": "2026-10-14", "label": "fact", "subject": "Acme"}
```
- `quote` is a short verbatim fragment from the page (under 25 words) that supports the claim. The verifier looks for it on the page.
- `subject` is the product or repo the claim is about, so tables can be grouped.
- `verify_evidence.mjs` adds `verified` (`yes | fuzzy | mismatch | broken | blocked | unverified | manual`), `http_status`, `checked`, and `repo` (`stars`, `pushed`, `archived`) for GitHub URLs. You set `manual` by hand only after confirming the quote yourself with WebFetch; add a `note`.

## Lanes and query patterns
| Lane | Find | Queries / places |
|---|---|---|
| Products | Direct competitors (same job, same user), indirect ones (same job, different approach), substitutes (spreadsheets, agencies, doing nothing) | `<job> software`, `<job> tool for <user>`, `best <category> 2026`, `<competitor> alternatives`, `<competitor> pricing`, G2/Capterra category pages, Product Hunt search |
| Prior art | Open-source projects, libraries and abandoned attempts | `gh search repos`, `gh search repos --topic <t>`, npm/PyPI search, `awesome-<category>` lists, Hacker News "Show HN: <terms>" |
| Voice of customer | Pain intensity, complaints, workarounds, wishes, what people pay for | `site:reddit.com <competitor> alternative`, `"I wish" <competitor>`, `"switched from" <competitor>`, HN Algolia (`hn.algolia.com/?q=<terms>`), 1–3★ reviews on G2/Capterra/Trustpilot/app stores, GitHub issues sorted by 👍 |
| Market | Demand and money signals | Crunchbase/press for funding, job posts mentioning the category, pricing tiers, community sizes, public customer counts |

Follow leads. A listicle names products, and each product's own site is the evidence. Stop a lane when new sources stop adding new names or themes.

## Classifying competitors
- **Direct:** the same job for the same user. These decide whether there is room.
- **Indirect:** the same job done another way, or a different user.
- **Substitute:** how people cope without a product. These are often the real competition.
- Confidence: **high** (site plus pricing or docs fetched and recent), **medium** (site fetched, details thin), **low** (only third-party mentions; keep it out of the main table).
- Alive: last release, changelog or repo push within 12 months, and the site works.

## Complaint mining
- Collect 1–3★ reviews and threads, tag each with a theme (price, missing feature X, complexity, performance, support, lock-in, …), and count by theme.
- Mom Test weighting: **past behaviour and money spent** (people who switched, pay for workarounds, built scripts) count far more than hypothetical praise ("would be cool").
- Each theme gets a count, a representative quote with `[E#]`, and what it implies for our product.

## Market-lite estimate (bottom-up only)
`reachable buyers × annual price × share we could plausibly win in 2–3 years`, as low, mid and high. Show each input with its source or label it an assumption. Never quote an analyst's TAM figure as our market.

## Rubric (score 1–5, each with one-line evidence)
| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Pain | Mild annoyance | Real cost, people complain | Hair-on-fire; people pay for workarounds now |
| Frequency | Yearly | Monthly | Daily |
| Willingness to pay | Expect it free | Pay for adjacent tools | Pay today for weaker solutions |
| Saturation (inverse) | Many strong, funded direct competitors | Some competitors, clear weaknesses | None, or only dead or abandoned ones |
| Differentiation gap | No clear edge | An edge for one segment | An edge competitors can't easily copy |
| Distribution | No path to users | Reachable through paid channels | A channel we already have (community, audience, integration) |
| Feasibility | Needs breakthroughs | Hard but known | Straightforward for this team |

**Verdict:** total under 18, or Pain at most 2 → **kill**. Total 18–25, or a gap only in a narrower segment → **pivot** (name the pivot). Total over 25 with Pain at least 3 and Differentiation at least 3 → **go**. These are guides, not rules. State what evidence would move the verdict.

## Mom Test interview script
For each open assumption, write 2–3 questions about **past behaviour**, never opinions about the idea:
- "Tell me about the last time you <did the job>." / "What did you try? What did it cost?" / "What happened when it went wrong?"
- Avoid: "Would you use…?", "Would you pay…?", and pitching.
- Write down what answer would invalidate each assumption.
