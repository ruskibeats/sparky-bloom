/**
 * Bloom Portrait Screen
 * Displays the watercolor metabolic portrait for the user.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { BloomClock } from './BloomClock';
import { useIdentityBloom } from './useIdentityBloom';

export function PortraitScreen() {
  const { seed, petalNoise } = useIdentityBloom();

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold mb-4 text-text-primary">
          Today's Bloom
        </Text>
        <BloomClock seed={seed} petalNoise={petalNoise} size={300} />
      </View>
    </View>
  );
}