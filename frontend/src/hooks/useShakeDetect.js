/**
 * useShakeDetect — multi-shake crash detector
 * Fires only when 3+ strong acceleration spikes occur within 2.5 seconds.
 * Prevents false triggers from speed bumps or single drops.
 */
import { useEffect, useRef, useCallback } from "react";

const THRESHOLD   = 18;    // m/s² combined delta to count as one "shake"
const REQUIRED    = 3;     // minimum shakes needed to trigger
const TIME_WINDOW = 2500;  // ms — all REQUIRED shakes must occur within this window
const COOLDOWN    = 10000; // ms — minimum gap between two triggers

export function useShakeDetect(onShake) {
  const prevAccel   = useRef({ x: 0, y: 0, z: 0 });
  const shakeLog    = useRef([]); // timestamps of qualifying acceleration spikes
  const lastTrigger = useRef(0);

  const handleMotion = useCallback((e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null) return;

    const { x, y, z } = acc;
    const dx    = Math.abs(x - prevAccel.current.x);
    const dy    = Math.abs(y - prevAccel.current.y);
    const dz    = Math.abs(z - prevAccel.current.z);
    const delta = dx + dy + dz;

    prevAccel.current = { x, y, z };

    const now = Date.now();

    if (delta > THRESHOLD) {
      shakeLog.current.push(now);
      // Prune entries outside the rolling window
      shakeLog.current = shakeLog.current.filter(t => now - t <= TIME_WINDOW);

      if (
        shakeLog.current.length >= REQUIRED &&
        now - lastTrigger.current > COOLDOWN
      ) {
        lastTrigger.current = now;
        shakeLog.current    = [];
        onShake?.();
      }
    }
  }, [onShake]);

  useEffect(() => {
    // iOS 13+ requires DeviceMotion permission
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      // Permission is requested on first user gesture — handled by iOS browser
    }
    window.addEventListener("devicemotion", handleMotion, { passive: true });
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [handleMotion]);
}