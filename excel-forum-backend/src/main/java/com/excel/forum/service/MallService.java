package com.excel.forum.service;

import java.util.Map;

public interface MallService {
    Map<String, Object> getOverview(Long userId);

    Map<String, Object> getItems(String type, Long userId);

    Map<String, Object> getItemTypes();

    Map<String, Object> redeem(Long userId, Long itemId);

    Map<String, Object> getRedemptions(Long userId, Integer page, Integer size);

    Map<String, Object> getAdminOverview();

    Map<String, Object> getAdminItems(Integer page, Integer size, String keyword, String type, Boolean enabled, String stockStatus);

    Map<String, Object> getAdminItemTypes();

    Map<String, Object> createAdminItem(com.excel.forum.entity.MallItem item);

    Map<String, Object> updateAdminItem(Long id, com.excel.forum.entity.MallItem item);

    Map<String, Object> updateAdminItemEnabled(Long id, Boolean enabled);

    void deleteAdminItem(Long id);

    Map<String, Object> createAdminItemType(com.excel.forum.entity.MallItemType itemType);

    Map<String, Object> updateAdminItemType(Long id, com.excel.forum.entity.MallItemType itemType);

    void deleteAdminItemType(Long id);

    Map<String, Object> getAdminRedemptions(Integer page, Integer size, String username, Long itemId, String itemKeyword, String status, String dateFrom, String dateTo);

    Map<String, Object> updateAdminRedemptionStatus(Long id, String status, String remark, Long processedBy);
}
