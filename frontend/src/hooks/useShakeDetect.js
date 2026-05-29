/**
 * useShakeDetect — detects crash-like device acceleration
 * Uses DeviceMotionEvent API (works on mobile browsers)
 * THRESHOLD: 22 m/s² — calibrated for crash impact, not normal bumps
 * COOLDOWN:  5000ms  — prevents re-triggering
 */
import { useEffect, useRef, useCallback } from "react";

const THRESHOLD = 22;   // m/s² combined delta — crash-like
const COOLDOWN  = 5000; // ms between triggers

export function useShakeDetect(onShake) {
  const lastTriggered = useRef(0);
  const prevAccel     = useRef({ x: 0, y: 0, z: 0 });

  const handleMotion = useCallback(
    (e) => {
      const accel = e.accelerationIncludingGravity;
      if (!accel || accel.x == null) return;

      const { x, y, z } = accel;
      const dx = Math.abs(x - prevAccel.current.x);
      const dy = Math.abs(y - prevAccel.current.y);
      const dz = Math.abs(z - prevAccel.current.z);
      const delta = dx + dy + dz;

      prevAccel.current = { x, y, z };

      const now = Date.now();
      if (delta > THRESHOLD && now - lastTriggered.current > COOLDOWN) {
        lastTriggered.current = now;
        onShake?.();
      }
    },
    [onShake]
  );

  useEffect(() => {
    // iOS 13+ requires permission
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      // Permission will be requested on first user interaction
      // Attach anyway — will silently fail until granted
    }
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [handleMotion]);
}