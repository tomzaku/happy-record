import { test, expect } from '@playwright/test';

test.describe('Theme Settings', () => {
  test('should navigate to settings page and change theme', async ({
    page,
  }) => {
    // Navigate to the home page first
    await page.goto('/');

    // Check initial theme state
    const initialContainer = page.locator('[data-theme]');
    await expect(initialContainer).toBeVisible();
    const initialTheme = await initialContainer.getAttribute('data-theme');
    console.log('Initial theme:', initialTheme);

    // Navigate to settings page
    await page.goto('/#/setting');

    // Wait for the settings page to load - use a more specific selector
    await page.waitForSelector('[data-theme]');

    // Wait for the theme controls to be visible
    await page.waitForSelector('text=Light');
    await page.waitForSelector('text=Dark');

    // Find the theme radio buttons
    const lightThemeButton = page.locator('text=Light').first();
    const darkThemeButton = page.locator('text=Dark').first();

    // Check that theme controls are visible
    await expect(lightThemeButton).toBeVisible();
    await expect(darkThemeButton).toBeVisible();

    // Get current theme selection
    const currentTheme = await page
      .locator('[data-theme]')
      .getAttribute('data-theme');
    console.log('Current theme before change:', currentTheme);

    // Toggle theme (switch to opposite of current theme)
    if (currentTheme === 'light') {
      await darkThemeButton.click();
      console.log('Switched to dark theme');
    } else {
      await lightThemeButton.click();
      console.log('Switched to light theme');
    }

    // Wait a moment for the theme change to take effect
    await page.waitForTimeout(1000);

    // Verify theme has changed
    const newTheme = await page
      .locator('[data-theme]')
      .getAttribute('data-theme');
    console.log('New theme after change:', newTheme);

    // Assert that the theme has actually changed
    expect(newTheme).not.toBe(currentTheme);

    // Verify the theme is either 'light' or 'dark'
    expect(['light', 'dark']).toContain(newTheme);
  });

  test('should persist theme change across page navigation', async ({
    page,
  }) => {
    // Navigate to settings and change theme
    await page.goto('/#/setting');
    await page.waitForSelector('[data-theme]');

    // Wait for theme controls
    await page.waitForSelector('text=Light');
    await page.waitForSelector('text=Dark');

    // Get initial theme
    const initialTheme = await page
      .locator('[data-theme]')
      .getAttribute('data-theme');

    // Change theme
    const lightThemeButton = page.locator('text=Light').first();
    const darkThemeButton = page.locator('text=Dark').first();

    if (initialTheme === 'light') {
      await darkThemeButton.click();
    } else {
      await lightThemeButton.click();
    }

    await page.waitForTimeout(1000);

    // Navigate back to home page
    await page.goto('/');

    // Verify theme persists
    const persistedTheme = await page
      .locator('[data-theme]')
      .getAttribute('data-theme');
    const expectedTheme = initialTheme === 'light' ? 'dark' : 'light';

    expect(persistedTheme).toBe(expectedTheme);
  });

  test('should have proper theme controls in settings page', async ({
    page,
  }) => {
    await page.goto('/#/setting');

    // Wait for page to load
    await page.waitForSelector('[data-theme]');

    // Check for theme section - use more specific selectors
    await expect(page.locator('text=Theme').first()).toBeVisible();
    await expect(
      page.locator('text=Config theme for whole page'),
    ).toBeVisible();

    // Check for both theme options
    await expect(page.locator('text=Light').first()).toBeVisible();
    await expect(page.locator('text=Dark').first()).toBeVisible();

    // Get current theme to verify one option is selected
    const currentTheme = await page
      .locator('[data-theme]')
      .getAttribute('data-theme');
    console.log('Current theme in settings:', currentTheme);

    // Verify that the current theme is valid
    expect(['light', 'dark']).toContain(currentTheme);

    // Verify that the theme controls are functional by checking they exist
    const lightButton = page.locator('text=Light').first();
    const darkButton = page.locator('text=Dark').first();

    // Both buttons should be clickable
    await expect(lightButton).toBeEnabled();
    await expect(darkButton).toBeEnabled();
  });
});
