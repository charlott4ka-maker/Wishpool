// Replay the onboarding from Settings (like "Onboarding" in the Mini App's profile).

import { useRouter } from "expo-router";

import { Onboarding } from "../components/onboarding/Onboarding";

export default function OnboardingReplay() {
  const router = useRouter();
  return <Onboarding onDone={() => router.back()} />;
}
