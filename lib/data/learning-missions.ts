import type { LearningMission } from "../domain";

export const learningMissions: readonly LearningMission[] = [
  {
    id: "mission:find-propranolol",
    slug: "find-propranolol",
    title: "Find the naphthalene beta blocker",
    kind: "find-the-drug",
    level: "foundation",
    objective:
      "Use a scaffold clue and an evidence label to identify propranolol without treating the clue as clinical advice.",
    moleculeIds: [
      "molecule:propranolol",
      "molecule:atenolol",
      "molecule:carvedilol",
      "molecule:timolol",
    ],
    synthesisStoryIds: [],
    tasks: [
      {
        id: "identify-naphthalene-record",
        type: "single-choice",
        prompt:
          "Which catalog record contains the naphthalene-based aryloxypropanolamine scaffold?",
        options: [
          { id: "molecule:propranolol", label: "Propranolol" },
          { id: "molecule:atenolol", label: "Atenolol" },
          { id: "molecule:carvedilol", label: "Carvedilol" },
          { id: "molecule:timolol", label: "Timolol" },
        ],
        correctOptionId: "molecule:propranolol",
      },
    ],
    sourceIds: [
      "source:pubchem-4946",
      "source:pubchem-2249",
      "source:pubchem-2585",
      "source:pubchem-33624",
    ],
    estimatedMinutes: 4,
    verification: {
      status: "pending-review",
      note: "Learning wording needs pharmacy educator review; structural identities are sourced.",
    },
  },
  {
    id: "mission:beta-profile-classification",
    slug: "beta-profile-classification",
    title: "Classify the teaching lens",
    kind: "target-match",
    level: "foundation",
    objective:
      "Group beta blockers by the prototype receptor-profile lens and recognize that the labels are simplified educational categories.",
    moleculeIds: [
      "molecule:propranolol",
      "molecule:metoprolol",
      "molecule:atenolol",
      "molecule:bisoprolol",
      "molecule:carvedilol",
      "molecule:labetalol",
      "molecule:timolol",
      "molecule:nadolol",
    ],
    synthesisStoryIds: [],
    tasks: [
      {
        id: "sort-beta-profile",
        type: "classification",
        prompt:
          "Sort each molecule into the catalog's educational profile. These groups are not dosing or treatment guidance.",
        itemIds: [
          "molecule:propranolol",
          "molecule:metoprolol",
          "molecule:atenolol",
          "molecule:bisoprolol",
          "molecule:carvedilol",
          "molecule:labetalol",
          "molecule:timolol",
          "molecule:nadolol",
        ],
        groups: [
          { id: "nonselective-beta", label: "Nonselective beta (teaching lens)" },
          { id: "beta1-selective", label: "Beta1-selective (teaching lens)" },
          { id: "mixed-alpha1-beta", label: "Mixed alpha1/beta (teaching lens)" },
        ],
        correctGroupByItemId: {
          "molecule:propranolol": "nonselective-beta",
          "molecule:metoprolol": "beta1-selective",
          "molecule:atenolol": "beta1-selective",
          "molecule:bisoprolol": "beta1-selective",
          "molecule:carvedilol": "mixed-alpha1-beta",
          "molecule:labetalol": "mixed-alpha1-beta",
          "molecule:timolol": "nonselective-beta",
          "molecule:nadolol": "nonselective-beta",
        },
      },
    ],
    sourceIds: [
      "source:pubchem-4946",
      "source:pubchem-4171",
      "source:pubchem-2249",
      "source:pubchem-2405",
      "source:pubchem-2585",
      "source:pubchem-3869",
      "source:pubchem-33624",
      "source:pubchem-39147",
    ],
    estimatedMinutes: 8,
    verification: {
      status: "pending-review",
      note: "Classification keys must be signed off by a pharmacology reviewer.",
    },
  },
  {
    id: "mission:active-moiety-versus-form",
    slug: "active-moiety-versus-form",
    title: "Do not merge the salt with the active moiety",
    kind: "repair-the-molecule",
    level: "foundation",
    objective:
      "Distinguish normalized molecular identity from a pharmaceutical salt/form record.",
    moleculeIds: ["molecule:metoprolol", "molecule:bisoprolol", "molecule:timolol"],
    synthesisStoryIds: [],
    tasks: [
      {
        id: "metoprolol-form-parent",
        type: "single-choice",
        prompt:
          "Which statement preserves the identity boundary for metoprolol succinate?",
        options: [
          {
            id: "separate-form",
            label: "Keep it as a salt/form linked to the metoprolol active moiety.",
          },
          {
            id: "same-record",
            label: "Overwrite the metoprolol molecule record with the succinate product name.",
          },
          {
            id: "new-target",
            label: "Treat it as a different pharmacological target class.",
          },
        ],
        correctOptionId: "separate-form",
      },
    ],
    sourceIds: [
      "source:pubchem-4171",
      "source:dailymed-metoprolol",
      "source:pubchem-2405",
      "source:pubchem-33624",
    ],
    estimatedMinutes: 5,
    verification: {
      status: "pending-review",
      note: "Exact marketed forms remain tied to pending DailyMed label selection.",
    },
  },
  {
    id: "mission:evidence-boundaries",
    slug: "evidence-boundaries",
    title: "Evidence Hunt: reject false certainty",
    kind: "evidence-hunt",
    level: "literature",
    objective:
      "Qualify or reject claims that confuse computed structures, database absence and experimental evidence.",
    moleculeIds: ["molecule:propranolol", "molecule:carvedilol"],
    synthesisStoryIds: [],
    tasks: [
      {
        id: "review-overclaims",
        type: "evidence-review",
        prompt: "Review each statement using the platform's evidence policy.",
        claimIds: [
          "training-claim:computed-is-experimental",
          "training-claim:not-found-is-novel",
          "training-claim:computed-conformer-label",
        ],
        acceptableVerdicts: {
          "training-claim:computed-is-experimental": "reject",
          "training-claim:not-found-is-novel": "reject",
          "training-claim:computed-conformer-label": "accept",
        },
      },
    ],
    sourceIds: ["source:pubchem-4946", "source:pubchem-2585"],
    estimatedMinutes: 6,
    verification: {
      status: "pending-review",
      note: "Evidence-policy wording requires scientific and educational review.",
    },
  },
] satisfies readonly LearningMission[];
