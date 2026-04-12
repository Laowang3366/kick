package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.MallItem;
import com.excel.forum.entity.MallRedemption;
import com.excel.forum.entity.UserEntitlement;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface UserEntitlementService extends IService<UserEntitlement> {
    String KEY_CHECKIN_MAKEUP_CARD = "checkin_makeup_card";

    UserEntitlement grantForRedemption(Long userId, MallItem item, MallRedemption redemption);
    UserEntitlement activateForRedemption(Long redemptionId);
    void revokeForRedemption(Long redemptionId);
    UserEntitlement getLatestActiveBadge(Long userId);
    Map<Long, UserEntitlement> getLatestActiveBadgeMap(Collection<Long> userIds);
    Map<Long, UserEntitlement> getByRedemptionIds(Collection<Long> redemptionIds);
    List<UserEntitlement> getUserEntitlements(Long userId);
    long countAvailableByKey(Long userId, String entitlementKey);
    UserEntitlement consumeAvailableByKey(Long userId, String entitlementKey);
    UserEntitlement equipBadge(Long userId, Long entitlementId);
    void unequipBadge(Long userId, Long entitlementId);
}
