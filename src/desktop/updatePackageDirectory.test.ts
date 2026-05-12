import { describe, expect, it, vi } from 'vitest';
import {
  clearUpdatePackageArtifacts,
  getDefaultUpdatePackageDirectory,
  isUpdatePackageArtifact,
  normalizeUpdatePackageDirectoryPath,
  pruneUpdatePackageArtifacts
} from './updatePackageDirectory';

describe('update package directory', () => {
  it('resolves a stable default directory under the user downloads folder', () => {
    expect(getDefaultUpdatePackageDirectory('C:\\Users\\wfq\\Downloads')).toBe('C:\\Users\\wfq\\Downloads\\快捷翻译更新包');
    expect(normalizeUpdatePackageDirectoryPath('  D:\\packages  ', 'C:\\fallback')).toBe('D:\\packages');
    expect(normalizeUpdatePackageDirectoryPath('', 'C:\\fallback')).toBe('C:\\fallback');
  });

  it('only treats update package files as removable artifacts', () => {
    expect(isUpdatePackageArtifact('Quick-Translate-0.1.46.exe')).toBe(true);
    expect(isUpdatePackageArtifact('Quick-Translate-0.1.46.exe.blockmap')).toBe(true);
    expect(isUpdatePackageArtifact('Quick-Translate-latest.exe')).toBe(true);
    expect(isUpdatePackageArtifact('Quick-Translate-Android-0.1.46.apk')).toBe(true);
    expect(isUpdatePackageArtifact('notes.txt')).toBe(false);
    expect(isUpdatePackageArtifact('Quick-Translate-config.json')).toBe(false);
  });

  it('clears only update package artifacts from the configured directory', async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const readdir = vi.fn().mockResolvedValue([
      { name: 'Quick-Translate-0.1.46.exe', isFile: () => true },
      { name: 'Quick-Translate-Android-0.1.46.apk', isFile: () => true },
      { name: 'keep.txt', isFile: () => true },
      { name: 'nested', isFile: () => false }
    ]);
    const rm = vi.fn().mockResolvedValue(undefined);

    await expect(clearUpdatePackageArtifacts('D:\\packages', { mkdir, readdir, rm })).resolves.toEqual({
      directory: 'D:\\packages',
      deletedCount: 2
    });
    expect(mkdir).toHaveBeenCalledWith('D:\\packages', { recursive: true });
    expect(rm).toHaveBeenCalledTimes(2);
    expect(rm).toHaveBeenCalledWith('D:\\packages\\Quick-Translate-0.1.46.exe', { force: true });
    expect(rm).toHaveBeenCalledWith('D:\\packages\\Quick-Translate-Android-0.1.46.apk', { force: true });
  });

  it('prunes package artifacts to the latest two versions while preserving the active installer version', async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const readdir = vi.fn().mockResolvedValue([
      { name: 'Quick-Translate-0.1.70.exe', isFile: () => true },
      { name: 'Quick-Translate-0.1.70.exe.blockmap', isFile: () => true },
      { name: 'Quick-Translate-0.1.69.exe', isFile: () => true },
      { name: 'Quick-Translate-0.1.68.exe', isFile: () => true },
      { name: 'Quick-Translate-0.1.67.exe', isFile: () => true },
      { name: 'notes.txt', isFile: () => true }
    ]);
    const rm = vi.fn().mockResolvedValue(undefined);

    await expect(
      pruneUpdatePackageArtifacts(
        'D:\\packages',
        {
          preservePaths: ['D:\\packages\\Quick-Translate-0.1.68.exe']
        },
        { mkdir, readdir, rm }
      )
    ).resolves.toEqual({
      directory: 'D:\\packages',
      deletedCount: 1
    });

    expect(rm).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledWith('D:\\packages\\Quick-Translate-0.1.67.exe', { force: true });
  });
});
