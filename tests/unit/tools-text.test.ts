import { describe, expect, it } from 'vitest';
import { caseConvert, countText, csvToJson, jsonToCsv, parseCsv, passwordScore } from '@/features/tools/components';

describe('caseConvert', () => {
  const input = 'openHub makes life easier';

  it('handles upper, lower, title and sentence', () => {
    expect(caseConvert(input, 'upper')).toBe('OPENHUB MAKES LIFE EASIER');
    expect(caseConvert(input, 'lower')).toBe('openhub makes life easier');
    expect(caseConvert(input, 'title')).toBe('Openhub Makes Life Easier');
    expect(caseConvert('hello WORLD', 'sentence')).toBe('Hello world');
  });

  it('handles camel, pascal, snake, kebab and constant', () => {
    expect(caseConvert(input, 'camel')).toBe('openHubMakesLifeEasier');
    expect(caseConvert(input, 'pascal')).toBe('OpenHubMakesLifeEasier');
    expect(caseConvert(input, 'snake')).toBe('open_hub_makes_life_easier');
    expect(caseConvert(input, 'kebab')).toBe('open-hub-makes-life-easier');
    expect(caseConvert(input, 'constant')).toBe('OPEN_HUB_MAKES_LIFE_EASIER');
  });

  it('returns the input untouched for an unknown mode', () => {
    expect(caseConvert(input, 'nope')).toBe(input);
  });
});

describe('countText', () => {
  it('counts words, characters and sentences', () => {
    const stats = countText('One two three. Four five!');
    expect(stats.words).toBe(5);
    expect(stats.sentences).toBe(2);
    expect(stats.characters).toBe('One two three. Four five!'.length);
    expect(stats.charactersNoSpaces).toBe('Onetwothree.Fourfive!'.length);
  });

  it('treats blank input as empty', () => {
    const stats = countText('   ');
    expect(stats.words).toBe(0);
    expect(stats.readingMinutes).toBe(0);
  });

  it('estimates reading time at about 200 words per minute', () => {
    const stats = countText(Array.from({ length: 400 }, () => 'word').join(' '));
    expect(stats.readingMinutes).toBe(2);
  });
});

describe('parseCsv', () => {
  it('handles quoted cells with commas and escaped quotes', () => {
    const rows = parseCsv('name,note\nAsha,"said ""hi"", twice"\nRohit,plain');
    expect(rows).toEqual([
      ['name', 'note'],
      ['Asha', 'said "hi", twice'],
      ['Rohit', 'plain'],
    ]);
  });

  it('drops empty trailing lines', () => {
    expect(parseCsv('a,b\n1,2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('csvToJson and jsonToCsv', () => {
  it('converts both ways', () => {
    const json = csvToJson('name,city\nAsha,Pune\nRohit,Kochi');
    expect(json).toEqual([
      { name: 'Asha', city: 'Pune' },
      { name: 'Rohit', city: 'Kochi' },
    ]);
    expect(jsonToCsv(JSON.stringify(json))).toBe('name,city\nAsha,Pune\nRohit,Kochi');
  });

  it('escapes values containing commas or quotes', () => {
    const csv = jsonToCsv(JSON.stringify([{ note: 'a, "b"' }]));
    expect(csv).toBe('note\n"a, ""b"""');
  });

  it('refuses input that is not an array of objects', () => {
    expect(() => jsonToCsv('{"a":1}')).toThrow(/non-empty JSON array/);
  });
});

describe('passwordScore', () => {
  it('scores an empty password as zero', () => {
    expect(passwordScore('').score).toBe(0);
  });

  it('rewards length and character variety', () => {
    const weak = passwordScore('password');
    const strong = passwordScore('Tr!cky-9mango-Window#42');
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.label).toBe('Very strong');
    expect(strong.score).toBe(5);
  });

  it('penalises common words and repeated characters', () => {
    expect(passwordScore('123456').score).toBeLessThan(2);
    expect(passwordScore('aaaaaaaAAA1!').score).toBeLessThan(passwordScore('xk9#Qm2$vL7!').score);
  });
});
