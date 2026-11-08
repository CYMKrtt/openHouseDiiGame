import { existsSync } from 'node:fs';
import {test,expect} from '@playwright/test';
test('server mode fails closed when development backend is absent',async({page})=>{
 test.skip(!!process.env.SUPABASE_URL || existsSync('.env.local'),'Requires missing development configuration');
 await page.goto('/');await expect(page.getByRole('status')).toContainText('ไม่สามารถเชื่อมต่อได้');
 await expect(page.getByText('Prototype-only')).toHaveCount(0);
 await page.goto('/host');await expect(page.getByRole('dialog',{name:'เฉพาะผู้จัดกิจกรรม'})).toBeVisible();
 await expect(page.getByText('demo-host')).toHaveCount(0);
 await page.getByLabel('รหัสผ่าน Host').fill('irrelevant test password');await page.getByRole('button',{name:'เข้าสู่ Host Dashboard'}).click();
 await expect(page.locator('.error')).toContainText('ไม่สามารถเข้าสู่ระบบได้');
});
