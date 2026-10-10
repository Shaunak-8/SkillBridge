/** Public configuration only. Never import the server REST key here. */
export function chatEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true';
}
export function publicChatConfig() {
  const appId = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID?.trim();
  const region = process.env.NEXT_PUBLIC_COMETCHAT_REGION?.trim().toLowerCase();
  return chatEnabled() && appId && /^[a-z0-9]+$/i.test(appId) && region && ['in', 'us', 'eu'].includes(region)
    ? { appId, region } : null;
}
