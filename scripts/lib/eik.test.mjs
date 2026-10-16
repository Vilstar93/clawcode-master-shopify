import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEik9, isValidEik13, isValidEik, normalizeVatId } from './eik.mjs';

// Real ЕИКs sourced from registri.bg (which republishes the official
// Commercial Register open data from data.egov.bg).
const realEiks = ['104532902', '117091849', '117543005', '117628822', '117677659',
    '117684917', '122037194', '126737952', '205456390', '827204412'];

test('accepts real ЕИКs from the register', () => {
    for (const eik of realEiks) {
        assert.equal(isValidEik9(eik), true, `${eik} should be valid`);
    }
});

test('rejects an all-zero ЕИК', () => {
    assert.equal(isValidEik9('000000000'), false);
});

test('rejects numbers with a wrong check digit', () => {
    // 104532902 is valid; perturbing the last digit must fail.
    assert.equal(isValidEik9('104532903'), false);
    assert.equal(isValidEik9('104532901'), false);
    assert.equal(isValidEik9('104532900'), false);
});

test('rejects a transposed-digit typo', () => {
    // Swapping two digits changes the weighted sum, so the check must catch it.
    assert.equal(isValidEik9('145032902'), false);
});

test('rejects wrong lengths and non-digits', () => {
    for (const bad of ['', '12345678', '1234567890', 'abcdefghi', '12345678a', null, undefined]) {
        assert.equal(isValidEik9(bad), false, `${bad} should be rejected`);
    }
});

test('rejects obviously invalid patterns', () => {
    for (const bad of ['123456789', '999999999', '111111111']) {
        assert.equal(isValidEik9(bad), false, `${bad} should be rejected`);
    }
});

test('13-digit branch ЕИК validates its leading 9 digits', () => {
    // A 13-digit number whose first 9 digits are invalid must be rejected.
    assert.equal(isValidEik13('0000000000000'), false);
    assert.equal(isValidEik13('1234567890123'), false);
    // Wrong length.
    assert.equal(isValidEik13('104532902'), false);
});

test('isValidEik dispatches on length', () => {
    assert.equal(isValidEik('104532902'), true);
    assert.equal(isValidEik('104532903'), false);
    assert.equal(isValidEik('12345'), false);
});

test('normalizeVatId prefixes BG and uppercases', () => {
    assert.equal(normalizeVatId('104532902'), 'BG104532902');
    assert.equal(normalizeVatId('bg104532902'), 'BG104532902');
    assert.equal(normalizeVatId('BG 104532902'), 'BG104532902');
    assert.equal(normalizeVatId(''), '');
});
