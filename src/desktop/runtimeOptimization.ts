type RuntimeApp = {
  disableHardwareAcceleration(): void;
  commandLine: {
    appendSwitch(name: string): void;
  };
};

export function applyLightweightRuntime(app: RuntimeApp, platform: NodeJS.Platform = process.platform) {
  if (platform === 'darwin') {
    return;
  }
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}
