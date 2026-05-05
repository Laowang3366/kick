export type CampaignResultAnswerReview = {
  id: string;
  title: string;
  explanation: string;
  isCorrect: boolean;
  questionType: string;
  correctAnswer: unknown;
  gradingDetail: any;
  hasGradingRules: boolean;
};

export function getCampaignResultAnswerReviews(record: any): CampaignResultAnswerReview[] {
  const answers = Array.isArray(record?.answers) ? record.answers : [];
  return answers.map((answer: any, index: number) => {
    const gradingRules = answer?.gradingDetail?.ruleResults;
    return {
      id: String(answer?.id || answer?.questionId || index),
      title: answer?.questionTitle || `题目 ${index + 1}`,
      explanation: answer?.questionExplanation || answer?.analysis || "",
      isCorrect: Boolean(answer?.isCorrect),
      questionType: answer?.questionType || "",
      correctAnswer: answer?.correctAnswer,
      gradingDetail: answer?.gradingDetail || null,
      hasGradingRules: Array.isArray(gradingRules) && gradingRules.length > 0,
    };
  });
}
