import { describe, expect, it, vi } from 'vitest';
import { configureAutoUpdates } from './autoUpdate';

describe('auto update channel', () => {
  it('does not check for updates outside packaged production runs', () => {
    const updater = createUpdater();
    const schedule = vi.fn();

    expect(
      configureAutoUpdates({
        isPackaged: false,
        isSmokeTest: false,
        updater,
        schedule
      })
    ).toBe(false);

    expect(schedule).not.toHaveBeenCalled();
    expect(updater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
  });

  it('does not check for updates during smoke tests', () => {
    const updater = createUpdater();
    const schedule = vi.fn();

    expect(
      configureAutoUpdates({
        isPackaged: true,
        isSmokeTest: true,
        updater,
        schedule
      })
    ).toBe(false);

    expect(schedule).not.toHaveBeenCalled();
  });

  it('enables automatic download and schedules a packaged update check', () => {
    const updater = createUpdater();
    const schedule = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });

    expect(
      configureAutoUpdates({
        isPackaged: true,
        isSmokeTest: false,
        updater,
        schedule
      })
    ).toBe(true);

    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(updater.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 8000);
    expect(updater.checkForUpdatesAndNotify).toHaveBeenCalledOnce();
  });
});

function createUpdater() {
  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    checkForUpdatesAndNotify: vi.fn().mockResolvedValue(undefined),
    on: vi.fn()
  };
}
