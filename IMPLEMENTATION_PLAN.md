# Prayer Time Widget — Implementation Plan

## Objective
Redesign the Übersicht React widget into a production-quality, minimal, Apple-like glassmorphism interface with animated prayer progression.

## Implemented Scope
1. **Visual redesign**
   - Glassmorphism card with blur/transparency
   - Rounded macOS-like corners and soft layered shadows
   - Elegant SF/Inter typography

2. **Prayer progression arc (SVG)**
   - Curved arc path drawn via SVG math
   - Active segment highlighting between current and next prayer
   - Subtle under-arc shadow for depth

3. **Animated sun indicator**
   - Real-time position based on normalized cycle progress
   - Smooth interpolation using `requestAnimationFrame`
   - Soft glow + pulse animation

4. **Prayer timeline logic**
   - Handles day-cycle correctly from Fajr → next Fajr
   - Computes current prayer, next prayer, and countdown
   - Supports overnight transition (Isha to Fajr)

5. **Contextual theming**
   - Dynamic gradient and accent colors by prayer:
     - Fajr, Dhuhr, Asr, Maghrib, Isha

6. **Performance + quality**
   - `React.PureComponent` to avoid unnecessary re-renders
   - Lightweight state updates once per second
   - Interpolated animation loop for fluid movement

## Configurability
- Prayer times are centralized in `PRAYER_TIMES` array at the top of the widget source.
- Theme colors are centralized in `PRAYER_THEME`.
