// AI configuration for Grooved AI.
//
// The API key is read from EXPO_PUBLIC_CLAUDE_API_KEY in the .env file.
// Expo requirement: env vars must be prefixed EXPO_PUBLIC_ to survive the
// Metro bundler. Variables without that prefix are stripped at build time.
//
// Setup:
//   1. Copy .env.example to .env
//   2. Replace the placeholder with your real Anthropic API key
//   3. Restart the Expo dev server (env vars are baked in at bundle time)

export const AI_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '',
  model: 'claude-opus-4-5',
  baseUrl: 'https://api.anthropic.com/v1/messages',
  maxTokens: {
    practicePlan: 4000,
    roundDebrief: 1000,
    dailyInsight: 150,
    coachChat: 800,
  },
};

export const hasValidApiKey = (): boolean => {
  return !!(
    process.env.EXPO_PUBLIC_CLAUDE_API_KEY &&
    process.env.EXPO_PUBLIC_CLAUDE_API_KEY.length > 10
  );
};

// Debug helper — call once at startup to verify the key is loaded.
export function logApiKeyStatus(): void {
  console.log('[AI] API key present:', hasValidApiKey());
  console.log('[AI] Key length:', process.env.EXPO_PUBLIC_CLAUDE_API_KEY?.length ?? 0);
}

// Legacy alias so existing imports don't break while we migrate callers.
export const envApiKey: string = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '';
