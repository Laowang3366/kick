import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8080";
const username = __ENV.K6_USERNAME || "admin";
const password = __ENV.K6_PASSWORD || "admin123";

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

  return response.json("token");
}

export default function () {
  const token = login();
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const responses = [
    http.get(`${baseUrl}/api/notifications/unread-count`, params),
    http.get(`${baseUrl}/api/messages/unread-count`, params),
    http.get(`${baseUrl}/api/mall/overview`, params),
  ];

  for (const res of responses) {
    check(res, {
      "authenticated status is 200": (r) => r.status === 200,
    });
  }

  sleep(1);
}
