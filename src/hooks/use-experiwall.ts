import { useContext } from "react";
import { ExperiwallContext, type ExperiwallContextValue } from "../provider";

/**
 * Access the Experiwall SDK context.
 * Must be used within an <ExperiwallProvider>.
 */
export function useExperiwall(): ExperiwallContextValue {
  const ctx = useContext(ExperiwallContext);
  if (!ctx) {
    throw new Error("useExperiwall must be used within <ExperiwallProvider>");
  }
  return ctx;
}
