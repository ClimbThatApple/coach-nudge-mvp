/**
 * Playwright demo recorder for CoachNudge MVP — v6.
 *
 * Usage:
 *   1. npm run dev
 *   2. npx tsx demo/record-demo.ts
 */

import { chromium, type Page, type Locator } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1280, height: 720 };
const RECORDINGS_DIR = path.resolve('./demo/recordings');
const SCREENSHOTS_DIR = path.resolve('./demo/screenshots');

async function pause(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

let screenshotIdx = 0;
async function snap(page: Page, label: string) {
  screenshotIdx++;
  const name = `${String(screenshotIdx).padStart(2, '0')}-${label.replace(/\s+/g, '-').toLowerCase()}.png`;
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, name) });
}

// ─── Cursor ───

async function injectCursor(page: Page) {
  await page.evaluate(() => {
    document.getElementById('pw-cursor')?.remove();
    document.getElementById('pw-cursor-style')?.remove();

    const style = document.createElement('style');
    style.id = 'pw-cursor-style';
    style.textContent = `
      * { cursor: none !important; }
      @keyframes pw-click-ring { 0% { transform:scale(0.5); opacity:0.7; } 100% { transform:scale(2.2); opacity:0; } }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = 'pw-cursor';
    Object.assign(cursor.style, {
      position: 'fixed', zIndex: '200000', pointerEvents: 'none',
      left: '-100px', top: '-100px',
    });
    cursor.innerHTML = `
      <div id="pw-cursor-ring" style="
        position:absolute; top:-16px; left:-16px;
        width:40px; height:40px; border-radius:50%;
        border: 2.5px solid rgba(220,38,38,0.6);
        background: rgba(220,38,38,0.08);
        transition: transform 0.12s ease;
      "></div>
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none" style="filter:drop-shadow(1px 2px 3px rgba(0,0,0,0.4))">
        <path d="M2 2L2 22L7 17L11.5 27L15 25.5L10.5 16L17.5 16L2 2Z"
          fill="white" stroke="black" stroke-width="2" stroke-linejoin="round"/>
      </svg>`;
    document.body.appendChild(cursor);
  });
}

async function moveCursorTo(page: Page, x: number, y: number, ms = 600) {
  await page.evaluate(({ x, y, ms }) => {
    const c = document.getElementById('pw-cursor');
    if (!c) return;
    c.style.transition = `left ${ms}ms cubic-bezier(0.25,0.1,0.25,1), top ${ms}ms cubic-bezier(0.25,0.1,0.25,1)`;
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
  }, { x, y, ms });
  await pause(ms + 60);
}

async function moveCursorToLocator(page: Page, loc: Locator, ms = 600) {
  const box = await loc.boundingBox();
  if (!box) return;
  await moveCursorTo(page, box.x + box.width / 2, box.y + box.height / 2, ms);
}

async function animateClick(page: Page) {
  await page.evaluate(() => {
    const ring = document.getElementById('pw-cursor-ring');
    if (ring) ring.style.transform = 'scale(0.8)';
    const cursor = document.getElementById('pw-cursor');
    if (!cursor) return;
    const ripple = document.createElement('div');
    Object.assign(ripple.style, {
      position: 'absolute', top: '-16px', left: '-16px',
      width: '40px', height: '40px', borderRadius: '50%',
      background: 'rgba(220,38,38,0.3)',
      animation: 'pw-click-ring 0.4s ease-out forwards', pointerEvents: 'none',
    });
    cursor.appendChild(ripple);
    setTimeout(() => { if (ring) ring.style.transform = 'scale(1)'; ripple.remove(); }, 400);
  });
}

async function cursorClick(page: Page, loc: Locator, hover = 350) {
  await moveCursorToLocator(page, loc, 600);
  await pause(hover);
  await animateClick(page);
  await pause(120);
  await loc.click({ force: true });
  await pause(250);
}

async function cursorType(page: Page, loc: Locator, text: string, delay = 25) {
  await moveCursorToLocator(page, loc, 500);
  await pause(250);
  await animateClick(page);
  await pause(100);
  await loc.click({ force: true });
  await pause(100);
  await loc.type(text, { delay });
}

// ─── Banner (top, compact, no overlap) ───

async function showBanner(page: Page, text: string, sub: string, color: string) {
  await page.evaluate(({ text, sub, color }) => {
    let el = document.getElementById('pw-demo-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pw-demo-banner';
      Object.assign(el.style, {
        position: 'fixed', top: '12px', left: '200px', right: '140px',
        zIndex: '99998',
        display: 'flex', justifyContent: 'center',
        transition: 'opacity 0.3s ease', opacity: '0', pointerEvents: 'none',
      });
      document.body.appendChild(el);
    }
    el.innerHTML = `<div style="background:${color};color:#fff;border-radius:8px;padding:6px 16px;box-shadow:0 2px 12px rgba(0,0,0,0.2);max-width:600px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
      <span style="font-weight:600;font-size:12px">${text}</span>
      <span style="opacity:0.8;font-size:11px;margin-left:8px">${sub}</span>
    </div>`;
    void el.offsetHeight;
    el.style.opacity = '1';
  }, { text, sub, color });
}

async function hideBanner(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById('pw-demo-banner');
    if (el) el.style.opacity = '0';
  });
}

// ─── Full-screen card ───

async function showCard(page: Page, id: string, bg: string, html: string) {
  await page.evaluate(({ id, bg, html }) => {
    const el = document.createElement('div');
    el.id = id;
    Object.assign(el.style, {
      position: 'fixed', inset: '0', zIndex: '200001',
      background: bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: '0', transition: 'opacity 0.5s ease',
    });
    el.innerHTML = html;
    document.body.appendChild(el);
    void el.offsetHeight;
    el.style.opacity = '1';
  }, { id, bg, html });
}

async function hideCard(page: Page, id: string) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }
  }, id);
  await pause(600);
}

// ─── Main ───

async function main() {
  if (fs.existsSync(SCREENSHOTS_DIR)) fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: RECORDINGS_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss());

  await page.goto(`${BASE}/?pw=true`);
  await page.waitForLoadState('networkidle');
  await injectCursor(page);
  await pause(500);

  // ═══ OPENING: Problem + Product ═══
  await showCard(page, 'pw-problem', 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    `<div style="text-align:center;max-width:640px;padding:40px">
      <div style="font-size:18px;color:rgba(255,255,255,0.5);margin-bottom:24px;line-height:1.6">
        Managers forget to give feedback.<br>
        Coaching notes live in scattered docs.<br>
        Meeting prep happens too late — or not at all.
      </div>
      <div style="width:60px;height:1px;background:rgba(255,255,255,0.2);margin:0 auto 24px"></div>
      <div style="font-size:44px;font-weight:800;color:white">CoachNudge</div>
      <div style="font-size:17px;color:rgba(255,255,255,0.6);margin-top:16px;line-height:1.5">AI-powered coaching nudges that help managers develop their teams — right when it matters most.</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:28px;border-top:1px solid rgba(255,255,255,0.1);padding-top:16px">Scenario: You're a consulting manager running a case team.</div>
    </div>`);
  await pause(1500);
  await snap(page, 'title');
  await pause(3000);
  await hideCard(page, 'pw-problem');

  // ═══ FAST SETUP: Load case quickly ═══
  await showBanner(page, 'Loading your case team', 'Enter a case code to pull up your supervisees and calendar', '#111827');
  await pause(800);

  const caseInput = page.locator('input[placeholder*="DEMO"], input[placeholder*="case"], input[placeholder*="Case"]').first();
  await cursorType(page, caseInput, 'DEMO', 80);
  await pause(300);
  await cursorClick(page, page.getByRole('button', { name: /load/i }).first());
  await pause(1500);
  await snap(page, 'dashboard');

  // ═══ CALENDAR: Show how the system sees meetings ═══
  await showBanner(page, 'Your Calendar', 'Meetings with coaching opportunities are highlighted automatically', '#6d28d9');
  await pause(800);
  await cursorClick(page, page.locator('aside a[href="/calendar"]').first());
  await page.goto(`${BASE}/calendar?pw=true`);
  await page.waitForSelector('h1:has-text("Calendar")');
  await injectCursor(page);
  await moveCursorTo(page, 640, 300, 1);
  await pause(2000);
  await snap(page, 'calendar-week');

  // Switch to list view for clearer event details
  await showBanner(page, 'Upcoming meetings', 'Each event shows which supervisees attend and what coaching opportunities apply', '#6d28d9');
  const listBtn = page.getByRole('button', { name: /list/i });
  if (await listBtn.isVisible().catch(() => false)) {
    await cursorClick(page, listBtn, 300);
    await pause(1500);
    await snap(page, 'calendar-list');
  }
  await pause(1000);

  // ═══ CORE LOOP: The three nudges ═══

  // -- Open Nick from sidebar
  await showBanner(page, 'Opening a team member', 'Each person has coaching notes, development goals, and documents', '#111827');
  await pause(600);
  await cursorClick(page, page.locator('aside a[href="/supervisee/supervisee-nick-chen"]').first());
  await page.goto(`${BASE}/supervisee/supervisee-nick-chen?pw=true`);
  await page.waitForSelector('h1:has-text("Nick Chen")');
  await injectCursor(page);
  await moveCursorTo(page, 640, 300, 1);
  await pause(800);
  await snap(page, 'nick-profile');

  // -- Show Development tab (foreshadows the AI matching in Nudge 2)
  await showBanner(page, 'Development Goals', 'These skills will be matched to upcoming meetings by AI', '#374151');
  await cursorClick(page, page.getByRole('button', { name: /Development/ }).first(), 250);
  await pause(1500);
  await snap(page, 'development-goals');

  // Quick tour of remaining tabs
  for (const tabName of ['Documents', 'Synthesis']) {
    await showBanner(page, tabName, tabName === 'Documents' ? 'Coaching preferences and background info' : 'AI-generated summary of coaching patterns', '#374151');
    await cursorClick(page, page.getByRole('button', { name: new RegExp(tabName) }).first(), 250);
    await pause(800);
  }
  // Back to Notes for the nudge flow
  await cursorClick(page, page.getByRole('button', { name: /Notes/ }).first(), 200);
  await pause(600);

  // ── NUDGE 1: Reflection ──
  await showBanner(page, '💡 Nudge 1: Reflection', 'The system periodically prompts you to reflect on each team member', '#1d4ed8');
  await pause(2000);
  await cursorClick(page, page.getByRole('button', { name: 'Reflection Nudge' }));
  await pause(400);
  await page.evaluate(() => {
    const d = (window as any).__demo;
    if (!d || d.state.activeNudge) return;
    const nick = d.state.supervisees.find((s: any) => s.id === 'supervisee-nick-chen');
    if (nick) d.triggerReflectionNudge(nick);
  });
  await pause(1200);

  const toast = page.locator('[data-nudge-toast]');
  await toast.waitFor({ timeout: 5000 });
  await cursorClick(page, toast, 400);
  await pause(500);
  await snap(page, 'reflection-nudge');

  const nudgeTa = page.locator('[data-nudge-expanded] textarea');
  await nudgeTa.waitFor({ timeout: 3000 });
  await cursorType(page, nudgeTa,
    'Nick showed great initiative — volunteered to lead the client workshop prep.', 25);
  await pause(500);
  await cursorClick(page, page.locator('[data-nudge-expanded] button[type="submit"]'));
  await pause(1200);
  await showBanner(page, 'Observation saved', 'Added to Nick\'s coaching history for future reference', '#15803d');
  await pause(1500);

  // ── NUDGE 2: Pre-Meeting ──
  await showBanner(page, '💡 Nudge 2: Pre-Meeting Prep', 'Calendar detects a client meeting with Nick tomorrow — coaching tips generated automatically', '#b45309');
  await pause(2500);
  await snap(page, 'pre-meeting-banner');

  await page.evaluate(() => {
    const d = (window as any).__demo;
    if (!d) return;
    const nick = d.state.supervisees.find((s: any) => s.id === 'supervisee-nick-chen');
    if (!nick) return;
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
    const event = d.state.calendarEvents.find((e: any) => {
      const dt = new Date(e.startTime);
      return dt.toDateString() === tmrw.toDateString()
        && e.attendees.some((a: any) => a.superviseeId === 'supervisee-nick-chen')
        && e.attendees.some((a: any) => a.isExternal);
    });
    if (!event) return;
    const matches = d.getMatchedOpportunities(event).filter((m: any) => m.superviseeId === 'supervisee-nick-chen');
    const tips = matches.map((m: any) => `- **${m.opportunityLabel}**: ${m.coachingTip}`).join('\n');
    d.triggerPreMeetingNudge(nick, event,
      `**Tomorrow: ${event.title}**\n\n${nick.name} has development opportunities relevant to this meeting:\n\n${tips}\n\nPlan how to create space for ${nick.name} to practice these skills.`);
  });
  await pause(1200);

  const preToast = page.locator('[data-nudge-toast]');
  await preToast.waitFor({ timeout: 5000 });
  await cursorClick(page, preToast, 400);
  await pause(500);
  await showBanner(page, 'AI matched Nick\'s development goals to tomorrow\'s meeting', 'Client Communication & Executive Presence coaching tips', '#b45309');
  await snap(page, 'pre-meeting-expanded');
  await pause(5000); // Extra time for viewer to read coaching tips

  const dismissBtn = page.locator('[data-nudge-expanded] button[class*="bg-amber"]').first();
  if (await dismissBtn.isVisible().catch(() => false)) {
    await cursorClick(page, dismissBtn);
  } else {
    await cursorClick(page, page.locator('[data-nudge-expanded] button').last());
  }
  await pause(1200);

  // ── NUDGE 3: Post-Meeting Debrief ──
  await showBanner(page, '💡 Nudge 3: Post-Meeting Debrief', 'A meeting with Nick just ended — the system asks you to capture observations', '#4338ca');
  await pause(2500);

  await page.evaluate(() => {
    const d = (window as any).__demo;
    if (!d) return;
    const nick = d.state.supervisees.find((s: any) => s.id === 'supervisee-nick-chen');
    if (!nick) return;
    const past = d.state.calendarEvents.find((e: any) =>
      new Date(e.endTime) < new Date()
      && e.attendees.some((a: any) => a.superviseeId === 'supervisee-nick-chen')
      && e.attendees.some((a: any) => a.isExternal));
    if (past) d.triggerPostMeetingNudge(nick, past);
  });
  await pause(1200);

  const postToast = page.locator('[data-nudge-toast]');
  await postToast.waitFor({ timeout: 5000 });
  await cursorClick(page, postToast, 400);
  await pause(500);

  const debriefTa = page.locator('[data-nudge-expanded] textarea');
  await debriefTa.waitFor({ timeout: 3000 });
  await cursorType(page, debriefTa,
    'Nick handled the CFO questions confidently. Coach him to own the full technical narrative next time.', 20);
  await snap(page, 'post-meeting-typing');
  await pause(500);
  await cursorClick(page, page.locator('[data-nudge-expanded] button[type="submit"]'));
  await pause(1200);

  // Show notes payoff
  await showBanner(page, 'Coaching history grows over time', 'Every nudge response becomes a permanent coaching record', '#15803d');
  await cursorClick(page, page.getByRole('button', { name: /Notes/ }).first(), 300);
  await pause(2000);
  await snap(page, 'notes-payoff');
  await pause(1500);

  // ═══ ASSISTANT SECTION (brief — single overview) ═══
  await hideBanner(page);
  await showBanner(page, 'Also: Assistant Tracking', 'Notes, improvement areas, meeting tracker, and weekly recaps for executive assistants', '#0f766e');
  await pause(800);
  await cursorClick(page, page.locator('aside a[href="/assistant/assistant-linda-martinez"]').first());
  await page.goto(`${BASE}/assistant/assistant-linda-martinez?pw=true`);
  await page.waitForSelector('h1:has-text("Linda")');
  await injectCursor(page);
  await moveCursorTo(page, 640, 300, 1);
  await pause(1500);
  // Click Improvement Areas to show the structured tracking
  await cursorClick(page, page.getByRole('button', { name: /Improvement/ }).first(), 250);
  await pause(1200);
  await snap(page, 'assistant-overview');
  await pause(800);

  // ═══ CLOSING ═══
  await hideBanner(page);
  await showCard(page, 'pw-close', 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    `<div style="text-align:center;max-width:700px;padding:48px">
      <div style="font-size:48px;font-weight:800;color:white">CoachNudge</div>
      <div style="font-size:20px;color:rgba(255,255,255,0.6);margin-top:16px">Better coaching, one nudge at a time.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:40px;text-align:left">
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px">
          <div style="font-size:15px;font-weight:600;color:white">Reflection Prompts</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px">Periodic check-ins on each team member</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px">
          <div style="font-size:15px;font-weight:600;color:white">Meeting Prep</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px">AI coaching tips matched to development goals</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px">
          <div style="font-size:15px;font-weight:600;color:white">Post-Meeting Debriefs</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px">Capture observations right after key meetings</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px">
          <div style="font-size:15px;font-weight:600;color:white">Assistant Tracking</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px">Notes, improvement areas, and weekly recaps</div>
        </div>
      </div>
    </div>`);
  await pause(1500);
  await snap(page, 'closing');
  await pause(3000);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) console.log(`\n✅ Video: ${await video.path()}`);
  console.log(`📸 Screenshots: ${SCREENSHOTS_DIR}/`);
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
