/* global require, process, console, URL, Buffer, __dirname, document, innerWidth, createImageBitmap, fetch */
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS browser check with a temporary Playwright installation. */
const path = require('node:path');
const { chromium } = require(path.join(process.env.TEMP, 'codex-complaint-polish-check/node_modules/playwright'));
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.routeWebSocket(/supabase/, socket => socket.close());
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const objects = new Set(), rows = new Map(), attempts = new Map();
  let faults = true, creates = 0;
  const complaint = { id: '00000000-0000-0000-0000-000000000001', complaint_number: 'CMP-2026-00001', reporter_id: 'student-a', assigned_staff_id: 'maintenance-a', title: 'Leaking pipe', description: 'Water is leaking beneath the sink.', status: 'in_progress', priority: 'medium', submitted_at: '2026-09-24T01:00:00Z', sla_deadline: '2026-09-27T01:00:00Z', location: { building: 'Main', room: '201' } };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/src/hooks/useAuth.ts') return route.fulfill({ contentType: 'application/javascript', body: `export function useAuth() { const role = new URLSearchParams(location.search).get('testRole') || 'student'; const id = role + '-a'; return { user: { id }, profile: { id, role, full_name: 'Test Reporter', account_type: role === 'student' ? 'student' : 'staff', account_status: 'active', student_id: 'TEST-001', course: 'BSIT', year_level: '4', contact_number: '09123456789' }, loading: false }; }` });
    if (url.hostname === '127.0.0.1') return route.continue();
    if (!url.pathname.startsWith('/rest/v1/') && !url.pathname.startsWith('/storage/v1/')) return route.abort();
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'content-range': '0-0/0' } });
    const method = route.request().method();
    if (url.pathname.includes('/storage/v1/object/sign/')) {
      if (method === 'POST') return json({ signedURL: '/object/sign/complaint-photos/test.png?token=test' });
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=', 'base64') });
    }
    if (url.pathname.includes('/storage/v1/object/')) {
      const storagePath = decodeURIComponent(url.pathname.split('/complaint-photos/')[1]);
      attempts.set(storagePath, (attempts.get(storagePath) || 0) + 1);
      if (objects.has(storagePath)) return json({ statusCode: '409', message: 'The resource already exists', error: 'Duplicate' }, 409);
      objects.add(storagePath);
      if (faults && storagePath.includes('lost-storage')) return route.abort();
      return json({ Key: storagePath, Id: 'object-id' });
    }
    if (url.pathname.endsWith('/complaint_photos')) {
      if (method === 'POST') {
        const row = route.request().postDataJSON();
        if (faults && row.file_name.includes('retry-metadata')) return json({ message: 'simulated metadata outage' }, 503);
        if (rows.has(row.id)) return json({ code: '23505', message: 'duplicate' }, 409);
        rows.set(row.id, { ...row, created_at: '2026-09-24T02:00:00Z' });
        if (faults && row.file_name.includes('lost-metadata')) return route.abort();
        return json(null, 201);
      }
      if (url.searchParams.has('id')) return json(rows.get(url.searchParams.get('id').slice(3)) || null);
      return json(Array.from(rows.values()));
    }
    if (url.pathname.endsWith('/complaint_categories')) return json([{ id: 'category-1', name: 'Plumbing' }]);
    if (url.pathname.endsWith('/locations')) return json([{ id: 'location-1', building: 'Main', room: '201' }]);
    if (url.pathname.endsWith('/complaints')) { if (method === 'POST') creates++; return json(complaint, method === 'POST' ? 201 : 200); }
    if (url.pathname.endsWith('/feedback')) return json(null);
    return json([]);
  });
  const base = 'http://127.0.0.1:5173';
  const waitReady = count => page.getByText('Ready to upload', { exact: true }).nth(count - 1).waitFor();
  const choose = () => page.getByLabel('Choose photos', { exact: true });
  const check = message => console.log(`PASS ${message}`);
  try {
    await page.goto(`${base}/student/complaints/new`);
    await page.getByLabel('Category', { exact: true }).selectOption('category-1');
    const fixtures = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 2600; canvas.height = 2000;
      const ctx = canvas.getContext('2d');
      const pixels = ctx.createImageData(canvas.width, canvas.height);
      let seed = 12893;
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[i] = seed & 255; pixels.data[i + 1] = (seed >>> 8) & 255; pixels.data[i + 2] = (seed >>> 16) & 255; pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
      const large = canvas.toDataURL('image/png').split(',')[1];
      canvas.width = 400; canvas.height = 300;
      ctx.fillStyle = '#800000'; ctx.fillRect(0, 0, 400, 300);
      return { large, small: canvas.toDataURL('image/jpeg', .9).split(',')[1] };
    });
    const large = { name: 'large-phone.png', mimeType: 'image/png', buffer: Buffer.from(fixtures.large, 'base64') };
    assert(large.buffer.length > 5 * 1024 * 1024 && large.buffer.length < 20 * 1024 * 1024);
    const small = name => ({ name: `${name}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(fixtures.small, 'base64') });
    await choose().setInputFiles([{ name: 'not-a-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }, { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') }, { name: 'too-big.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(21 * 1024 * 1024) }]);
    await page.getByText('too-big.jpg: Choose a photo smaller than 20 MB.').waitFor();
    assert.equal(await page.getByText('Ready to upload', { exact: true }).count(), 0);
    check('invalid type, corrupt photo and oversized input are rejected');

    await choose().setInputFiles(small('remove-before-upload'));
    await waitReady(1);
    await page.getByRole('button', { name: 'Remove remove-before-upload.jpg', exact: true }).click();
    assert.equal(await page.getByText('Ready to upload', { exact: true }).count(), 0);
    check('selected photos can be removed before upload');

    await choose().setInputFiles([large, small('retry-metadata'), small('lost-storage'), small('lost-metadata'), small('success'), small('extra')]);
    await waitReady(5);
    await page.getByText('Choose up to 5 photos per batch. Extra photos were not added.').waitFor();
    const dimensions = await page.locator('img[alt="Selected photo: large-phone.webp"]').evaluate(async img => {
      const blob = await (await fetch(img.src)).blob(); const bitmap = await createImageBitmap(blob);
      const result = { width: bitmap.width, height: bitmap.height, size: blob.size }; bitmap.close(); return result;
    });
    assert.equal(Math.max(dimensions.width, dimensions.height), 2048);
    assert(dimensions.size < 5 * 1024 * 1024 && dimensions.size < large.buffer.length);
    check(`five-photo limit and real compression (${Math.round(large.buffer.length / 1024)} KB to ${Math.round(dimensions.size / 1024)} KB)`);

    await page.getByLabel('Complaint title', { exact: true }).fill('Leaking pipe');
    await page.getByLabel('Description', { exact: true }).fill('Water is leaking beneath the sink.');
    await page.getByLabel('Building / room').selectOption('location-1');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(__dirname, 'complaint-photos-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Submit complaint', exact: true }).click();
    await page.getByText('2 of 5 photos uploaded', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Retry remaining photos' }).waitFor();
    assert.equal(creates, 1);
    assert.equal(rows.size, 3); // One metadata write succeeded even though its response was lost.
    assert.equal(await page.getByRole('button', { name: /^Remove / }).count(), 0);
    const successfulAttempts = Array.from(attempts).filter(([name]) => name.includes('large-phone') || name.includes('success'));
    await page.screenshot({ path: path.join(__dirname, 'complaint-photos-retry-mobile.png'), fullPage: true });
    check('partial uploads keep the saved complaint and expose individual failures');

    faults = false;
    await page.getByRole('button', { name: 'Retry remaining photos' }).click();
    await page.getByText('5 of 5 photos uploaded', { exact: true }).waitFor();
    assert.equal(creates, 1); assert.equal(rows.size, 5); assert.equal(objects.size, 5);
    for (const [name, count] of successfulAttempts) assert.equal(attempts.get(name), count);
    check('retry recovers metadata failures and lost responses without duplicate complaints, rows or storage objects');

    await page.getByRole('button', { name: 'View complaint' }).click();
    const ownerUpload = page.getByRole('region', { name: 'Add complaint photos', exact: true });
    await ownerUpload.waitFor();
    await page.reload();
    await ownerUpload.getByLabel('Choose photos', { exact: true }).setInputFiles(small('retry-metadata'));
    await waitReady(1);
    const totalBefore = Array.from(attempts.values()).reduce((a, b) => a + b, 0);
    await ownerUpload.getByRole('button', { name: 'Upload selected photos' }).click();
    await ownerUpload.getByText('1 of 1 photos uploaded', { exact: true }).waitFor();
    assert.equal(rows.size, 5); assert.equal(objects.size, 5);
    assert.equal(Array.from(attempts.values()).reduce((a, b) => a + b, 0), totalBefore);
    check('reselecting the same photo after refresh recognizes the uploaded evidence');

    await ownerUpload.getByRole('button', { name: 'Choose another batch' }).click();
    await ownerUpload.getByLabel('Choose photos', { exact: true }).setInputFiles(small('additional'));
    await waitReady(1);
    await ownerUpload.getByRole('button', { name: 'Upload selected photos' }).click();
    await ownerUpload.getByText('1 of 1 photos uploaded', { exact: true }).waitFor();
    assert.equal(rows.size, 6); assert.equal(creates, 1);
    check('missing photos can be attached to an existing complaint');

    await page.goto(`${base}/maintenance/complaints/${complaint.id}?testRole=maintenance`);
    const afterUpload = page.getByRole('region', { name: 'After photos', exact: true });
    await afterUpload.getByLabel('Choose photos', { exact: true }).setInputFiles([small('repair-one'), small('repair-two')]);
    await waitReady(2);
    await afterUpload.getByRole('button', { name: 'Upload selected photos' }).click();
    await afterUpload.getByText('2 of 2 photos uploaded', { exact: true }).waitFor();
    await page.getByText('After-repair photo: successfully uploaded', { exact: true }).waitFor();
    assert.equal(Array.from(rows.values()).filter(row => row.photo_type === 'after' && row.uploaded_by === 'maintenance-a').length, 2);
    check('maintenance supports multiple after-repair photos and updates completion evidence');
    assert.deepEqual(runtimeErrors, []);
    check('mobile layout fits and no browser runtime errors occurred');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
