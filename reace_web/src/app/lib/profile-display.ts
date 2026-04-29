export type ProfileEntryCard = {
  key: "details" | "growth";
  eyebrow: string;
  title: string;
  description: string;
};

export function shouldRenderProfileAccountCard() {
  return false;
}

export function shouldRenderProfileHeaderDescription() {
  return false;
}

export function getProfileIdentityLayoutClassName() {
  return "flex flex-row items-center gap-4";
}

export function getProfileLevelPlacement() {
  return "below-name";
}

export function getProfileEntryCards(): ProfileEntryCard[] {
  return [
    {
      key: "details",
      eyebrow: "个人资料",
      title: "查看个人资料",
      description: "注册邮箱、职位、所在地和个人网站集中查看。",
    },
    {
      key: "growth",
      eyebrow: "成长进度",
      title: "成长进度",
      description: "等级、积分、经验和闯关进度集中查看。",
    },
  ];
}
