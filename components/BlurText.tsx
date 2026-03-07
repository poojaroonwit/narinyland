"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
}

export default function BlurText({
  text,
  className = "",
  delay = 100,
  animateBy = "words",
  direction = "bottom",
}: BlurTextProps) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const parts = animateBy === "words" ? text.split(" ") : text.split("");
  const yFrom = direction === "bottom" ? 50 : -50;

  return (
    <span ref={ref} className={`flex flex-wrap ${className}`}>
      {parts.map((part, i) => (
        <motion.span
          key={i}
          initial={{ filter: "blur(10px)", opacity: 0, y: yFrom }}
          animate={
            inView
              ? {
                  filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [yFrom, -5, 0],
                }
              : {}
          }
          transition={{
            duration: 0.7,
            delay: (i * delay) / 1000,
            ease: "easeOut",
          }}
          className="inline-block mr-[0.28em] last:mr-0"
        >
          {part}
        </motion.span>
      ))}
    </span>
  );
}
