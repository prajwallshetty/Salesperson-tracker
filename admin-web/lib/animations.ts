// Centralized Framer Motion variants for admin-web.
//
// Keep animations fast and calm: short durations, small offsets, no bounce.
// Import these instead of writing ad hoc per-component transition configs so
// motion stays consistent across the app. See `useReducedMotion` in
// `lib/use-reduced-motion.ts` for the prefers-reduced-motion fallback.
import type { Transition, Variants } from "framer-motion";

export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];

/** Page-level entrance: fade + 6px upward movement, ~220ms. */
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

/** Slightly larger upward move for cards/sections, ~220ms. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

/** Subtle scale-in, used for cards/tiles that pop into place. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } },
};

/** Modal/dialog content: fade + scale 0.98 -> 1 + slight upward move. */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12, ease: EASE_OUT } },
};

/** Drawer/sheet sliding from the right (default). Fast, ~250ms. */
export const drawerVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { opacity: 0, x: 24, transition: { duration: 0.18, ease: EASE_OUT } },
};

/**
 * Container for staggered children. Pass `count` so the per-child stagger
 * step shrinks for longer first pages — the whole cascade never takes longer
 * than roughly `staggerContainer` amount of time regardless of item count.
 * Callers must also slice the list to the first page themselves; this only
 * bounds the *timing*, not how many DOM nodes get animated.
 */
export const staggerContainer = (count: number, totalMs = 0.24): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: count > 1 ? totalMs / count : 0,
      when: "beforeChildren",
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
};

/** Card hover: scale 1 -> 1.01 with a shadow increase, no bounce. */
export const cardHover = {
  whileHover: { scale: 1.01, transition: { duration: 0.15, ease: EASE_OUT } },
  whileTap: { scale: 0.995 },
};

/** Button press: extremely subtle scale down/up. */
export const buttonTap = { scale: 0.98 };

/**
 * Strips transforms (x/y/scale) from a variants object, leaving only
 * opacity — pair with `useReducedMotion()` so motion-sensitive users get a
 * plain fade instead of movement/scaling.
 */
export function fadeOnly(variants: Variants): Variants {
  const strip = (v: Variants[string]) => {
    if (typeof v !== "object" || v === null) return v;
    const rest = { ...(v as Record<string, unknown>) };
    delete rest.x;
    delete rest.y;
    delete rest.scale;
    return rest;
  };
  return Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, strip(v)])) as Variants;
}

/** Maximum per-item delay for a staggered first page of list/card items. */
export const MAX_STAGGER_ITEMS = 8;
export const STAGGER_STEP_SEC = 0.03;

/** Delay (seconds) for the nth item in a capped stagger, clamped so a long
 * first page never produces a sluggish cascade. */
export function staggerDelay(index: number, step = STAGGER_STEP_SEC, max = MAX_STAGGER_ITEMS) {
  return Math.min(index, max) * step;
}
