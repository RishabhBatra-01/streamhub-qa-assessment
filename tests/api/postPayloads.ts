/**
 * Named request bodies for POST /posts, so feature files can say
 *   When I send a post with "a 10,000-character title"
 * while the exact data lives here, in typed code.
 */

export interface PostPayload {
  title?: unknown;
  body?: unknown;
  userId?: unknown;
}

export type PostRequest =
  /** A JavaScript value, sent as JSON with Content-Type: application/json. */
  | { kind: 'json'; payload: PostPayload }
  /** A raw body sent exactly as written: used for bodies that are not valid JSON. */
  | { kind: 'raw'; body: string; contentType: string };

export const VALID_POST: PostPayload = {
  title: 'Planning a home loan',
  body: 'Comparing EMIs for a 25 lakh loan over 10 and 15 years.',
  userId: 1,
};

const withTitle = (title: unknown): PostRequest => ({ kind: 'json', payload: { ...VALID_POST, title } });
const without = (field: keyof PostPayload): PostRequest => {
  const payload = { ...VALID_POST };
  delete payload[field];
  return { kind: 'json', payload };
};

const CASES = {
  // --- Excessively long titles (a typical title limit is 255 characters) ---
  'a 256-character title': withTitle('T'.repeat(256)),
  'a 10,000-character title': withTitle('T'.repeat(10_000)),
  'a 100,000-character title': withTitle('T'.repeat(100_000)),
  'a 1,000,000-character title': withTitle('T'.repeat(1_000_000)),

  // --- Unsupported special characters: characters a title should never contain ---
  'a title containing a null byte': withTitle('Home\u0000Loan'),
  'a title containing control characters': withTitle('Home\u0007\u001b[31mLoan\u0008'),
  'a title containing an invalid lone surrogate': withTitle('Home \ud800 Loan'),
  'a title containing a right-to-left override': withTitle('Invoice \u202Efdp.exe'),
  'a title containing a script tag': withTitle('<script>alert("xss")</script>'),

  // --- Special characters a well-behaved API should accept and store unchanged ---
  'a title with emoji and non-Latin scripts': withTitle('Home loan 🏠 – नमस्ते 你好 مرحبا Ünïcödé'),
  'a title with quotes, ampersands and backslashes': withTitle(`Tom's "dream" home & garden \\ C:\\loans`),
  'a title that looks like SQL injection': withTitle("'; DROP TABLE posts; --"),

  // --- Missing required fields ---
  'no userId': without('userId'),
  'no title': without('title'),
  'no body': without('body'),
  'an empty object': { kind: 'json', payload: {} },

  // --- Extra: wrong data types ---
  'a userId that is text': { kind: 'json', payload: { ...VALID_POST, userId: 'abc' } },
  'a negative userId': { kind: 'json', payload: { ...VALID_POST, userId: -1 } },
  'a title that is a number': withTitle(12345),
  'a title that is null': withTitle(null),

  // --- Extra: bodies that are not a valid JSON object ---
  'a truncated JSON body': {
    kind: 'raw',
    body: '{"title": "Home loan", "userId":',
    contentType: 'application/json',
  },
  'a JSON null body': { kind: 'raw', body: 'null', contentType: 'application/json' },
  'a JSON array body': { kind: 'raw', body: '[1, 2, 3]', contentType: 'application/json' },
} satisfies Record<string, PostRequest>;

export type PostCaseName = keyof typeof CASES;

export function postCase(name: string): PostRequest {
  if (!(name in CASES)) {
    throw new Error(`Unknown post case "${name}". Known cases:\n  - ${Object.keys(CASES).join('\n  - ')}`);
  }
  return CASES[name as PostCaseName];
}
