# Playwright E2E Tests

This directory contains end-to-end tests for the Dreamer web application using Playwright.

## Setup

Playwright is already installed and configured. The browsers have been installed with:
```bash
npx playwright install
```

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npm run test:e2e:theme
```

### With UI (Interactive Mode)
```bash
npm run test:e2e:ui
```

### In Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Mobile Testing
```bash
# Test on mobile devices only
npm run test:e2e:mobile

# Test on mobile devices with UI
npm run test:e2e:mobile:ui

# Use mobile-only configuration (includes landscape modes)
npm run test:e2e:mobile-only

# Use mobile-only configuration with UI
npm run test:e2e:mobile-only:ui
```

## Test Files

- `theme.spec.ts` - Tests for theme switching functionality in the settings page

## Test Structure

The tests are organized using `test.describe()` blocks for better organization. Each test focuses on a specific functionality:

1. **Theme Navigation Test** - Navigates to settings and changes theme
2. **Theme Persistence Test** - Verifies theme changes persist across navigation
3. **Theme Controls Test** - Verifies theme controls are properly displayed

## Configuration

The Playwright configuration is in `playwright.config.ts` and includes:

- Test directory: `./e2e`
- Base URL: `http://localhost:5173`
- Web server: Automatically starts `npm run dev` before tests
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari
- Parallel execution enabled
- HTML reporter

### Mobile Configuration

There's also a mobile-specific configuration in `playwright.mobile.config.ts` that includes:
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)
- Landscape orientations for both devices

## Writing New Tests

1. Create a new `.spec.ts` file in the `e2e` directory
2. Import `test` and `expect` from `@playwright/test`
3. Use descriptive test names
4. Add proper waiting for elements to load
5. Use specific selectors to avoid ambiguity

Example:
```typescript
import { test, expect } from '@playwright/test';

test('my feature test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="my-element"]')).toBeVisible();
});
```
