import { readdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportedExtensions = new Set([".mp3", ".m4a", ".ogg", ".wav", ".webm"]);

export async function GET() {
  const musicDir = path.join(process.cwd(), "public", "music");

  try {
    const files = await readdir(musicDir, { withFileTypes: true });
    const tracks = files
      .filter((file) => file.isFile())
      .map((file) => file.name)
      .filter((fileName) => supportedExtensions.has(path.extname(fileName).toLowerCase()))
      .sort((left, right) => left.localeCompare(right, "vi"))
      .map((fileName) => ({
        name: formatTrackName(fileName),
        url: `/music/${encodeURIComponent(fileName)}`,
      }));

    return Response.json({ data: { tracks }, tracks });
  } catch {
    return Response.json({ data: { tracks: [] }, tracks: [] });
  }
}

function formatTrackName(fileName: string) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/\s+/g, " ")
    .trim();
}
