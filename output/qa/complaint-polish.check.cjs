/* global require, process, console, URL, Buffer, __dirname, Storage, document, innerWidth, sessionStorage */
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS check using the temporary Playwright installation. */
const { chromium } = require(require('node:path').join(process.env.TEMP, 'codex-complaint-polish-check/node_modules/playwright'));
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.routeWebSocket(/supabase/, socket => socket.close());
  let optionsMode = 'ok', createMode = 'error', createCount = 0, detailFails = false;
  let complaint = {
    id: 'case-1', complaint_number: 'CMP-2026-00001', title: 'Leaking pipe in Room 201', description: 'Water has been leaking beneath the sink since this morning.',
    status: 'in_progress', priority: 'medium', assigned_staff_id: 'staff-1', assigned_staff: { full_name: 'Alex Maintenance', specialization: 'Plumbing' },
    category: { name: 'Plumbing' }, location: { building: 'Main building', floor: '2nd floor', room: '201' },
    submitted_at: '2026-09-24T01:00:00Z', sla_deadline: '2026-09-26T01:00:00Z',
  };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/src/hooks/useAuth.ts') {
      return route.fulfill({ contentType: 'application/javascript', body: `export function useAuth() { const q = new URLSearchParams(location.search); const id = q.get('testUser') || 'student-a'; const role = q.get('testRole') || 'student'; return { user: { id }, profile: { id, role, full_name: 'Test Student', account_type: role === 'student' ? 'student' : 'staff', account_status: 'active', student_id: 'TEST-001', course: 'BSIT', year_level: '4', contact_number: '09123456789' }, loading: false }; }` });
    }
    if (url.hostname === '127.0.0.1') return route.continue();
    if (!url.pathname.startsWith('/rest/v1/') && !url.pathname.startsWith('/storage/v1/')) return route.abort();
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'content-range': '0-0/0' } });
    if (url.pathname.includes('/storage/v1/')) return json({ message: 'simulated upload failure' }, 500);
    if (url.pathname.endsWith('/complaint_categories') || url.pathname.endsWith('/locations')) {
      if (optionsMode === 'error') return json({ message: 'simulated offline' }, 503);
      if (optionsMode === 'empty') return json([]);
      return json(url.pathname.endsWith('/locations') ? [{ id: 'loc-1', building: 'Main building', room: '201' }] : [{ id: 'cat-1', name: 'Plumbing' }, { id: 'cat-2', name: 'Other' }]);
    }
    if (url.pathname.endsWith('/complaints')) {
      if (route.request().method() === 'POST') {
        createCount++;
        if (createMode === 'throw') return route.abort();
        if (createMode === 'error') return json({ code: '23502', message: 'database trigger missing' }, 400);
        return json(complaint, 201);
      }
      if (detailFails) return json({ message: 'simulated detail failure' }, 503);
      return json(complaint);
    }
    if (url.pathname.endsWith('/feedback')) return json(null);
    return json([]);
  });
  const base = 'http://127.0.0.1:5173';
  const formUrl = `${base}/student/complaints/new`;
  const title = page.getByLabel('Complaint title', { exact: true });
  const submit = page.getByRole('button', { name: 'Submit complaint', exact: true });
  const waitForm = () => page.getByLabel('Category', { exact: true }).locator('option', { hasText: 'Plumbing' }).waitFor({ state: 'attached' });
  const check = message => console.log(`PASS ${message}`);
  try {
    await page.goto(formUrl);
    await waitForm();
    await title.fill('Leaking pipe in Room 201');
    await page.getByLabel('Description', { exact: true }).fill('Water has been leaking beneath the sink since this morning.');
    await page.getByLabel('Category', { exact: true }).selectOption('cat-1');
    await page.getByLabel('Building / room').selectOption('loc-1');
    await page.reload();
    await page.getByText('Your draft has been restored', { exact: true }).waitFor();
    assert.equal(await title.inputValue(), 'Leaking pipe in Room 201');
    await waitForm();
    assert.equal(await page.getByLabel('Building / room').inputValue(), 'loc-1');
    check('draft survives refresh with title, description, category and location');

    await page.goto(`${formUrl}?testUser=student-b`);
    await waitForm();
    assert.equal(await title.inputValue(), '');
    await page.goto(formUrl);
    await waitForm();
    assert.equal(await title.inputValue(), 'Leaking pipe in Room 201');
    check('drafts remain isolated between accounts');

    optionsMode = 'error';
    await page.reload();
    await page.getByRole('button', { name: 'Retry loading choices' }).waitFor();
    assert.equal(await submit.isDisabled(), true);
    assert.equal(await title.inputValue(), 'Leaking pipe in Room 201');
    optionsMode = 'ok';
    await page.getByRole('button', { name: 'Retry loading choices' }).click();
    await waitForm();
    await submit.click();
    await page.getByRole('alert').filter({ hasText: 'We could not save your complaint' }).waitFor();
    assert.equal(await title.inputValue(), 'Leaking pipe in Room 201');
    assert.equal(await submit.isEnabled(), true);
    assert.equal((await page.locator('main').innerText()).includes('database trigger'), false);
    check('lookup retry preserves draft; submission errors are readable and form unlocks');

    optionsMode = 'empty';
    await page.reload();
    await page.getByText('Complaint categories or locations are not available yet.', { exact: false }).waitFor();
    assert.equal(await submit.isDisabled(), true);
    optionsMode = 'ok';
    await page.getByRole('button', { name: 'Retry loading choices' }).click();
    await waitForm();
    check('empty setup explains the problem and blocks submission');

    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(__dirname, 'complaint-form-mobile.png'), fullPage: true });
    check('complaint form fits mobile viewport');

    createMode = 'ok';
    const photo = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 10; canvas.height = 10; return canvas.toDataURL('image/png').split(',')[1]; });
    await page.locator('input[type=file]').setInputFiles({ name: 'evidence.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') });
    await page.getByText('Ready to upload', { exact: true }).waitFor();
    const countBefore = createCount;
    await submit.click();
    await page.getByRole('heading', { name: 'Complaint submitted', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Retry remaining photos' }).waitFor();
    await page.getByRole('button', { name: 'View complaint' }).click();
    await page.waitForURL('**/student/complaints/case-1');
    await page.getByRole('region', { name: 'Complaint progress' }).waitFor();
    assert.equal(createCount, countBefore + 1);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('complaint-draft:v1:student-a')), null);
    check('successful creation clears draft and upload failure does not resubmit the complaint');

    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(__dirname, 'complaint-progress-mobile.png'), fullPage: true });

    const statuses = ['submitted', 'under_review', 'verified', 'assigned', 'in_progress', 'waiting_for_materials', 'resolved', 'closed', 'rejected', 'reopened'];
    for (const role of ['student', 'maintenance', 'admin']) {
      for (const status of statuses) {
        complaint.status = status;
        await page.goto(`${base}/${role}/complaints/case-1?testRole=${role}`);
        const progress = page.getByRole('region', { name: 'Complaint progress' });
        await progress.waitFor();
        assert.match(await progress.innerText(), /What happens next/);
        assert.match(await progress.innerText(), /Alex Maintenance/);
        assert.doesNotMatch(await progress.innerText(), /undefined/);
      }
    }
    check('all ten statuses render guidance for all three roles');

    detailFails = true;
    await page.reload();
    await page.getByRole('button', { name: 'Retry loading complaint' }).waitFor();
    detailFails = false;
    await page.getByRole('button', { name: 'Retry loading complaint' }).click();
    await page.getByRole('region', { name: 'Complaint progress' }).waitFor();
    check('complaint details recover with retry');

    await page.goto(formUrl);
    await waitForm();
    await title.fill('Discard me');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Discard draft' }).click();
    await page.reload();
    await waitForm();
    assert.equal(await title.inputValue(), '');
    check('discarded draft stays cleared after refresh');

    await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Storage blocked'); }; });
    await page.reload();
    await waitForm();
    await title.fill('Unsaved draft');
    await page.getByText('Draft saving is unavailable', { exact: true }).waitFor();
    assert.equal(await title.inputValue(), 'Unsaved draft');
    check('unavailable browser storage leaves form usable with a clear notice');
    assert.deepEqual(pageErrors, []);
    check('no browser runtime errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
