# Bloom Feature (mobile/src/features/bloom/)

## Purpose
Watercolor metabolic portrait for T1D/metabolic health visualization.

## Files
- `BloomClock.tsx` - Renders the bloom using Skia
- `PortraitScreen.tsx` - Full-screen portrait view
- `useIdentityBloom.ts` - Hook for user's visual fingerprint

## Integration
To add to the main navigation, import in `App.tsx`:

```tsx
import { PortraitScreen } from './src/features/bloom';

// Add to Stack.Navigator:
<Stack.Screen
  name="Portrait"
  component={PortraitScreen}
  options={{ headerShown: false }}
/>
```

## Weather Layer Colors
- **Calm**: `#A8DADC` - Stable baseline
- **Clear**: `#457B9D` - Good response
- **Foggy**: `#8D99AE` - Uncertainty
- **Reactive**: `#E63946` - Metabolic swings
- **Heavy**: `#1D3557` - Fatigue/strain
- **Restored**: `#A8DADC` - Recovery
- **Charged**: `#F4A261` - Alert/high energy