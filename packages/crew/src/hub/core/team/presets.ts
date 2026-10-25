/** Policy presets: a named layer a project opts into with `preset: <name>` in .crew/policy.yaml, applied between the org
 * layers and the project's own (so the project can still adjust it). `lifecycle` turns the team's RACI into gates
 * (docs/vision.md → Workstream T): the human approves the goal set, each step belongs to one role. */
type Raw = Record<string, unknown>;

const DRAFTS = { paths: { write: [".crew/drafts/**"] } }; // roles that only write drafts for the hub

export const PRESETS: Record<string, { global: Raw; roles: Record<string, Raw> }> = {
  lifecycle: {
    global: {
      mode: "ai-native",
      human_gates: ["goal.active"],
      role_gates: {
        "item.triaged": "pm",            // only the PM triages and ranks
        "plan.ready": "architect",       // only the Architect makes a spec ready
        "plan.assigned": "pm",           // the PM opens a plan for a developer; `start` then needs that assignment
        "plan.in-progress": "developer", // only the assigned developer implements (and fixes what comes back)
        "plan.in-review": "developer",   // … and hands over to test
        "plan.accepted": "pm",           // the PM accepts, against QA's evidence and the review
        "plan.done": "pm",               // … and completes once Release has landed it
        "plan.landed": "release",        // Release lands it; a failed land sends it back (accepted → in-progress)
        "plan.dropped": "pm",
        "goal.done": "pm",               // the PM verifies a goal's criteria and closes it
        "plan.reassigned": "director",   // the Director moves stuck work to someone else
        "plan.reviewed": "architect",    // code review against the spec; done needs an approval of the current code
      },
      // liveness: a claim quiet for a day is stale; a third bounce or a sixth failed attempt goes to the Director
      limits: { stale_claim_hours: 24, max_bounces: 2, max_attempts: 5 },
      evidence: { role: "qa" },          // only QA's checks count toward done
    },
    roles: { director: DRAFTS, pm: DRAFTS, qa: DRAFTS, release: DRAFTS },
  },
};
