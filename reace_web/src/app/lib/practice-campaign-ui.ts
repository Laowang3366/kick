type ChapterLike = {
  unlocked?: boolean | null;
};

export function canExpandChapterQuestions(chapter: ChapterLike | null | undefined) {
  return Boolean(chapter?.unlocked);
}

export function getChapterQuestionToggleLabel({
  isExpanded,
  isUnlocked,
}: {
  isExpanded: boolean;
  isUnlocked: boolean;
}) {
  if (!isUnlocked) {
    return "等待解锁";
  }
  return isExpanded ? "收起题目" : "题目列表";
}

export function getCampaignLevelStatusLabel(status?: string | null) {
  if (status === "locked") {
    return "未解锁";
  }
  if (status === "perfect") {
    return "满星";
  }
  if (status === "cleared") {
    return "已通关";
  }
  return "可挑战";
}
