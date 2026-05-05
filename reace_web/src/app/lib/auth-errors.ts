const LOGIN_REQUIRED_MESSAGES = ["未登录", "请先登录", "登录已过期"];

function getMessageFromData(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const message = (data as Record<string, unknown>).message;
  return typeof message === "string" ? message : "";
}

export function isLoginRequiredMessage(message: unknown) {
  if (typeof message !== "string") return false;
  return LOGIN_REQUIRED_MESSAGES.some((item) => message.includes(item));
}

export function isLoginRequiredResponse(status: number, message: unknown, data: unknown) {
  if (status === 401) return true;
  if (status !== 403) return false;
  return isLoginRequiredMessage(message) || isLoginRequiredMessage(getMessageFromData(data));
}

export function isLoginRequiredError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const status = Number((error as Record<string, unknown>).status || 0);
  const message = (error as Record<string, unknown>).message;
  const data = (error as Record<string, unknown>).data;
  return isLoginRequiredResponse(status, message, data);
}
