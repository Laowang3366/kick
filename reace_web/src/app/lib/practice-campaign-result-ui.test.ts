import { describe, expect, it } from "vitest";
import { getCampaignResultAnswerReviews } from "./practice-campaign-result-ui";

describe("campaign result answer reviews", () => {
  it("keeps explanation and grading details from practice record answers", () => {
    const reviews = getCampaignResultAnswerReviews({
      answers: [
        {
          questionTitle: "季度销售合计",
          questionExplanation: "使用 SUM 汇总每行三个月销量。",
          gradingDetail: {
            ruleResults: [
              { label: "答案区域", passed: false, expected: [[6]], actual: [[5]] },
            ],
          },
          correctAnswer: { rangeValues: { "Sheet1!F3": [[6]] } },
          isCorrect: false,
        },
      ],
    });

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      title: "季度销售合计",
      explanation: "使用 SUM 汇总每行三个月销量。",
      hasGradingRules: true,
      isCorrect: false,
    });
  });
});
