import type { Variants } from "framer-motion";

export const marketingEase = [0.22, 1, 0.36, 1] as const;
export const revealTransition = { duration: 0.7, ease: marketingEase } as const;
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { ...revealTransition, when: "beforeChildren", staggerChildren: 0.08 } },
};
export const itemReveal: Variants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: revealTransition } };
