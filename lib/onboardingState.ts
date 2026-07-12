import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'BIBLIA_ONBOARDING_DISMISSED';

export async function isOnboardingDismissed(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function dismissOnboarding(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
}
