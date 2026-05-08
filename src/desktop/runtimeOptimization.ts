type RuntimeApp = {
  disableHardwareAcceleration(): void;
  commandLine: {
    appendSwitch(name: string): void;
  };
};

export function applyLightweightRuntime(app: RuntimeApp) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}
