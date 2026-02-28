/**
 * Escalation Configuration
 *
 * Maps every category to its authority tiers: who to email, at what level,
 * and how long they have to respond before auto-escalation to the next tier.
 *
 * For hostel categories (hostel-b1, hostel-b2, …) the emails are generated
 * dynamically using the hostel code.
 */

// ── Static categories (non-hostel) ─────────────────────

export const STATIC_ESCALATION = {
  // ─── Mess ──────────────────────────────────────────
  mess: [
    { level: 1, role: 'Dining Services',           email: 'catering@iitj.ac.in',         hours: 72  },   // ~3 days
    { level: 2, role: 'Board of Hostel Affairs',    email: 'bha@iitj.ac.in',              hours: 72  },   // +3 days
    { level: 3, role: 'Associate Dean Hostel Affairs', email: 'adha@iitj.ac.in',          hours: 0   },   // final
  ],

  // ─── Academia ──────────────────────────────────────
  academia: [
    { level: 1, role: 'Office of Students',         email: 'office_students@iitj.ac.in',  hours: 72  },
    { level: 2, role: 'Dean of Academic Affairs',    email: 'doaa@iitj.ac.in',             hours: 0   },   // final
  ],

  // ─── Bureaucracy ───────────────────────────────────
  bureaucracy: [
    { level: 1, role: 'ERP',                        email: 'erp@iitj.ac.in',              hours: 0   },   // single tier
  ],

  // ─── Infrastructure ───────────────────────────────
  infrastructure: [
    { level: 1, role: 'OIE',                        email: 'oie@iitj.ac.in',              hours: 0   },   // single tier
  ],

  // ─── Placement ────────────────────────────────────
  placement: [
    { level: 1, role: 'Placement Office',            email: 'placement@iitj.ac.in',        hours: 0   },   // single tier
  ],
};

// ── Hostel helper ──────────────────────────────────────

/**
 * Generate the 3-tier escalation chain for a given hostel code.
 * @param {string} hostelCode  e.g. "b1", "g2", "i3"
 */
function hostelEscalation(hostelCode) {
  const code = hostelCode.toLowerCase();
  return [
    {
      level: 1,
      role: `${code.toUpperCase()} Caretaker`,
      email: `${code}caretaker@iitj.ac.in`,
      hours: 96,       // ~4 days
    },
    {
      level: 2,
      role: `Warden ${code.toUpperCase()} Hostel`,
      email: `warden_${code}_hostel@iitj.ac.in`,
      hours: 120,      // ~5 days
    },
    {
      level: 3,
      role: 'Associate Dean Hostel Affairs',
      email: 'adha@iitj.ac.in',
      hours: 0,        // final tier
    },
  ];
}

// ── Public API ─────────────────────────────────────────

/**
 * Get the full escalation chain for a category.
 * @param {string} category  e.g. "academia", "hostel-b1", "mess"
 * @returns {Array<{ level, role, email, hours }>}
 */
export function getEscalationChain(category) {
  // Hostel categories follow "hostel-<code>" pattern
  if (category.startsWith('hostel-')) {
    const hostelCode = category.replace('hostel-', '');
    return hostelEscalation(hostelCode);
  }

  return STATIC_ESCALATION[category] || [];
}

/**
 * Get the authority info for a specific escalation level.
 * @param {string} category
 * @param {number} level  1-based
 * @returns {{ role, email, hours } | null}
 */
export function getAuthorityAtLevel(category, level) {
  const chain = getEscalationChain(category);
  return chain.find(t => t.level === level) || null;
}

/**
 * Get the maximum escalation level for a category
 */
export function getMaxLevel(category) {
  const chain = getEscalationChain(category);
  return chain.length > 0 ? Math.max(...chain.map(t => t.level)) : 0;
}

/**
 * All known hostel codes
 */
export const HOSTEL_CODES = [
  'b1', 'b2', 'b3', 'b4', 'b5',
  'g1', 'g2', 'g3', 'g4', 'g5', 'g6',
  'i2', 'i3',
  'o3', 'o4',
  'y3', 'y4',
];
