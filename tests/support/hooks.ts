import { env } from '../../config/env';
import { Before } from './fixtures';

/** Records which environment a scenario ran against, so every report entry is traceable. */
Before(async ({ $testInfo }) => {
  $testInfo.annotations.push({ type: 'environment', description: env.name });
});
