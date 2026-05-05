import { toast } from "sonner";
import { isLoginRequiredError } from "./auth-errors";

export function showLoginRequiredToast(message = "请先登录后继续操作") {
  toast.info(message, {
    action: {
      label: "去登录",
      onClick: () => {
        window.location.assign("/auth");
      },
    },
  });
}

export function handleLoginRequiredError(error: unknown, message?: string) {
  if (!isLoginRequiredError(error)) return false;
  showLoginRequiredToast(message);
  return true;
}
