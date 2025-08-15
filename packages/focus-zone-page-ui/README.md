# Focus Zone - Productivity Companion

A beautiful, zen-like focus zone page designed to enhance productivity and concentration. This component provides a distraction-free environment with integrated timer functionality and ambient sounds.

## Features

### ⏱️ Precision Timer
- **Stopwatch Mode**: High-precision stopwatch with millisecond accuracy
- **Pomodoro Mode**: Classic 25/5 Pomodoro technique with automatic phase transitions
- **Visual Progress**: Beautiful progress indicators for Pomodoro sessions
- **Smooth Controls**: Intuitive start/pause/reset controls with hover effects

### 🎵 Ambient Sounds
- **Nature Sounds**: Forest rain, ocean waves for natural focus
- **Ambient Music**: Ethereal synthesizer soundscapes and white noise
- **Volume Control**: Precise volume adjustment with visual feedback
- **Seamless Switching**: Easy switching between different sound options

### 🎨 Beautiful Design
- **Dark Theme**: Deep blues and purples for optimal focus
- **Gradient Backgrounds**: Subtle animated gradients for visual appeal
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Responsive Layout**: Optimized for both desktop and mobile devices

### 🧘‍♀️ Focus Features
- **Distraction-Free**: Clean, minimal interface design
- **Tabbed Interface**: Easy switching between timer modes
- **Visual Feedback**: Clear status indicators and progress visualization
- **Accessibility**: Keyboard navigation and screen reader support

## Usage

### Navigation
The Focus Zone can be accessed from any task detail page by clicking the psychology icon in the header.

### Timer Modes
1. **Stopwatch**: Click "Start" to begin timing, "Pause" to pause, "Reset" to clear
2. **Pomodoro**: Automatic 25-minute work sessions with 5-minute breaks

### Sound Controls
1. Select any sound from the list to activate it
2. Use the volume slider to adjust audio levels
3. Click the play/pause button to control playback

## Technical Details

### Dependencies
- React 18+
- Framer Motion for animations
- Moon UI components for consistent design
- Timer hook for precise timing
- Audio player integration for sound management

### Styling
- SCSS modules for scoped styling
- CSS Grid and Flexbox for responsive layouts
- CSS custom properties for theming
- Backdrop filters for modern glass effects

### Performance
- Optimized re-renders with React.memo
- Efficient timer implementations
- Lazy loading for audio assets
- Smooth 60fps animations

## Integration

The Focus Zone is designed to integrate seamlessly with the existing task management system:

```typescript
// Navigate to focus zone for a specific task
navigate(`/task/${taskId}/focus`);
```

## Future Enhancements

- [ ] Custom Pomodoro intervals
- [ ] Sound mixing and layering
- [ ] Focus statistics and analytics
- [ ] Integration with task completion tracking
- [ ] Custom sound upload support
- [ ] Focus session history
