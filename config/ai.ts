// Reads the Claude API key from the environment.
//
// Expo requirement: env vars must be prefixed EXPO_PUBLIC_ to survive the
// Metro bundler. Variables without that prefix are stripped at build time
// and will always be undefined at runtime.
//
// Usage:
//   import { envApiKey } from '../config/ai';
//   const key = profile.apiKey || envApiKey;   // profile key takes priority
//
// To activate: replace "placeholder" with your real key in .env
// (the file is gitignored — your key will never be committed)

export const envApiKey: string = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '';
