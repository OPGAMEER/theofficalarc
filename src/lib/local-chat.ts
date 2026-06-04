import { createCoachReply } from "@/lib/arc-engine";

type Msg = { role: "user" | "assistant"; content: string };

export function localChatReply(messages: Msg[]): string {
  return createCoachReply(messages);
}

// Always returns a local answer so chat never fails when remote AI is unavailable.
export async function chatReplyPreferGroq(messages: Msg[]): Promise<string> {
  return localChatReply(messages);
}

