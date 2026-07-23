'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';

export interface SoundwaveHeroProps {
  title?: string;
  subtitle?: string;
  cta?: string;
  waveColor?: string;
  morphOnScroll?: boolean;
}

export default function SoundwaveHero(props: SoundwaveHeroProps) {
  const { title, subtitle, cta, waveColor = '#3B82F6', morphOnScroll = true } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll-driven animation
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Smooth the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // SVG path morph: wave → flat line
  // Wave path: M0,50 Q250,0 500,50 Q750,100 1000,50
  // Flat path: M0,50 L1000,50
  const pathD = useTransform(
    smoothProgress,
    [0, 1],
    [
      'M0,50 Q250,0 500,50 Q750,100 1000,50', // Wave
      'M0,50 L1000,50', // Flat line
    ]
  );

  // Opacity fades out as we scroll
  const opacity = useTransform(smoothProgress, [0, 0.5], [1, 0]);

  // Y position moves up slightly on scroll
  const y = useTransform(smoothProgress, [0, 1], [0, -50]);

  return (
    <motion.section
      ref={containerRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted" />

      {/* Soundwave SVG */}
      <motion.div
        style={{ opacity, y }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <svg
          viewBox="0 0 1000 100"
          className="w-full h-32 md:h-48"
          preserveAspectRatio="none"
        >
          <motion.path
            d={pathD}
            fill="none"
            stroke={waveColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
          {/* Secondary wave for depth */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={waveColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.3}
            transform="translate(0, 10)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.2 }}
          />
        </svg>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-black text-foreground mb-6 tracking-tight"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>

        {cta && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            {cta}
          </motion.button>
        )}
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2"
        >
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
          />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
