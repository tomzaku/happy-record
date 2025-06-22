# Timer Component

A reusable timer component that provides countdown functionality with customizable duration and callback support.

## Features

- ⏱️ **Countdown Timer**: Displays time in MM:SS format
- 🎯 **Custom Duration**: Configurable duration with 5-second default
- 🔔 **Finish Callback**: Execute custom logic when timer completes
- 🎮 **Play/Pause/Reset Controls**: Full timer control functionality
- 🎨 **Customizable Styling**: CSS modules with theme support
- 📱 **Responsive Design**: Mobile-friendly interface
- ♿ **Accessibility**: Proper button states and disabled handling

## Usage

```tsx
import Timer from './components/timer';

// Basic usage with default 5-second duration
<Timer onFinish={() => console.log('Timer finished!')} />

// Custom duration (10 seconds)
<Timer 
  duration={10000} 
  onFinish={() => alert('Timer completed!')} 
/>

// Auto-start timer
<Timer 
  duration={3000} 
  onFinish={handleTimerFinish}
  autoStart={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `duration` | `number` | `5000` | Duration in milliseconds (5 seconds default) |
| `onFinish` | `() => void` | `undefined` | Callback function called when timer reaches 0 |
| `autoStart` | `boolean` | `false` | Whether to automatically start the timer on mount |
| `showDisplay` | `boolean` | `true` | Whether to show the timer display |
| `className` | `string` | `undefined` | Custom CSS class name |
| `disabled` | `boolean` | `false` | Whether the timer controls are disabled |

## Examples

### Basic Timer
```tsx
<Timer onFinish={() => alert('Time is up!')} />
```

### Custom Duration
```tsx
<Timer 
  duration={30000} // 30 seconds
  onFinish={() => console.log('30 seconds elapsed')}
/>
```

### Auto-start Timer
```tsx
<Timer 
  duration={10000}
  onFinish={handleTimerComplete}
  autoStart={true}
/>
```

### Hidden Display Timer
```tsx
<Timer 
  duration={5000}
  onFinish={handleBackgroundTask}
  showDisplay={false}
/>
```

### Disabled Timer
```tsx
<Timer 
  duration={5000}
  onFinish={handleFinish}
  disabled={true}
/>
```

## Styling

The component uses CSS modules with the following classes:

- `.timer` - Main container
- `.timerDisplay` - Time display container
- `.timerDigit` - Individual digit styling
- `.timerControls` - Button controls container
- `.timerButton` - Base button styles
- `.timerStart` - Start button specific styles
- `.timerPause` - Pause button specific styles
- `.timerStop` - Reset button specific styles

## Dependencies

- `@dreamer/timer-hook` - Timer logic hook
- `@dreamer/tasks-page-common` - Time formatting utilities
- `classnames` - CSS class utility

## Browser Support

- Modern browsers with ES6+ support
- Responsive design for mobile devices
- CSS custom properties for theming 