// Centralized Framer Motion variants for the field app.
//
// Design intent: fast, calm, mobile-appropriate motion. No bouncing, no slow transitions,
// no continuous/looping animation outside of small functional indicators (e.g. the GPS
// tracking dot's pulse ring, which stays in tailwind.config.js since it's a plain CSS
// keyframe, not Framer Motion).
//
// Reduced motion: components using these variants don't need to check
// prefers-reduced-motion individually — <Providers> wraps the app in Framer Motion's
// <MotionConfig reducedMotion="user"> (see app/providers.tsx), which automatically
// disables transform/animation on every `motion.*` element for users who have the OS-level
// "reduce motion" setting on, while still allowing opacity changes. Plain CSS animations
// (like pulseRing) are separately guarded in globals.css.

import type { Transition, Variants } from "framer-motion";

/** Standard fast/calm easing + duration for one-off UI transitions. */
export const FAST_TRANSITION: Transition = { duration: 0.2, ease: "easeOut" };

/** Page entrance: fade + 6px up, ~200ms. Apply to a page's outermost wrapper. */
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: FAST_TRANSITION },
};

/** Slightly larger rise for hero/card elements that want more presence than fadeIn. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

/** Pop-in for small elements (icons, badges, modals content). */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: "easeOut" } },
};

/** Bottom sheet / full-screen mobile sheet slide-in, ~250ms. For custom (non-vaul) sheets —
 *  the shadcn Drawer (vaul) and Sheet (Radix Dialog) primitives already animate via their
 *  own CSS data-state transitions; use this only for a bespoke motion.div sheet. */
export const sheetSlide: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } },
  exit: { y: "100%", transition: { duration: 0.2, ease: "easeIn" } },
};

/** Button press feedback: scale down slightly then back. Most buttons get this for free via
 *  the `active:scale-[0.98]` Tailwind utility already on the shared <Button>; this variant is
 *  for custom pressable elements (e.g. cards, menu rows) built with motion.* directly. */
export const pressScale = {
  whileTap: { scale: 0.98 },
  transition: { duration: 0.12, ease: "easeOut" },
};

/**
 * List entrance stagger. Apply `listContainer` to the <ul>/<div> wrapper and `listItem` to
 * each row. Only pass this to the FIRST visible batch of items (e.g. `.slice(0, 8)` or
 * `index < 8 ? variants : undefined`) — never a whole long list, which would delay rendering
 * and feel sluggish while scrolling through dozens/hundreds of rows.
 */
export const listContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.03 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
};

/** Max number of list items to animate-in with stagger; the rest render immediately. */
export const STAGGER_LIMIT = 8;
