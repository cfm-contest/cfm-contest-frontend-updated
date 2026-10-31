"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Fireworks } from "fireworks-js";

import { useSSE } from "@/context/SSEContext";

export function XPListener() {
    const { subscribe } = useSSE();

    const fireworksRef = useRef<Fireworks | null>(null);

    const audio1Ref = useRef<HTMLAudioElement | null>(null);
    const audio2Ref = useRef<HTMLAudioElement | null>(null);

    const soundIndexRef = useRef(0);

    const fireworksTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    const soundActiveRef = useRef(false);

    useEffect(() => {
        // =====================================================
        // 🎆 FIREWORKS CONTAINER
        // =====================================================

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

        // =====================================================
        // 🎆 FIREWORKS
        // =====================================================

        const fireworks = new Fireworks(container, {
            autoresize: true,

            // 🌈 Colors
            hue: {
                min: 0,
                max: 360,
            },

            // 🚀 Rocket physics
            acceleration: 1.01,
            friction: 0.97,
            gravity: 1.15,

            // 💥 Big explosions
            explosion: 10,

            // ✨ Particles
            particles: 150,

            // 🚀 Long rocket trail
            traceLength: 7,
            traceSpeed: 8,

            // ✨ Brightness
            brightness: {
                min: 55,
                max: 90,
            },

            // 🌟 Decay
            decay: {
                min: 0.008,
                max: 0.02,
            },

            flickering: 60,

            // 🚀 Intensity
            intensity: 35,

            // ⏱️ Firework frequency
            delay: {
                min: 20,
                max: 50,
            },

            // 🎆 Launch positions
            rocketsPoint: {
                min: 20,
                max: 80,
            },

            lineWidth: {
                explosion: {
                    min: 1,
                    max: 4,
                },

                trace: {
                    min: 0.1,
                    max: 1.5,
                },
            },

            lineStyle: "round",

            opacity: 0.7,

            mouse: {
                click: false,
                move: false,
                max: 1,
            },
        });

        fireworksRef.current = fireworks;

        // =====================================================
        // 🔊 TWO AUDIO FILES
        // =====================================================

        const audio1 = new Audio(
            "/sounds/mixkit-fireworks-524.wav"
        );

        const audio2 = new Audio(
            "/sounds/mixkit-multiple-fireworks-explosions-1689.wav"
        );

        audio1.preload = "auto";
        audio2.preload = "auto";

        audio1.volume = 0.45;
        audio2.volume = 0.45;

        audio1Ref.current = audio1;
        audio2Ref.current = audio2;

        // =====================================================
        // 🔊 PLAY NEXT SOUND
        // =====================================================

        const playNextSound = () => {
            if (!soundActiveRef.current) {
                return;
            }

            const currentIndex = soundIndexRef.current;

            const currentAudio =
                currentIndex === 0
                    ? audio1Ref.current
                    : audio2Ref.current;

            if (!currentAudio) return;

            currentAudio.currentTime = 0;

            currentAudio.play().catch(() => undefined);
        };

        // =====================================================
        // 🔁 WHEN SOUND FINISHES
        // =====================================================

        audio1.onended = () => {
            if (!soundActiveRef.current) return;

            // 1 → 2
            soundIndexRef.current = 1;

            playNextSound();
        };

        audio2.onended = () => {
            if (!soundActiveRef.current) return;

            // 2 → 1
            soundIndexRef.current = 0;

            playNextSound();
        };

        // =====================================================
        // 🎯 XP EVENT
        // =====================================================

        const unsubscribe = subscribe("xp", (data) => {

            const xp = data?.xp ?? 0;

            toast.success(`+${xp} XP 🎉`);

            // =================================================
            // 🧹 OLD FIREWORKS
            // =================================================

            if (fireworksTimerRef.current) {
                clearTimeout(
                    fireworksTimerRef.current
                );
            }

            fireworks.stop();

            // =================================================
            // 🎆 START FIREWORKS
            // =================================================

            fireworks.start();

            // 16 sekund ishlaydi
            fireworksTimerRef.current =
                setTimeout(() => {
                    fireworks.stop();
                }, 16_000);

            // =================================================
            // 🔊 START SOUND LOOP
            // =================================================

            soundActiveRef.current = true;

            // Har safar birinchisidan boshlaydi
            soundIndexRef.current = 0;

            // Ikkala audioni to'xtatamiz
            audio1.pause();
            audio2.pause();

            audio1.currentTime = 0;
            audio2.currentTime = 0;

            // 🔊 1-SOUND
            playNextSound();

            // =================================================
            // 🔴 16 SEKUND KEYIN SOUNDNI TO'XTATISH
            // =================================================

            setTimeout(() => {
                soundActiveRef.current = false;

                audio1.pause();
                audio2.pause();

                audio1.currentTime = 0;
                audio2.currentTime = 0;
            }, 16_000);
        });

        // =====================================================
        // 🧹 CLEANUP
        // =====================================================

        return () => {
            unsubscribe?.();

            soundActiveRef.current = false;

            if (fireworksTimerRef.current) {
                clearTimeout(
                    fireworksTimerRef.current
                );
            }

            fireworks.stop();

            audio1.pause();
            audio2.pause();

            audio1.currentTime = 0;
            audio2.currentTime = 0;

            audio1.onended = null;
            audio2.onended = null;

            container.remove();

            fireworksRef.current = null;
            audio1Ref.current = null;
            audio2Ref.current = null;
        };
    }, [subscribe]);

    return null;
}
