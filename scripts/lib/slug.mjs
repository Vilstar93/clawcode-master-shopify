// Bulgarian Cyrillic to Latin transliteration, and slug derivation.
//
// Client names arrive in Cyrillic ("Примерна Фирма ЕООД") but a config slug must
// match ^[a-z0-9][a-z0-9-]{1,40}$ and becomes a directory name and a Shopify
// handle. Without this the operator invents a slug by hand for every client,
// which is where typos and collisions come from.

const MAP = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
    ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

export function transliterate(text) {
    return String(text ?? '')
        .toLowerCase()
        .split('')
        .map((ch) => MAP[ch] ?? ch)
        .join('');
}

// Legal suffixes carry no meaning in a slug and only add noise: "Примерна
// Фирма ЕООД" and "Примерна Фирма ООД" would otherwise differ.
const SUFFIXES = /\b(eood|ood|ad|eoood|et|dzzd|sdk|kda|kp)\b/g;

export function slugify(text, { maxLength = 40 } = {}) {
    const base = transliterate(text)
        .replace(SUFFIXES, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLength)
        .replace(/-+$/g, '');

    // The schema demands at least two characters starting with an alphanumeric.
    // A one-letter or fully non-Latin name would otherwise produce an invalid
    // slug that fails validation with a cryptic pattern error.
    return base.length >= 2 ? base : `store-${base}`.replace(/-+$/g, '');
}
