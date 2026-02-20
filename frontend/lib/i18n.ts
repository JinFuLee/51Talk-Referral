import { analysisAPI } from './api';

type Translations = Record<string, string>;
const cache: Record<string, Translations> = {};

export async function loadTranslations(lang: string): Promise<Translations> {
  if (cache[lang]) return cache[lang];
  try {
    // analysisAPI lives in api.ts; i18n endpoint is separate
    const res = await fetch(`/api/i18n/${lang}`);
    if (!res.ok) return {};
    const data = await res.json() as Translations;
    cache[lang] = data;
    return cache[lang];
  } catch {
    return {};
  }
}

export function t(translations: Translations, key: string, fallback?: string): string {
  return translations[key] || fallback || key;
}

// Avoid unused import warning
void analysisAPI;
