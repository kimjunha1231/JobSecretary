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
