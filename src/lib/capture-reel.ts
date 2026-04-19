/**
 * Capture a DOM-rendered Remotion <Player> as a webm/mp4 video.
 * Uses MediaRecorder with html2canvas-style frame painting via OffscreenCanvas.
 * For our purposes we capture the player container at its native size by
 * drawing each animation frame to a hidden canvas, then encoding via
 * MediaRecorder. Audio is captured by routing the audio element through
 * an AudioContext destination stream.
 *
 * NOTE: This is a client-side capture of the live <Player>. Quality matches
 * what you see on screen at the chosen scale. For higher fidelity we'd need
 * a server-side Remotion render which is not available on Workers.
 */

export interface CaptureOptions {
  player: HTMLElement;     // container that holds the <Player>
  audio: HTMLAudioElement; // the audio playing alongside the player
  durationMs: number;
  fps?: number;
  onProgress?: (frac: number) => void;
}

export async function captureReel({ player, audio, durationMs, fps = 30, onProgress }: CaptureOptions): Promise<Blob> {
  // Find the underlying canvas/video that Remotion renders into.
  // Remotion's player wraps everything in a div with style. We capture the
  // first inner element via html-to-image style drawWindow approach using
  // an OffscreenCanvas + drawImage of the player's own elements.
  // The most reliable approach: use html2canvas-equivalent — but to keep
  // dependencies minimal, we use the experimental getDisplayMedia for
  // tab capture if available. Fallback: leverage the <video>/<canvas>
  // elements Remotion already creates.

  // Strategy: Use captureStream on the first <video> or <canvas> Remotion
  // creates inside the player. If it doesn't exist, fall back to display
  // media capture.

  const canvas = player.querySelector("canvas") as HTMLCanvasElement | null;
  const video = player.querySelector("video") as HTMLVideoElement | null;

  let videoStream: MediaStream | null = null;
  if (canvas && (canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream) {
    videoStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(fps);
  } else if (video && (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream) {
    videoStream = (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
  }

  // Audio stream from the audio element
  const ac = new AudioContext();
  const src = ac.createMediaElementSource(audio);
  const dest = ac.createMediaStreamDestination();
  src.connect(dest);
  src.connect(ac.destination); // also play through speakers

  if (!videoStream) {
    // Fallback to tab capture (user-prompted)
    if (!("getDisplayMedia" in navigator.mediaDevices)) {
      throw new Error("Capture not supported in this browser. Try Chrome/Edge.");
    }
    videoStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: fps },
      audio: false,
    });
  }

  const combined = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
    ? "video/webm;codecs=vp8,opus"
    : "video/webm";

  const recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob>((resolve, reject) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const frac = Math.min(1, (Date.now() - start) / durationMs);
      onProgress?.(frac);
      if (frac >= 1) {
        window.clearInterval(timer);
        recorder.stop();
      }
    }, 200);

    recorder.onstop = () => {
      videoStream?.getTracks().forEach((t) => t.stop());
      ac.close();
      resolve(new Blob(chunks, { type: mime }));
    };
    recorder.onerror = (e) => reject(e);

    recorder.start(200);
  });
}
