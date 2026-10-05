import { expect } from '@playwright/test';
import { Then, When } from '../../support/fixtures';

When('I fetch post {int}', async ({ postsApi, scenario }, id: number) => {
  await scenario.setResponse(await postsApi.getPost(id));
});

Then('the response status is {int}', async ({ scenario }, status: number) => {
  expect(scenario.lastResponse.status(), scenario.lastResponseText.slice(0, 300)).toBe(status);
});

Then('the response is JSON', async ({ scenario }) => {
  expect(scenario.lastResponse.headers()['content-type']).toContain('application/json');
});

Then('the post has id {int}', async ({ scenario }, id: number) => {
  expect(scenario.lastResponseJson()).toMatchObject({ id });
});
