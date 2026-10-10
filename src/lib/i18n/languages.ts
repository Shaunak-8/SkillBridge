export interface Language {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN' },
];

export const DEFAULT_LANGUAGE = 'en';

export function getLanguage(code: string): Language {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}
