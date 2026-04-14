package com.excel.forum.service;

import java.util.Map;

public interface PracticeCampaignService {
    Map<String, Object> getCampaignOverview(Long userId);

    Map<String, Object> getCampaignChapters(Long userId);

    Map<String, Object> getCampaignChapterDetail(Long chapterId, Long userId);

    Map<String, Object> getCampaignLevelDetail(Long levelId, Long userId);
}
