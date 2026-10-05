import { expect } from '@playwright/test';
import { postCase, VALID_POST, type PostPayload } from '../../api/postPayloads';
import { Then, When } from '../../support/fixtures';
import type { ScenarioContext } from '../../support/ScenarioContext';

/** A short, readable summary of the response for assertion messages. */
function describeResponse(scenario: ScenarioContext): string {
  const body = scenario.lastResponseText;
  const preview = body.length > 300 ? `${body.slice(0, 300)}… (${body.length} chars)` : body;
  return `HTTP ${scenario.lastResponse.status()} ${scenario.lastResponse.statusText()}\n${preview}`;
}

function sentPayload(scenario: ScenarioContext): PostPayload {
  if (scenario.sentPost?.kind !== 'json') throw new Error('This check needs a JSON post to have been sent.');
  return scenario.sentPost.payload;
}

// ---------- Requests ----------

When('I fetch post {int}', async ({ postsApi, scenario }, id: number) => {
  await scenario.setResponse(await postsApi.getPost(id));
});

When('I send a valid post', async ({ postsApi, scenario }) => {
  scenario.sentPost = { kind: 'json', payload: VALID_POST };
  await scenario.setResponse(await postsApi.createPost(scenario.sentPost));
});

When('I send a post with {string}', async ({ postsApi, scenario }, caseName: string) => {
  scenario.sentPost = postCase(caseName);
  await scenario.setResponse(await postsApi.createPost(scenario.sentPost));
});

// ---------- Status and format ----------

Then('the response status is {int}', async ({ scenario }, status: number) => {
  expect(scenario.lastResponse.status(), describeResponse(scenario)).toBe(status);
});

Then('the response is JSON', async ({ scenario }) => {
  expect(scenario.lastResponse.headers()['content-type'], describeResponse(scenario)).toContain(
    'application/json',
  );
  scenario.lastResponseJson();
});

Then('the API does not fail on the server side', async ({ scenario }) => {
  expect(scenario.lastResponse.status(), `Server-side failure:\n${describeResponse(scenario)}`).toBeLessThan(
    500,
  );
});

Then('the API rejects it with a client error', async ({ scenario }) => {
  const status = scenario.lastResponse.status();
  const message = `Expected a 4xx client error, but the API answered:\n${describeResponse(scenario)}`;
  expect(status, message).toBeGreaterThanOrEqual(400);
  expect(status, message).toBeLessThan(500);
  // "appropriate HTTP error codes or error messages": a rejection should say what was wrong.
  expect(scenario.lastResponseText.trim(), 'A rejection should include an error message').not.toBe('');
});

Then('the response does not reveal internal server details', async ({ scenario }) => {
  const body = scenario.lastResponseText;
  // Stack-trace frames ("at fn (file.js:12:34)"), server file paths and raw exception names
  // help an attacker map the server and must never reach a client.
  expect(body, describeResponse(scenario)).not.toMatch(/\bat .+:\d+:\d+\)?/);
  expect(body, describeResponse(scenario)).not.toMatch(/node_modules|\/app\/|[A-Za-z]:\\/);
  expect(body, describeResponse(scenario)).not.toMatch(/\b(SyntaxError|TypeError|ReferenceError)\b/);
});

// ---------- Created post ----------

Then('the created post contains everything I sent', async ({ scenario }) => {
  expect(scenario.lastResponseJson()).toMatchObject(sentPayload(scenario) as Record<string, unknown>);
});

Then('the created post has a new numeric id', async ({ scenario }) => {
  const created = scenario.lastResponseJson<{ id?: unknown }>();
  expect(Number.isInteger(created.id), `id should be an integer, got ${JSON.stringify(created.id)}`).toBe(
    true,
  );
  expect(created.id as number).toBeGreaterThan(0);
});

Then('the title is stored unchanged', async ({ scenario }) => {
  const sentTitle = sentPayload(scenario).title;
  const storedTitle = scenario.lastResponseJson<{ title?: unknown }>().title;
  if (typeof sentTitle === 'string' && typeof storedTitle === 'string') {
    // Compare lengths first: a clearer message than a 1,000,000-character diff.
    expect(storedTitle, 'stored title length').toHaveLength(sentTitle.length);
  }
  expect(storedTitle === sentTitle, 'stored title should be exactly the title sent').toBe(true);
});

Then('the post has id {int}', async ({ scenario }, id: number) => {
  expect(scenario.lastResponseJson()).toMatchObject({ id });
});
