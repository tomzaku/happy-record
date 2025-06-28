# Moon UI Input Component

A customizable input component with support for various features including suffix content.

## Props

- `border`: 'dash' | 'solid' - Border style (default: 'solid')
- `placeholder`: React.ReactNode - Placeholder content
- `classes`: { input: string } - Custom CSS classes
- `showClear`: boolean - Show clear button when input has value
- `suffix`: React.ReactNode - Content to display on the right side of the input

## Examples

### Basic Input
```tsx
import Input from '@moon-ui/input';

<Input placeholder="Enter your name" />
```

### Input with Unit Suffix
```tsx
<Input 
  type="number" 
  placeholder="Enter distance" 
  suffix="km" 
/>

<Input 
  type="number" 
  placeholder="Enter time" 
  suffix="minutes" 
/>

<Input 
  type="number" 
  placeholder="Enter weight" 
  suffix="kg" 
/>
```

### Input with Custom Suffix Content
```tsx
<Input 
  placeholder="Enter amount" 
  suffix={<span style={{ color: 'green' }}>$</span>} 
/>

<Input 
  placeholder="Enter percentage" 
  suffix="%" 
/>
```

### Input with Clear Button and Suffix
```tsx
<Input 
  placeholder="Search..." 
  showClear 
  suffix="results" 
/>
```

## Features

- **Suffix Support**: Display units or any content on the right side of the input
- **Clear Button**: Optional clear functionality with smooth animations
- **Customizable Borders**: Support for dashed and solid borders
- **Placeholder**: Custom placeholder content
- **Responsive**: Adapts to different screen sizes
- **Accessible**: Proper ARIA labels and keyboard navigation 