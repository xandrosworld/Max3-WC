"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Music } from "lucide-react";
import { usePathname } from "next/navigation";

type Track = {
  name: string;
  url: string;
};

const STORAGE_KEY = "wc2026_music_pref";
const MUSIC_ENDPOINT = "/api/music";

function shuffleTracks(tracks: Track[]) {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function BackgroundMusic() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  const lastTrackUrlRef = useRef("");
  const hasTriedAutoPlay = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const refillQueue = useCallback(() => {
    const tracks = tracksRef.current;
    if (tracks.length === 0) return;

    const nextQueue = shuffleTracks(tracks);
    if (nextQueue.length > 1 && nextQueue[0]?.url === lastTrackUrlRef.current) {
      const swapIndex = nextQueue.findIndex(
        (track) => track.url !== lastTrackUrlRef.current,
      );
      if (swapIndex > 0) {
        [nextQueue[0], nextQueue[swapIndex]] = [
          nextQueue[swapIndex],
          nextQueue[0],
        ];
      }
    }

    queueRef.current = nextQueue;
  }, []);

  const takeNextTrack = useCallback(() => {
    if (tracksRef.current.length === 0) return null;
    if (queueRef.current.length === 0) refillQueue();
    return queueRef.current.shift() ?? null;
  }, [refillQueue]);

  const playTrack = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio) return Promise.resolve();

    lastTrackUrlRef.current = track.url;
    audio.src = track.url;
    audio.load();

    return audio
      .play()
      .then(() => {
        setPlaying(true);
      })
      .catch((error) => {
        setPlaying(false);
        throw error;
      });
  }, []);

  const playNext = useCallback(() => {
    const track = takeNextTrack();
    if (!track) return Promise.resolve();
    return playTrack(track);
  }, [playTrack, takeNextTrack]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  }, []);

  const resume = useCallback(() => {
    void playNext().catch(() => {});
  }, [playNext]);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.35;
    audio.preload = "none";
    audioRef.current = audio;

    const onEnded = () => {
      void playNext().catch(() => {});
    };
    audio.addEventListener("ended", onEnded);

    const events = ["click", "touchstart", "keydown", "pointerdown"];

    function cleanupInteractionListeners() {
      events.forEach((eventName) =>
        document.removeEventListener(eventName, onInteraction),
      );
    }

    function onInteraction() {
      if (hasTriedAutoPlay.current) {
        cleanupInteractionListeners();
        return;
      }
      if (localStorage.getItem(STORAGE_KEY) === "off") {
        cleanupInteractionListeners();
        return;
      }
      if (tracksRef.current.length === 0) return;

      hasTriedAutoPlay.current = true;
      cleanupInteractionListeners();
      audio.pause();

      const freshAudio = new Audio();
      freshAudio.volume = 0.35;
      freshAudio.preload = "none";
      freshAudio.addEventListener("ended", onEnded);
      audioRef.current = freshAudio;

      void playNext().catch(() => {
        hasTriedAutoPlay.current = false;
      });
    }

    if (localStorage.getItem(STORAGE_KEY) !== "off") {
      events.forEach((eventName) =>
        document.addEventListener(eventName, onInteraction, { passive: true }),
      );
    }

    async function fetchTracks() {
      try {
        const response = await fetch(`${MUSIC_ENDPOINT}?v=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const json = (await response.json()) as {
          data?: { tracks?: Track[] };
          tracks?: Track[];
        };
        const rawTracks = json.data?.tracks ?? json.tracks ?? [];
        if (rawTracks.length === 0) return;

        tracksRef.current = rawTracks.map((track) => ({
          ...track,
          url: track.url.replace(/^https?:\/\/[^/]+/, ""),
        }));
        queueRef.current = [];
        setVisible(true);
      } catch {
        // Nhạc nền là trải nghiệm phụ, không chặn app nếu danh sách nhạc lỗi.
      }
    }

    void fetchTracks();

    return () => {
      cleanupInteractionListeners();
      audio.removeEventListener("ended", onEnded);

      const currentAudio = audioRef.current;
      currentAudio?.removeEventListener("ended", onEnded);
      currentAudio?.pause();
      currentAudio?.removeAttribute("src");
      currentAudio?.load();
      audioRef.current = null;
    };
  }, [playNext]);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
      localStorage.setItem(STORAGE_KEY, "off");
    } else {
      resume();
      localStorage.setItem(STORAGE_KEY, "on");
    }
  }, [pause, playing, resume]);

  useEffect(() => {
    const handler = () => toggle();
    window.addEventListener("toggle-music", handler);
    return () => window.removeEventListener("toggle-music", handler);
  }, [toggle]);

  useEffect(() => {
    let ticking = false;

    function updateVisibility() {
      const threshold = Math.max(120, window.innerHeight * 0.2);
      setShowScrollTop(window.scrollY > threshold);
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    }

    updateVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  if (!visible) return null;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/change-password";
  const positionClass = isAuthPage
    ? "right-5 top-5 sm:bottom-6 sm:right-6 sm:top-auto"
    : "bottom-4 right-4 sm:bottom-6 sm:right-6";

  return (
    <>
      <style>{`
        @keyframes musicBar {
          0% { height: 3px; }
          100% { height: 14px; }
        }
        @keyframes musicGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(16,185,129,0.18), 0 0 0 0 rgba(16,185,129,0.14); }
          50% { box-shadow: 0 0 16px rgba(16,185,129,0.34), 0 0 0 5px rgba(16,185,129,0); }
        }
        @keyframes noteFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
      <div className={`fixed z-50 flex flex-col items-end gap-3 ${positionClass}`}>
        {!isAuthPage && showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-emerald-950 shadow-xl shadow-emerald-950/15 ring-1 ring-white/80 transition-all duration-300 hover:scale-105 sm:hidden"
            aria-label="Lên đầu trang"
            title="Lên đầu trang"
          >
            <ArrowUp size={22} strokeWidth={2.7} aria-hidden="true" />
          </button>
        )}
        <button
          id="bg-music-toggle"
          type="button"
          onClick={toggle}
          aria-label={playing ? "Tắt nhạc nền" : "Bật nhạc nền"}
          title={playing ? "Tắt nhạc nền" : "Bật nhạc nền"}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 backdrop-blur-xl transition-all duration-300 hover:scale-105 ${
            playing
              ? "border-emerald-300/70 bg-emerald-950/95 text-emerald-200"
              : "border-amber-300/70 bg-gradient-to-br from-emerald-950 to-slate-950 text-amber-200"
          }`}
          style={{
            animation: playing
              ? "musicGlow 2.5s ease-in-out infinite"
              : "musicGlow 3s ease-in-out infinite",
          }}
        >
          {playing ? (
            <span className="flex h-4 items-end gap-[2.5px]">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className="w-[2.5px] rounded-full bg-gradient-to-t from-emerald-500 to-amber-200"
                  style={{
                    animation: `musicBar 0.5s ease-in-out ${
                      index * 0.1
                    }s infinite alternate`,
                  }}
                />
              ))}
            </span>
          ) : (
            <Music
              size={20}
              aria-hidden="true"
              style={{ animation: "noteFloat 2s ease-in-out infinite" }}
            />
          )}
        </button>
      </div>
    </>
  );
}
