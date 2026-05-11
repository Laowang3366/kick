import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(join(process.cwd(), 'src', 'renderer', 'styles.css'), 'utf8');

describe('mobile translate layout styles', () => {
  it('does not reserve space for removed settings summary cards', () => {
    expect(styles).not.toContain('translate-settings-summary');
    expect(styles).toMatch(/\.translate-view\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\);/);
  });

  it('renders the collapsed source panel as a compact input on phone viewports', () => {
    expect(styles).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.source-panel\.mobile-source-collapsed\s*\{[\s\S]*min-height:\s*58px/
    );
    expect(styles).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.source-panel\.mobile-source-collapsed textarea\s*\{[\s\S]*max-height:\s*40px/
    );
  });

  it('supports mobile paste affordance and animated source expansion', () => {
    expect(styles).toMatch(/\.source-panel\s*\{[\s\S]*transition:/);
    expect(styles).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.mobile-paste-button\s*\{[\s\S]*display:\s*inline-flex/
    );
    expect(styles).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.source-panel\.mobile-source-expanded\s*\{[\s\S]*min-height:\s*180px/
    );
  });
});
