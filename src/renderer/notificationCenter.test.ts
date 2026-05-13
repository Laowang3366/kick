import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchClientNotifications,
  getNotificationSeverityLabel,
  loadDismissedNotificationIds,
  markNotificationDismissed
} from './notificationCenter';

describe('notificationCenter', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('fetches and normalizes public client notifications', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          notifications: [
            {
              id: 'notice-1',
              title: '更新公告',
              body: '请前往官网下载最新版本安装更新。',
              severity: 'update',
              platforms: ['windows', 'android'],
              dismissible: true,
              actionLabel: '前往官网',
              actionUrl: 'https://sg.lwvpscc.top'
            }
          ]
        })
    });

    const notifications = await fetchClientNotifications({
      baseUrl: 'https://api.example.com/',
      fetcher,
      platform: 'android',
      version: '0.1.94'
    });

    expect(fetcher).toHaveBeenCalledWith('https://api.example.com/api/notifications?platform=android&version=0.1.94');
    expect(notifications[0]).toMatchObject({
      id: 'notice-1',
      title: '更新公告',
      severity: 'update',
      actionLabel: '前往官网'
    });
    expect(getNotificationSeverityLabel(notifications[0].severity)).toBe('更新公告');
  });

  it('stores dismissed notification ids locally', () => {
    markNotificationDismissed('notice-1');
    markNotificationDismissed('notice-1');
    markNotificationDismissed('notice-2');

    expect(loadDismissedNotificationIds()).toEqual(['notice-1', 'notice-2']);
  });
});
