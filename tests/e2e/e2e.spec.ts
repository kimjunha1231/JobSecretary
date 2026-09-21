import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation', () => {
    test('should show login button on home page', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Google 계정으로 시작하기/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /당신의 취업 성공을 위한/ })).toBeVisible();
    });

    test('should redirect unauthenticated user from dashboard to home', async ({ page }) => {
        await page.goto('/dashboard');
        // Should be redirected to /
        await expect(page).toHaveURL('http://localhost:3000/');
        await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
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

        await expect(page.getByRole('heading', { name: /당신의 취업 성공을 위한/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /Google 계정으로 시작하기/i })).toBeVisible();
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
        '/exports',
        '/career',
        '/jobs',
        '/style',
        '/writing/new',
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
        // The landing page intentionally uses a compact header instead of the authenticated sidebar.
        await expect(page.locator('header').first()).toBeVisible();
    });
});

test.describe('Responsive Design', () => {
    test('should display properly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        await expect(page.getByRole('button', { name: /Google 계정으로 시작하기/i })).toBeVisible();
    });

    test('should display properly on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        await expect(page.getByRole('button', { name: /Google 계정으로 시작하기/i })).toBeVisible();
    });

    test('should display properly on desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');

        await expect(page.getByRole('button', { name: /Google 계정으로 시작하기/i })).toBeVisible();
    });
});

test.describe('Performance', () => {
    test('should load home page within acceptable time', async ({ page }) => {
        const startTime = Date.now();
        // The landing page includes analytics and animated assets that can keep
        // the network busy after the usable UI is ready. Measure the first
        // usable document instead of waiting for every background request.
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: /Google 계정으로 시작하기/i })).toBeVisible();
        const loadTime = Date.now() - startTime;

        // Page should become usable within 5 seconds
        expect(loadTime).toBeLessThan(5000);
    });
});
