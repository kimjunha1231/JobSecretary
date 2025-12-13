import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation', () => {
    test('should show login button on home page', async ({ page }) => {
        await page.goto('/');
        // Expect to see the Google Login button
        await expect(page.getByRole('button', { name: /Google 로그인/i })).toBeVisible();
        // Use specific heading selector to avoid ambiguity with sidebar
        await expect(page.getByRole('heading', { name: 'JobSecretary' }).last()).toBeVisible();
    });

    test('should redirect unauthenticated user from dashboard to home', async ({ page }) => {
        await page.goto('/dashboard');
        // Should be redirected to /
        await expect(page).toHaveURL('http://localhost:3000/');
        await expect(page.getByRole('button', { name: /Google 로그인/i })).toBeVisible();
    });

    test('should redirect unauthenticated user from archive to home', async ({ page }) => {
        await page.goto('/archive');
        // Should be redirected to /
        await expect(page).toHaveURL('http://localhost:3000/');
    });

    test('should redirect unauthenticated user from write to home', async ({ page }) => {
        await page.goto('/write');
        // Should be redirected to /
        await expect(page).toHaveURL('http://localhost:3000/');
    });
});

test.describe('Landing Page UI', () => {
    test('should display main CTA elements', async ({ page }) => {
        await page.goto('/');

        // Check for main branding/title
        await expect(page.getByRole('heading', { name: 'JobSecretary' }).last()).toBeVisible();

        // Check for login button
        await expect(page.getByRole('button', { name: /Google 로그인/i })).toBeVisible();
    });

    test('should have proper page title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/JobSecretary/i);
    });
});

test.describe('Protected Routes Access Control', () => {
    const protectedRoutes = [
        '/dashboard',
        '/archive',
        '/write',
    ];

    for (const route of protectedRoutes) {
        test(`should protect ${route} route`, async ({ page }) => {
            await page.goto(route);
            // All protected routes should redirect to home
            await expect(page).toHaveURL('http://localhost:3000/');
        });
    }
});

test.describe('Navigation Elements', () => {
    test('should show sidebar on home page', async ({ page }) => {
        await page.goto('/');
        // Check if sidebar exists with navigation icons
        const sidebar = page.locator('aside, [role="navigation"]').first();
        await expect(sidebar).toBeVisible();
    });
});

test.describe('Responsive Design', () => {
    test('should display properly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Login button should still be visible on mobile
        await expect(page.getByRole('button', { name: /Google 로그인/i })).toBeVisible();
    });

    test('should display properly on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        await expect(page.getByRole('button', { name: /Google 로그인/i })).toBeVisible();
    });

    test('should display properly on desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');

        await expect(page.getByRole('button', { name: /Google 로그인/i })).toBeVisible();
    });
});

test.describe('Performance', () => {
    test('should load home page within acceptable time', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        // Page should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
    });
});
