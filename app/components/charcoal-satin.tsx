"use client";

import type { ReactNode } from "react";
import { GradientBackground } from "@/components/gradient-surface";

const tunedColors: [string, string, ...string[]] = ["#5c6270","#ffffff","#a9b0bd"];
const tunedProps = { ...  {"background":"#050506","blur":0.25,"colors":["#5c6270","#ffffff","#a9b0bd"],"dither":{"cell":3,"enabled":false,"levels":8},"grain":0.08,"interaction":{"pointer":0.15,"scroll":0.2},"loopSeconds":28,"scale":2,"seed":2,"speed":0.6,"warp":0.9}, colors: tunedColors };
const tunedDefaults =   {"background":"#050506","blur":0.25,"colors":["#5c6270","#ffffff","#a9b0bd"],"dither":{"cell":3,"enabled":false,"levels":8},"grain":0.08,"interaction":{"pointer":0.15,"scroll":0.2},"kind":"silk","loopSeconds":28,"scale":2,"seed":2,"speed":0.6,"warp":0.9};

export interface CharcoalSatinProps {
  className?: string;
  children?: ReactNode;
}

export function CharcoalSatin({ className, children }: CharcoalSatinProps) {
  return (
    <GradientBackground defaults={tunedDefaults} {...tunedProps} className={className}>
      {children}
    </GradientBackground>
  );
}
