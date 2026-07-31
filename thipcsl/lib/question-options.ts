export type QuestionOptions = Record<string, string>;

export function getOptionLabel(index: number) {
    let n = index + 1;
    let label = '';

    while (n > 0) {
        n--;
        label = String.fromCharCode(65 + (n % 26)) + label;
        n = Math.floor(n / 26);
    }

    return label;
}

export function sortOptionKeys(keys: string[]) {
    return [...keys].sort((a, b) => {
        const normalizedA = a.trim().toUpperCase();
        const normalizedB = b.trim().toUpperCase();
        return optionLabelToNumber(normalizedA) - optionLabelToNumber(normalizedB);
    });
}

export function getNextOptionLabel(options: QuestionOptions) {
    const existing = new Set(Object.keys(options).map(key => key.trim().toUpperCase()));
    let index = 0;

    while (existing.has(getOptionLabel(index))) {
        index++;
    }

    return getOptionLabel(index);
}

export function normalizeOptions(options: unknown): QuestionOptions {
    if (!options || typeof options !== 'object') return {};

    return sortOptionKeys(Object.keys(options as QuestionOptions)).reduce<QuestionOptions>((acc, key) => {
        acc[key.trim().toUpperCase()] = String((options as QuestionOptions)[key] ?? '');
        return acc;
    }, {});
}

export function compactOptions(options: unknown): QuestionOptions {
    return Object.entries(normalizeOptions(options)).reduce<QuestionOptions>((acc, [key, value]) => {
        const trimmed = value.trim();
        if (trimmed) acc[key] = trimmed;
        return acc;
    }, {});
}

export function parseCorrectAnswerValue(raw: unknown) {
    const normalized = String(raw ?? '').trim().toUpperCase();
    if (!normalized) return [];

    try {
        const parsed = JSON.parse(normalized);
        if (Array.isArray(parsed)) return parsed.map(value => String(value).trim().toUpperCase()).filter(Boolean);
        return [String(parsed).trim().toUpperCase()].filter(Boolean);
    } catch {
        if (normalized.includes(',') || normalized.includes(';')) {
            return normalized.split(/[,;]/).map(value => value.trim().toUpperCase()).filter(Boolean);
        }

        if (/^[A-Z]+$/.test(normalized) && normalized.length > 1) {
            return normalized.split('');
        }

        return [normalized];
    }
}

export function serializeCorrectAnswer(raw: unknown) {
    const values = parseCorrectAnswerValue(raw);
    return JSON.stringify(values);
}

function optionLabelToNumber(label: string) {
    let value = 0;
    for (const char of label) {
        const code = char.charCodeAt(0);
        if (code < 65 || code > 90) return Number.MAX_SAFE_INTEGER;
        value = value * 26 + (code - 64);
    }
    return value;
}
