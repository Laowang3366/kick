import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(join(process.cwd(), 'src', 'renderer', 'styles.css'), 'utf8');

describe('mobile translate layout styles', () => {
  it('hides the settings summary cards on phone viewports', () => {
    expect(styles).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.translate-settings-summary\s*\{[\s\S]*display:\s*none;/
    );
  });

  it('renders the collapsed source panel as a compact input on phone viewports', () => {
    expect(styles).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.source-panel\.mobile-source-collapsed\s*\{[\s\S]*min-height:\s*58px/
    );
    expect(styles).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.source-panel\.mobile-source-collapsed textarea\s*\{[\s\S]*max-height:\s*40px/
    );
  });
});
