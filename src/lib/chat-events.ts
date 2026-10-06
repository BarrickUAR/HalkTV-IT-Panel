import { EventEmitter } from "node:events";
const globalEvents = globalThis as typeof globalThis & { halktvChatEvents?: EventEmitter };
const events = globalEvents.halktvChatEvents ??= new EventEmitter();
events.setMaxListeners(0);
export type ChatEvent = {
  kind: "message" | "read" | "typing" | "notification" | "device-chat";
  partnerId?: string;
  computerId?: string;
};
export function publishChatEvent(userId: string, event: ChatEvent) { events.emit(userId, event); }
export function subscribeChatEvents(userId: string, listener: (event: ChatEvent) => void) {
  events.on(userId, listener);
  return () => { events.off(userId, listener); };
}
