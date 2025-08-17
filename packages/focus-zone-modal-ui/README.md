# Focus Zone Modal - Productivity Companion

A beautiful, zen-like focus zone modal designed to enhance productivity and concentration. This component provides a distraction-free environment with integrated timer functionality and ambient sounds, designed to be used as a modal overlay that can be opened from any page.

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

### Basic Modal Integration

```tsx
import FocusZoneModal from '@dreamer/focus-zone-modal-ui';

const TaskDetailPage = () => {
  const [isFocusZoneOpen, setIsFocusZoneOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string>('');

  const openFocusZone = (taskId: string, taskTitle: string) => {
    setCurrentTaskId(taskId);
    setCurrentTaskTitle(taskTitle);
    setIsFocusZoneOpen(true);
  };

  return (
    <div>
      <button onClick={() => openFocusZone('task-123', 'Complete Project')}>
        Open Focus Zone
      </button>
      
      <FocusZoneModal
        visible={isFocusZoneOpen}
        taskId={currentTaskId}
        taskTitle={currentTaskTitle}
        onDismiss={() => setIsFocusZoneOpen(false)}
      />
    </div>
  );
};
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | Yes | Controls whether the modal is visible |
| `taskId` | `string` | No | The ID of the current task for context |
| `taskTitle` | `string` | No | The title of the current task to display |
| `onDismiss` | `() => void` | Yes | Callback function when the modal is dismissed |

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

The Focus Zone Modal is designed to integrate seamlessly with any page in your application:

```tsx
// Open focus zone for a specific task
const openFocusZone = (taskId: string, taskTitle: string) => {
  setCurrentTaskId(taskId);
  setCurrentTaskTitle(taskTitle);
  setIsFocusZoneOpen(true);
};

// The modal will overlay the current page without navigation
<FocusZoneModal
  visible={isFocusZoneOpen}
  taskId={currentTaskId}
  taskTitle={currentTaskTitle}
  onDismiss={() => setIsFocusZoneOpen(false)}
/>
```

## Future Enhancements

- [ ] Custom Pomodoro intervals
- [ ] Sound mixing and layering
- [ ] Focus statistics and analytics
- [ ] Integration with task completion tracking
- [ ] Custom sound upload support
- [ ] Focus session history
- [ ] Keyboard shortcuts for modal control
- [ ] Focus mode persistence across sessions
