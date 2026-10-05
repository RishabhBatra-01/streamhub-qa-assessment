import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Thin client for JSONPlaceholder's /posts resource: the API equivalent of a page object.
 * Paths are relative; the base URL comes from the environment config.
 */
export class PostsApiClient {
  constructor(private readonly request: APIRequestContext) {}

  getPost(id: number): Promise<APIResponse> {
    return this.request.get(`posts/${id}`);
  }
}
