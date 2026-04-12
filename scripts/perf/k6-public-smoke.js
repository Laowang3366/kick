import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8080";

export default function () {
  const responses = [
    http.get(`${baseUrl}/api/public/home-overview`),
    http.get(`${baseUrl}/api/posts?page=1&limit=10`),
  ];

  for (const res of responses) {
    check(res, {
      "status is 200": (r) => r.status === 200,
    });
  }

  sleep(1);
}
