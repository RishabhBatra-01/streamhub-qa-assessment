import { env } from '../../config/env';
import { Before } from './fixtures';

const DEFECT_TAG = /^@defect:(.+)$/;

/** Records which environment a scenario ran against, so every report entry is traceable. */
Before(async ({ $testInfo }) => {
  $testInfo.annotations.push({ type: 'environment', description: env.name });
});

/**
 * Scenarios tagged @defect:<ID> describe behaviour the brief expects but the system
 * under test does not have yet. They also carry @fail, so Playwright expects them to fail.
 * This hook labels them in the report with the defect ID, so an "expected failure" is
 * never mistaken for a pass and can be traced to docs/API_DEFECTS.md.
 */
Before(async ({ $tags, $testInfo }) => {
  for (const tag of $tags) {
    const defectId = DEFECT_TAG.exec(tag)?.[1];
    if (!defectId) continue;
    const note = `${defectId}: expected to fail until fixed. See docs/API_DEFECTS.md#${defectId.toLowerCase()}`;
    // Annotation: shown in the Playwright HTML report.
    $testInfo.annotations.push({ type: 'known defect', description: note });
    // Attachment: also shown in the Cucumber report, which has no "expected to fail"
    // status and lists these scenarios as failed.
    await $testInfo.attach('KNOWN DEFECT: this failure is expected', {
      body: note,
      contentType: 'text/plain',
    });
  }
});
