import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { PostRequest } from './postPayloads';

/**
 * Thin client for JSONPlaceholder's /posts resource: the API equivalent of a page object.
 * Paths are relative; the base URL comes from the environment config.
 */
export class PostsApiClient {
  constructor(private readonly request: APIRequestContext) {}

  getPost(id: number): Promise<APIResponse> {
    return this.request.get(`posts/${id}`);
  }

  /** Sends a JSON payload, or a raw body exactly as written (for invalid JSON). */
  createPost(post: PostRequest): Promise<APIResponse> {
    if (post.kind === 'json') {
      // Playwright serialises objects to JSON and sets Content-Type: application/json.
      return this.request.post('posts', { data: post.payload });
    }
    return this.request.post('posts', { data: post.body, headers: { 'Content-Type': post.contentType } });
  }
}
