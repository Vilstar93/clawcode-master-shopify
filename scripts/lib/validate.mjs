// Minimal JSON Schema subset validator. No dependencies.
export function validate(data, schema, path = '$') {
    const errors = [];
    const type = schema.type;

    if (type) {
        const ok =
            (type === 'object' && data !== null && typeof data === 'object' && !Array.isArray(data)) ||
            (type === 'array' && Array.isArray(data)) ||
            (type === 'string' && typeof data === 'string') ||
            (type === 'number' && typeof data === 'number') ||
            (type === 'integer' && Number.isInteger(data)) ||
            (type === 'boolean' && typeof data === 'boolean') ||
            (type === 'null' && data === null);
        if (!ok) {
            errors.push(`${path}: expected ${type}, got ${describe(data)}`);
            return errors;
        }
    }

    if (schema.enum && !schema.enum.includes(data)) {
        errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);
    }
    if (schema.pattern && typeof data === 'string' && !new RegExp(schema.pattern).test(data)) {
        errors.push(`${path}: must match ${schema.pattern}`);
    }

    if (schema.properties || schema.required) {
        for (const req of schema.required || []) {
            if (data?.[req] === undefined || data?.[req] === null || data?.[req] === '') {
                errors.push(`${path}.${req}: required`);
            }
        }
        for (const [key, sub] of Object.entries(schema.properties || {})) {
            if (data?.[key] !== undefined) {
                errors.push(...validate(data[key], sub, `${path}.${key}`));
            }
        }
    }

    if (schema.items && Array.isArray(data)) {
        if (schema.minItems && data.length < schema.minItems) {
            errors.push(`${path}: needs at least ${schema.minItems} item(s), has ${data.length}`);
        }
        data.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
    }

    return errors;
}

function describe(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}
