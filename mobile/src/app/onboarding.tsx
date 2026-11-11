// Replay the onboarding from Settings (like "Onboarding" in the Mini App's profile).

import { useRouter } from "expo-router";

import { Onboarding } from "../components/onboarding/Onboarding";
import { useAccent } from "../theme/accent";

export default function OnboardingReplay() {
  useAccent(); // re-render in place when the app colour changes
  const router = useRouter();
  return <Onboarding onDone={() => router.back()} />;
}
