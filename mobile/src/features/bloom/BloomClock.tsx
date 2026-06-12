/**
 * BloomClock component
 * Renders a watercolor-style metabolic portrait.
 */
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { BloomCondition } from '@workspace/shared';

interface BloomClockProps {
  seed: string;
  petalNoise: number[];
  size?: number;
}

const BLOOM_COLORS = {
  calm: '#A8DADC',
  clear: '#457B9D',
  foggy: '#8D99AE',
  reactive: '#E63946',
  heavy: '#1D3557',
  restored: '#A8DADC',
  charged: '#F4A261',
};

export function BloomClock({ seed, petalNoise, size = 300 }: BloomClockProps) {
  const center = size / 2;
  const radius = size * 0.4;

  // Generate a deterministic bloom path based on seed
  const bloomPath = useMemo(() => {
    const path = Skia.Path.Make();
    const points = 24;

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noiseFactor = petalNoise[i % petalNoise.length] ?? 0.5;
      const r = radius * (0.7 + 0.3 * noiseFactor);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    return path;
  }, [center, radius, petalNoise]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ flex: 1 }}>
        <Path
          path={bloomPath}
          color={BLOOM_COLORS.clear}
          style="fill"
        />
      </Canvas>
    </View>
  );
}