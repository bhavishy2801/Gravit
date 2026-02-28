// ─── AI Content Moderation Service ─────────────────────
// Multi-layer approach:
//   1. Built-in keyword filter with leetspeak normalization (always active)
//   2. OpenAI Moderation API (if OPENAI_API_KEY is set)
// Both layers must pass for content to be allowed.
// ────────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ═══════════════════════════════════════════════════════
// Leetspeak / obfuscation character map
// Maps common substitutions back to their letter equivalent
// ═══════════════════════════════════════════════════════
const LEET_MAP = {
  '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's',
  '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '|': 'l',
  '*': 'u', '.': '', '-': '', '_': '', '+': 't',
  '(': 'c', ')': '', '{': 'c', '}': '',
  '<': 'c', '>': '',
  '€': 'e', '£': 'l', '¥': 'y',
};

/**
 * Normalize text to defeat common obfuscation tricks:
 *  - Leetspeak: f*ck → fck, sh!t → shit, @ss → ass
 *  - Inserted chars: f.u.c.k → fuck, f-u-c-k → fuck
 *  - Repeated chars: fuuuuck → fuck
 *  - Mixed case: already handled by .toLowerCase()
 *  - Whitespace inside words is collapsed
 */
function normalizeText(text) {
  let out = text.toLowerCase();

  // Replace leetspeak characters
  out = out.replace(/./g, ch => {
    if (LEET_MAP[ch] !== undefined) return LEET_MAP[ch];
    return ch;
  });

  // Remove zero-width and invisible unicode chars
  out = out.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '');

  // Collapse repeated letters (3+ → 2 max): fuuuuck → fuuck, shhhhit → shhit
  out = out.replace(/(.)\1{2,}/g, '$1$1');

  return out;
}

// ═══════════════════════════════════════════════════════
// Profanity patterns — using fuzzy regex patterns instead
// of exact strings so spelling variations are caught.
// Each pattern is already lowercase.
// ═══════════════════════════════════════════════════════
const PROFANITY_PATTERNS = [
  // ─── English profanity ─────────────────────────
  // fuck and variants
  'f+[uv]+[ck]+[eaio]*[rsd]*',
  'f+u+q+',
  'motherf+[uv]*[ck]+[eaio]*[rsd]*',
  'mofo',
  'wtf',
  'stfu',

  // shit and variants
  'sh+[i!1y]+t+[estyz]*',
  'bull+sh+[i!1]+t+',

  // ass and variants
  'a+[sr]*s+h+[o0]+l+e*[sz]*',
  'a+r+s+e+',
  'dumb+a+s+s+',
  'jack+a+s+s+',
  'smart+a+s+s+',
  'bad+a+s+s+',
  'kick+a+s+s+',
  'lmao',

  // bitch
  'b+[i!1]+t+c+h+[easyiz]*',

  // damn / god damn
  'g*o*d*d+a+m+[nimet]*',

  // dick
  'd+[i!1]+c+k+[shea]*',

  // cock
  'c+[o0]+c+k+s*[uv]*c*k*e*r*',

  // cunt
  'c+[uv]+n+t+[sz]*',

  // bastard
  'b+a+s+t+[ae]*r+d+[sz]*',

  // piss
  'p+[i!1]+s+s+[eyd]*',

  // crap
  'c+r+a+p+[psy]*',

  // whore / slut
  'w+h+[o0]+r+e+[sz]*',
  's+l+[uv]+t+[tsz]*',

  // ─── Slurs & hate speech ───────────────────────
  'n+[i!1]+g+[g]+[eaou]*[rszh]*',
  'f+[a4@]+g+[g]*[oie]*t*[sz]*',
  'r+e+t+[a4@]+r+d+[sed]*',
  'tr+[a4@]+n+n+[yie]+[sz]*',
  'c+h+[i!1]+n+k+[sz]*',
  'sp+[i!1]+c+[sk]*',
  'k+[i!1]+k+e+[sz]*',
  'w+e+t+b+a+c+k+',
  'b+e+a+n+e+r+',
  'g+[o0]+[o0]+k+',
  'd+y+k+e+[sz]*',

  // ─── Threats ───────────────────────────────────
  'k+[i!1]+l+l*\\s*y+[o0]+u+r+s+e+l+[fv]+',
  'k+y+s+',

  // ─── Hindi / Desi profanity (with spelling variations) ──
  // madarchod / madharchod / maadarchod
  'm+[a4@]+[a4@]*d+[h]*[a4@]*r+[a4@]*c+h+[o0]+d+',
  // behenchod / bhenchod / bhnchd
  'b+[eh]*[a4@]*h*e*n+c+h+[o0]+d+',
  // chutiya / chutiye / chootiya
  'c+h+[uvo0]+[o0]*t+[i!1]+y+[ae]*',
  // gandu / gaandu
  'g+[a4@]+[a4@]*n+d+[uv]+',
  // bhosdike / bsdk / bhosdiwale
  'b+h*[o0]+s+d+[i!1]*[kw]+[ae]*l*e*',
  'b+s+d+k+',
  // laude / lavde / lodu / lode
  'l+[a4@]+[uv]+d+[eai]*',
  'l+[o0]+d+[eiu]+',
  // randi / raand
  'r+[a4@]+[a4@]*n+d+[i!1]*',
  // harami / haramkhor
  'h+[a4@]+r+[a4@]+m+[i!1khor]*',
  // saala / saale / sala
  's+[a4@]+[a4@]*l+[ae]+',
  // kamina / kamine
  'k+[a4@]+m+[i!1]+n+[ae]+',
  // jhatu / jhaatu
  'j+h+[a4@]+[a4@]*t+[uv]+',
  // tatti
  't+[a4@]+t+t+[i!1]+',
  // kutta / kutte / kutiya
  'k+[uv]+t+t*[i!1]*y*[ae]*',
  // suar / suwar
  's+[uv]+[aw]*[a4@]*r+',

  // MC / BC as standalone (2-letter abbreviations)
  // handled separately below
];

// Compile all patterns into one big regex (word-boundary aware)
const PROFANITY_REGEX = new RegExp(
  '(?:^|\\b|\\s)(' + PROFANITY_PATTERNS.join('|') + ')(?:\\b|\\s|$)',
  'i'
);

// Standalone short abbreviations (need exact word boundary matching)
const SHORT_ABBREV_REGEX = /(?:^|\s)(mc|bc|stfu|wtf|lmfao|fml|af)(?:\s|$|[.,!?])/i;

/**
 * Check text against the built-in profanity filter.
 * Normalizes leetspeak and obfuscation before matching.
 */
function checkBuiltInFilter(text) {
  const normalized = normalizeText(text);

  // Check main profanity patterns
  if (PROFANITY_REGEX.test(normalized)) {
    return {
      flagged: true,
      categories: ['Profanity / Abuse'],
      reason: 'Your message contains inappropriate language that is not allowed.',
    };
  }

  // Check short abbreviations
  if (SHORT_ABBREV_REGEX.test(normalized)) {
    return {
      flagged: true,
      categories: ['Profanity / Abuse'],
      reason: 'Your message contains inappropriate language that is not allowed.',
    };
  }

  // Also check original text (some tricks only visible un-normalized)
  const lower = text.toLowerCase();
  if (PROFANITY_REGEX.test(lower)) {
    return {
      flagged: true,
      categories: ['Profanity / Abuse'],
      reason: 'Your message contains inappropriate language that is not allowed.',
    };
  }

  // Pass 3: strip ALL spaces and re-check (catches "f u c k", "s h i t")
  const noSpaces = normalized.replace(/\s+/g, '');
  if (noSpaces.length >= 3 && PROFANITY_REGEX.test(noSpaces)) {
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
