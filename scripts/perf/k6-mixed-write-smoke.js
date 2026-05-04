import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Counter } from "k6/metrics";

const skippedTemplateDownloads = new Counter("skipped_template_downloads");
const skippedCampaignWrites = new Counter("skipped_campaign_writes");
const skippedPracticeSubmits = new Counter("skipped_practice_submits");

function boolEnv(name, fallback) {
  const value = __ENV[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function intEnv(name, fallback) {
  const value = __ENV[name];
  return value === undefined || value === "" ? fallback : Number.parseInt(value, 10);
}

function strEnv(name, fallback) {
  return __ENV[name] === undefined || __ENV[name] === "" ? fallback : __ENV[name];
}

export const options = {
  vus: intEnv("VUS", 3),
  duration: strEnv("DURATION", "30s"),
  thresholds: {
    http_req_failed: [strEnv("THRESHOLD_HTTP_REQ_FAILED", "rate<0.10")],
    http_req_duration: [strEnv("THRESHOLD_HTTP_REQ_DURATION", "p(95)<1500")],
    checks: [strEnv("THRESHOLD_CHECKS", "rate>0.90")],
  },
};

const baseUrl = strEnv("BASE_URL", "http://localhost:8080");
const username = __ENV.K6_USERNAME;
const password = __ENV.K6_PASSWORD;
const practiceQuestionId = __ENV.K6_PRACTICE_QUESTION_ID;
const campaignLevelId = __ENV.K6_CAMPAIGN_LEVEL_ID;
const templateId = __ENV.K6_TEMPLATE_ID;
const enableCampaignWrite = boolEnv("K6_ENABLE_CAMPAIGN_WRITE", true);
const enableTemplateDownload = boolEnv("K6_ENABLE_TEMPLATE_DOWNLOAD", false);

if (!username || !password) {
  fail("Set K6_USERNAME and K6_PASSWORD for mixed authenticated write-path runs.");
}

function authParams(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}

function login() {
  const response = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ username, password }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(response, {
    "login status is 200": (r) => r.status === 200,
    "login returns token": (r) => Boolean(r.json("token")),
  });
  const token = response.json("token");
  if (!token) {
    fail(`Login failed for ${username}; status=${response.status}`);
  }
  return token;
}

function firstArrayValue(source, paths) {
  for (const path of paths) {
    const value = source.json(path);
    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }
  }
  return null;
}

function discoverPracticeQuestion(token) {
  if (practiceQuestionId) {
    return Number.parseInt(practiceQuestionId, 10);
  }

  const response = http.get(`${baseUrl}/api/practice/question-list`, authParams(token));
  check(response, {
    "practice question list status is 200": (r) => r.status === 200,
  });

  const question = firstArrayValue(response, ["questions", "records"]);
  return question && question.id ? question.id : null;
}

function submitPractice(token, questionId) {
  if (!questionId) {
    skippedPracticeSubmits.add(1);
    return;
  }

  const payload = {
    mode: "k6-smoke",
    durationSeconds: intEnv("K6_PRACTICE_DURATION_SECONDS", 30),
    answers: [
      {
        questionId,
        userAnswer: {},
      },
    ],
  };

  const response = http.post(`${baseUrl}/api/practice/submit`, JSON.stringify(payload), authParams(token));
  check(response, {
    "practice submit status is 200": (r) => r.status === 200,
    "practice submit returns record": (r) => Boolean(r.json("recordId")),
  });
}

function discoverCampaignLevel(token) {
  if (campaignLevelId) {
    return Number.parseInt(campaignLevelId, 10);
  }

  const response = http.get(`${baseUrl}/api/practice/campaign/chapters`, authParams(token));
  check(response, {
    "campaign chapters status is 200": (r) => r.status === 200,
  });

  const chapters = response.json("chapters") || [];
  for (const chapter of chapters) {
    if (!chapter.id || chapter.unlocked === false) {
      continue;
    }
    const detail = http.get(`${baseUrl}/api/practice/campaign/chapters/${chapter.id}`, authParams(token));
    check(detail, {
      "campaign chapter detail status is 200": (r) => r.status === 200,
    });
    for (const level of detail.json("levels") || []) {
      if (level.status === "available" || level.status === "cleared" || level.status === "perfect") {
        return level.id;
      }
    }
  }
  return null;
}

function startAndSubmitCampaign(token, levelId) {
  if (!enableCampaignWrite || !levelId) {
    skippedCampaignWrites.add(1);
    return;
  }

  const params = authParams(token);
  const start = http.post(
    `${baseUrl}/api/practice/campaign/levels/${levelId}/start`,
    JSON.stringify({ attemptType: "k6-smoke" }),
    params
  );
  check(start, {
    "campaign start status is 200": (r) => r.status === 200,
    "campaign start returns attempt": (r) => Boolean(r.json("attemptId")),
  });

  const attemptId = start.json("attemptId");
  if (!attemptId) {
    skippedCampaignWrites.add(1);
    return;
  }

  const submit = http.post(
    `${baseUrl}/api/practice/campaign/levels/${levelId}/submit`,
    JSON.stringify({
      attemptId,
      usedSeconds: intEnv("K6_CAMPAIGN_USED_SECONDS", 45),
      userAnswer: {},
    }),
    params
  );
  check(submit, {
    "campaign submit status is 200": (r) => r.status === 200,
    "campaign submit returns attempt": (r) => Boolean(r.json("attemptId")),
  });
}

function discoverTemplate(token) {
  if (templateId) {
    return Number.parseInt(templateId, 10);
  }

  const response = http.get(`${baseUrl}/api/templates`, authParams(token));
  check(response, {
    "templates status is 200": (r) => r.status === 200,
  });

  const records = response.json("records") || [];
  const freeDownload = records.find((item) => item.hasTemplateFile && Number(item.downloadCostPoints || 0) === 0);
  return freeDownload ? freeDownload.id : null;
}

function downloadTemplate(token, id) {
  if (!enableTemplateDownload || !id) {
    skippedTemplateDownloads.add(1);
    return;
  }

  const response = http.post(`${baseUrl}/api/templates/${id}/download`, null, authParams(token));
  check(response, {
    "template download status is 200": (r) => r.status === 200,
    "template download returns url": (r) => Boolean(r.json("url")),
  });
}

export default function () {
  const token = login();
  const params = authParams(token);

  const readResponses = [
    http.get(`${baseUrl}/api/auth/current`, params),
    http.get(`${baseUrl}/api/practice/history?page=1&size=5`, params),
    http.get(`${baseUrl}/api/practice/campaign/overview`, params),
    http.get(`${baseUrl}/api/templates/records`, params),
  ];

  for (const response of readResponses) {
    check(response, {
      "mixed authenticated read status is 200": (r) => r.status === 200,
    });
  }

  const questionId = discoverPracticeQuestion(token);
  submitPractice(token, questionId);

  const levelId = discoverCampaignLevel(token);
  startAndSubmitCampaign(token, levelId);

  const downloadTemplateId = discoverTemplate(token);
  downloadTemplate(token, downloadTemplateId);

  sleep(intEnv("SLEEP_SECONDS", 1));
}
