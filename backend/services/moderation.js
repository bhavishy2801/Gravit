// ─── AI Content Moderation Service ─────────────────────
// Two-layer approach:
//   1. Built-in keyword filter (always active, zero cost)
//   2. OpenAI Moderation API (if OPENAI_API_KEY is set)
// ────────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ─── Built-in profanity / slur word list ────────────────
// Covers common English profanity, slurs, and abusive terms.
// Stored lowercase. Matching is done on word boundaries to
// avoid false positives (e.g. "class" won't match "ass").
const PROFANITY_LIST = [
  // Strong profanity
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'motherfucker', 'motherfucking',
  'shit', 'shitty', 'bullshit', 'shitting',
  'ass', 'asshole', 'arsehole', 'arse',
  'bitch', 'bitches', 'bitching',
  'damn', 'damned', 'dammit', 'goddamn', 'goddammit',
  'dick', 'dickhead',
  'cock', 'cocksucker',
  'cunt', 'cunts',
  'bastard', 'bastards',
  'piss', 'pissed', 'pissing',
  'crap', 'crappy',
  'whore', 'slut', 'sluts',
  // Slurs & hate speech
  'nigger', 'nigga', 'niggers',
  'faggot', 'fag', 'fags', 'faggots',
  'retard', 'retarded', 'retards',
  'tranny', 'trannies',
  'chink', 'chinks',
  'spic', 'spics',
  'kike', 'kikes',
  'wetback',
  'beaner',
  'gook',
  'dyke', 'dykes',
  // Threats / violence
  'kill yourself', 'kys',
  // Hindi / common desi profanity
  'madarchod', 'mc', 'bc', 'behenchod', 'bhenchod',
  'chutiya', 'chutiye', 'gandu', 'gaandu',
  'bhosdike', 'bsdk', 'bhosdiwale',
  'laude', 'lavde', 'lodu', 'lode',
  'randi', 'raand',
  'harami', 'haramkhor',
  'saala', 'saale', 'sala', 'sale',
  'kamina', 'kamine',
  'jhatu', 'jhaatu',
  'tatti', 'haggu',
  'kutte', 'kutta', 'kutiya',
  'suar', 'suwar',
  'ullu',
];

// Build a single regex from the word list for efficient matching
const PROFANITY_REGEX = new RegExp(
  '\\b(' + PROFANITY_LIST.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'i'
);

/**
 * Check text against the built-in profanity word list.
 * @param {string} text
 * @returns {{ flagged: boolean, categories: string[], reason: string }}
 */
function checkBuiltInFilter(text) {
  const match = text.match(PROFANITY_REGEX);
  if (match) {
    return {
      flagged: true,
      categories: ['Profanity / Abuse'],
      reason: 'Your message contains inappropriate language that is not allowed.',
    };
  }
  return { flagged: false, categories: [], reason: '' };
}

const CATEGORY_LABELS = {
    'harassment': 'Harassment',
    'harassment/threatening': 'Threatening harassment',
    'hate': 'Hate speech',
    'hate/threatening': 'Threatening hate speech',
    'self-harm': 'Self-harm',
    'self-harm/intent': 'Self-harm intent',
    'self-harm/instructions': 'Self-harm instructions',
    'sexual': 'Sexual content',
    'sexual/minors': 'Sexual content involving minors',
    'violence': 'Violence',
    'violence/graphic': 'Graphic violence',
};

/**
 * Check text content for inappropriate language.
 * Layer 1: Built-in keyword filter (always runs).
 * Layer 2: OpenAI Moderation API (if key is configured).
 * @param {string} text - The text to check.
 * @returns {{ flagged: boolean, categories: string[], reason: string }}
 */
export async function checkContent(text) {
    // Layer 1 — built-in filter (always active)
    const builtIn = checkBuiltInFilter(text);
    if (builtIn.flagged) return builtIn;

    // Layer 2 — OpenAI (if configured)
    if (!OPENAI_API_KEY) {
        return { flagged: false, categories: [], reason: '' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({ input: text }),
        });

        if (!response.ok) {
            console.warn(`[Moderation] OpenAI API returned ${response.status}, allowing content through.`);
            return { flagged: false, categories: [], reason: '' };
        }

        const data = await response.json();
        const result = data.results?.[0];

        if (!result || !result.flagged) {
            return { flagged: false, categories: [], reason: '' };
        }

        // Collect the flagged category names
        const flaggedCategories = Object.entries(result.categories)
            .filter(([, isFlagged]) => isFlagged)
            .map(([cat]) => CATEGORY_LABELS[cat] || cat);

        return {
            flagged: true,
            categories: flaggedCategories,
            reason: flaggedCategories.join(', '),
        };
    } catch (err) {
        console.warn('[Moderation] API call failed, allowing content through:', err.message);
        return { flagged: false, categories: [], reason: '' };
    }
}
