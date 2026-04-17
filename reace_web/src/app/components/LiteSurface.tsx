import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "./ui/utils";

type LitePageFrameProps = {
  children: ReactNode;
  className?: string;
};

type LiteHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  accentClassName?: string;
};

type LiteSectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function LitePageFrame({ children, className }: LitePageFrameProps) {
  return (
    <div className={cn("relative mx-auto max-w-[1360px] px-4 py-5 sm:px-6 sm:py-6", className)}>
      <div className="pointer-events-none absolute inset-x-4 top-0 -z-10 h-[320px] rounded-[40px] bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0))] blur-2xl sm:inset-x-6" />
      <div className="space-y-6 sm:space-y-7">{children}</div>
    </div>
  );
}

export function LiteHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
  accentClassName,
}: LiteHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-[36px] border border-white/55 bg-[linear-gradient(135deg,#071d2b_0%,#0f766e_42%,#15b8a6_100%)] px-6 py-7 text-white shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_24%)]" />
      <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-slate-950/16 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-end">
        <div className="max-w-3xl">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-[12px] font-black tracking-[0.18em] text-white/86 backdrop-blur-sm",
              accentClassName
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" />
            {eyebrow}
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl sm:leading-[1.02]">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/82 sm:text-[17px]">
            {description}
          </p>
          {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </motion.section>
  );
}

export function LiteSectionTitle({
  eyebrow,
  title,
  description,
  action,
  className,
}: LiteSectionTitleProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow ? (
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-teal-600/90">{eyebrow}</div>
        ) : null}
        <h2 className="mt-2 text-[26px] font-black tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function LitePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-white/65 bg-white/84 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
