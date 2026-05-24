// YouTube Music URL → embed URL parser. Persists user's pick.
// Works with any youtube.com / music.youtube.com / youtu.be link.
const KEY = "arc_ytmusic_url";

export function getYtMusicUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) || "";
}
export function setYtMusicUrl(url: string) {
  localStorage.setItem(KEY, url.trim());
}
export function clearYtMusicUrl() {
  localStorage.removeItem(KEY);
}

/**
 * Returns a YouTube embed URL for any YT / YT Music / youtu.be link.
 * Supports videos and playlists (including YT Music playlists like
 * https://music.youtube.com/playlist?list=PLxxxx).
 */
export function toYtMusicEmbed(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();

  // Try to construct URL — accept bare strings too
  let u: URL;
  try {
    u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "");
  const isYT =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtu.be";
  if (!isYT) return null;

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  }

  // playlist?list=... (works for YT Music playlists too)
  const list = u.searchParams.get("list");
  const v = u.searchParams.get("v");

  if (v) {
    return `https://www.youtube.com/embed/${v}${list ? `?list=${list}` : ""}`;
  }
  if (list) {
    return `https://www.youtube.com/embed/videoseries?list=${list}`;
  }

  // /watch_videos?video_ids=... rare
  return null;
}
