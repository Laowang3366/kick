package com.excel.forum.service;

import java.util.Map;

public interface CheckinService {
    Map<String, Object> getCheckinStatus(Long userId, String month);

    Map<String, Object> performCheckin(Long userId);

    Map<String, Object> performMakeupCheckin(Long userId);
}
