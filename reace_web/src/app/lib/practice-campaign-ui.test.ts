import { describe, expect, it } from "vitest";
import {
  canExpandChapterQuestions,
  getCampaignLevelStatusLabel,
  getChapterQuestionToggleLabel,
} from "./practice-campaign-ui";

describe("practice campaign UI helpers", () => {
  it("labels the collapsed and expanded chapter question list action", () => {
    expect(getChapterQuestionToggleLabel({ isExpanded: false, isUnlocked: true })).toBe("题目列表");
    expect(getChapterQuestionToggleLabel({ isExpanded: true, isUnlocked: true })).toBe("收起题目");
  });

  it("does not expose the question list action for locked chapters", () => {
    expect(canExpandChapterQuestions({ unlocked: false })).toBe(false);
    expect(getChapterQuestionToggleLabel({ isExpanded: false, isUnlocked: false })).toBe("等待解锁");
  });

  it("normalizes campaign level status labels", () => {
    expect(getCampaignLevelStatusLabel("locked")).toBe("未解锁");
    expect(getCampaignLevelStatusLabel("perfect")).toBe("满星");
    expect(getCampaignLevelStatusLabel("cleared")).toBe("已通关");
    expect(getCampaignLevelStatusLabel("ready")).toBe("可挑战");
  });
});
