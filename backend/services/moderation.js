// ─── AI Content Moderation Service ─────────────────────
// Uses OpenAI's free Moderation API to detect abusive content.
// Fail-open: if OPENAI_API_KEY is missing or the API errors,
// content is allowed through so the system never breaks.
// ────────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
 * Check text content against OpenAI's Moderation API.
 * @param {string} text - The text to check.
 * @returns {{ flagged: boolean, categories: string[], reason: string }}
 */
export async function checkContent(text) {
    // If no API key, skip moderation (fail-open)
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
