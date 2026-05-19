/**
 * useCamera.ts
 * ------------
 * Handles everything webcam-related:
 *   1. Requesting camera permission (getUserMedia)
 *   2. Streaming to a <video> element
 *   3. Capturing frames from a hidden <canvas> at a fixed FPS
 *   4. Calling onFrame(blob) with each JPEG frame
 *
 * React concepts:
 *   - useRef: holds DOM elements (videoRef, canvasRef) and
 *     mutable values (intervalRef) without causing re-renders
 *   - useCallback: stable function reference so the caller's
 *     useEffect doesn't re-run unnecessarily
 *   - The onFrame prop could become stale inside setInterval,
 *     so we store it in a ref and read the latest version each tick.
 */

import { useRef, useState, useEffect, useCallback } from 'react'

// Capture rate is now a ceiling — back-pressure in useWebSocket means
// the effective rate equals 1 / (server_round_trip), which is the
// minimum achievable latency regardless of this value.
const CAPTURE_FPS    = 15   // poll fast so we catch the server's reply quickly
const JPEG_QUALITY   = 0.65 // 0.65 → ~30% smaller than 0.7, no visible quality loss for landmark detection
const VIDEO_WIDTH    = 640
const VIDEO_HEIGHT   = 480

export function useCamera(onFrame: (blob: Blob) => void) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const intervalRef   = useRef<number | null>(null)
  const onFrameRef    = useRef(onFrame)           // always holds the latest onFrame
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Keep onFrameRef in sync without restarting the camera
  useEffect(() => { onFrameRef.current = onFrame }, [onFrame])

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: VIDEO_WIDTH },
          height:     { ideal: VIDEO_HEIGHT },
          facingMode: 'user',   // front camera
        },
        audio: false,
      })

      const video = videoRef.current
      if (!video) return

      video.srcObject = stream
      await video.play()
      setIsStreaming(true)

      // Capture loop — runs every 1000/FPS ms
      intervalRef.current = window.setInterval(() => {
        const v = videoRef.current
        const c = canvasRef.current
        if (!v || !c || v.readyState < 2) return   // video not ready yet

        const ctx = c.getContext('2d')
        if (!ctx) return

        // Mirror the image horizontally (feels natural, like a mirror)
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(v, -c.width, 0, c.width, c.height)
        ctx.restore()

        // Encode canvas as JPEG blob and send
        c.toBlob(blob => { if (blob) onFrameRef.current(blob) }, 'image/jpeg', JPEG_QUALITY)
      }, 1000 / CAPTURE_FPS)

    } catch (err) {
      setError('Camera access denied. Please allow camera permissions and refresh.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    const video = videoRef.current
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      video.srcObject = null
    }
    setIsStreaming(false)
  }, [])

  // Stop camera when the component unmounts
  useEffect(() => () => stopCamera(), [stopCamera])

  return { videoRef, canvasRef, isStreaming, error, startCamera, stopCamera }
}
