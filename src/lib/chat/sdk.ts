'use client';
import { CometChatUIKit, UIKitSettingsBuilder } from '@cometchat/chat-uikit-react';
import { publicChatConfig } from './config';
import { chatGeneration, registerChatCleanup } from './lifecycle';
import type { ChatSession } from './policy';
let initialized: Promise<unknown> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let currentToken: string | null = null;
function serialize<T>(operation: () => Promise<T>) { const next = queue.catch(() => undefined).then(operation); queue = next; return next; }
registerChatCleanup(() => serialize(async () => { currentToken = null; if (CometChatUIKit.isInitialized()) await CometChatUIKit.logout(); }));
export function loginChat(session: ChatSession) {
  const generation = chatGeneration();
  return serialize(async () => {
    const config = publicChatConfig();
    if (!config) throw new Error('Messaging is not configured for this environment.');
    if (!initialized) initialized = CometChatUIKit.init(new UIKitSettingsBuilder().setAppId(config.appId).setRegion(config.region)
      .subscribePresenceForFriends().setCallingEnabled(false).build()).catch(error => { initialized = null; throw error; });
    await initialized;
    if (generation !== chatGeneration()) throw new Error('Messaging session changed.');
    const existing = CometChatUIKit.getLoggedInUser();
    if (existing?.getUid() === session.uid && currentToken === session.authToken) return existing;
    if (existing) await CometChatUIKit.logout();
    const user = await CometChatUIKit.loginWithAuthToken(session.authToken);
    if (generation !== chatGeneration() || user.getUid() !== session.uid) { await CometChatUIKit.logout(); throw new Error('Messaging session changed.'); }
    currentToken = session.authToken;
    return user;
  });
}
