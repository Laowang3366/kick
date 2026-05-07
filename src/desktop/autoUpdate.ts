import { app } from 'electron';
import electronUpdater from 'electron-updater';

type AutoUpdaterLike = {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdatesAndNotify(): Promise<unknown>;
  on(eventName: 'error', listener: (error: Error) => void): unknown;
};

type ConfigureAutoUpdatesOptions = {
  isPackaged: boolean;
  isSmokeTest: boolean;
  updater: AutoUpdaterLike;
  schedule: (callback: () => void, delayMs: number) => unknown;
  logger?: Pick<Console, 'warn'>;
};

const updateCheckDelayMs = 8000;

export function configureAutoUpdates(options: ConfigureAutoUpdatesOptions): boolean {
  if (!options.isPackaged || options.isSmokeTest) {
    return false;
  }

  options.updater.autoDownload = true;
  options.updater.autoInstallOnAppQuit = true;
  options.updater.on('error', (error) => {
    options.logger?.warn(`[自动更新] 检查失败：${error.message}`);
  });

  options.schedule(() => {
    void options.updater.checkForUpdatesAndNotify().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      options.logger?.warn(`[自动更新] 检查失败：${message}`);
    });
  }, updateCheckDelayMs);

  return true;
}

export function startAutoUpdates(isSmokeTest: boolean) {
  const { autoUpdater } = electronUpdater;

  return configureAutoUpdates({
    isPackaged: app.isPackaged,
    isSmokeTest,
    updater: autoUpdater,
    schedule: setTimeout,
    logger: console
  });
}
