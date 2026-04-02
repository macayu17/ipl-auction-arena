"use client";

import { useEffect, useState } from "react";

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getRemainingSeconds(
  seconds: number,
  timerActive: boolean,
  updatedAt: string,
  now = Date.now()
) {
  if (!timerActive) {
    return seconds;
  }

  const elapsedSeconds = Math.floor(
    (now - new Date(updatedAt).getTime()) / 1000
  );

  return Math.max(seconds - elapsedSeconds, 0);
}

export function TimerDisplay({
  seconds,
  timerActive,
  updatedAt,
}: {
  seconds: number;
  timerActive: boolean;
  updatedAt: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timerActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timerActive]);

  return (
    <>
      {formatClock(getRemainingSeconds(seconds, timerActive, updatedAt, now))}
    </>
  );
}
