'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface ProductGalleryProps {
  title?: string;
  entity?: string;
}

export default function ProductGallery(props: ProductGalleryProps) {
  const { title, entity } = props;

  return (
    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold">Product Gallery</h2>
      </motion.div>
    </motion.section>
  );
}
