"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Fireworks } from "fireworks-js";

import { useSSE } from "@/context/SSEContext";

const DURATION_MS = 7_000;

export function XPListener() {
    const { subscribe } = useSSE();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const container = document.createElement("div");
        Object.assign(container.style, {
            position: "fixed",
            inset: "0",
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: "99999",
            overflow: "hidden",
        });
        document.body.appendChild(container);

        const fireworks = new Fireworks(container, {
            // ... sizning hozirgi sozlamalaringiz o'zgarmaydi
        });

        const audio = new Audio("/sounds/mixkit-fireworks-524.wav");
        audio.preload = "auto";
        audio.volume = 0.45;

        const unsubscribe = subscribe("xp", (data) => {
            toast.success(`+${data?.xp ?? 0} XP 🎉`);

            if (timerRef.current) clearTimeout(timerRef.current);

            // Fireworks
            fireworks.stop();
            fireworks.start();
            timerRef.current = setTimeout(() => {
                fireworks.waitStop(); // mavjud raketalar tugab, yangisi chiqmaydi
            }, DURATION_MS);

            // Ovoz (bir marta, ~7s)
            audio.pause();
            audio.currentTime = 0;
            audio.play().catch(() => undefined);
        });

        return () => {
            unsubscribe?.();
            if (timerRef.current) clearTimeout(timerRef.current);
            fireworks.stop();
            audio.pause();
            audio.currentTime = 0;
            container.remove();
        };
    }, [subscribe]);

    return null;
}
