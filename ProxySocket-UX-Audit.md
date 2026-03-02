# ProxySocket — UI/UX Audit

**Date:** March 2026  
**Auditor perspective:** 30 years product design experience  
**Benchmark apps:** ExpressVPN, NordVPN, Surfshark, Shadowrocket, Proton VPN, Mullvad

---

## Executive Summary

ProxySocket is functional but looks like a developer built it for developers. The bones are solid — the navigation is logical, the connection flow works. But it's missing the polish, personality, and confidence that separates "works fine" from "I trust this with my traffic." Every top VPN/proxy app in 2026 has converged on a few core UX principles: one-tap connection, a prominent visual status indicator, and trust signals everywhere. ProxySocket has the architecture for all of these but under-delivers on execution.

Below are the issues ranked by impact on user retention and App Store approval.

---

## 1. No Onboarding — Critical

**The problem:** First-time users land on HomeView with no context. They see "SOCKS5 Proxy Client" and two options (custom proxy, 9Proxy) with zero explanation of what this app does, why they need it, or what SOCKS5 even means.

**Why it matters:** 25% of apps are uninstalled after one session. Your target users (PIA S5, 9Proxy, 922 Proxy customers) know what SOCKS5 is, but Apple reviewers don't. A brief onboarding also signals professionalism during App Store review.

**The fix:** Add a 2-3 screen onboarding flow shown only on first launch. Keep it to:
- Screen 1: "Route all your phone traffic through any SOCKS5 proxy" with a clean illustration
- Screen 2: "Enter your proxy details or connect your 9Proxy account" 
- Screen 3: VPN permission explanation — "ProxySocket needs VPN permission to create a secure tunnel. We never see or store your traffic."

This last screen is critical because the system VPN permission dialog is jarring without context. Pre-explaining it dramatically improves the approval rate of that dialog.

---

## 2. Connection Screen Lacks Confidence — High Impact

**The problem:** The ConnectionView has a status ring, proxy info, and a connect button — the right pieces. But the ring animation is basic, the IP display at the bottom says "—" when disconnected (tells the user nothing), and there's no visual celebration when connected.

**What competitors do:** ExpressVPN has a big satisfying "one-tap" button with a haptic pulse and color shift. Surfshark uses a smooth map animation. Even Shadowrocket uses a simple but clear toggle with immediate status feedback.

**The fix:**
- Show the user's real IP when disconnected ("Your IP: 73.x.x.x — Exposed") and proxy IP when connected ("Your IP: 154.x.x.x — Protected"). This is the "aha moment" — visible proof the app works. Use `api.ipify.org` which you already reference in your codebase.
- Add haptic feedback on connect/disconnect (`UIImpactFeedbackGenerator`)
- The ring animation should be smoother — use a spring animation instead of easeInOut
- Add a subtle confetti or shield animation on successful connection

---

## 3. HomeView Information Density — High Impact

**The problem:** HomeView tries to show everything at once: header, status banner, connect section, saved proxies, and providers. On smaller iPhones (SE, Mini) this means scrolling past multiple cards before you can do anything. The visual hierarchy is flat — every card has the same weight.

**What works in top apps:** One dominant action above the fold. NordVPN shows the map + connect button. ExpressVPN shows one big button. Mullvad shows status + connect. Everything else is secondary.

**The fix:**
- Make the "Connect" section larger and more prominent — it should take 40-50% of the visible screen
- If the user has saved proxies, the most recent one should be the primary CTA: "Quick Connect to [last used proxy]" as a big button, not a small row
- Move "Proxy Providers" to a settings/account tab or put it below the fold — it's a setup-once action, not a daily action
- Consider a tab bar: **Home** (connect + status) | **Proxies** (saved list + add new) | **Settings** (providers, about, etc.)

---

## 4. No Tab Bar Navigation — Medium-High Impact

**The problem:** The app uses a single NavigationStack with push/pop. Every feature requires tapping into a card and then backing out. This is fine for 3-4 screens but gets tedious fast, especially when switching between the 9Proxy dashboard and custom proxies.

**What competitors do:** Every major VPN app uses a tab bar. It's the iOS standard for apps with 3-5 top-level sections.

**The fix:** Add a bottom tab bar with 3-4 tabs:
- **Connect** — Main connection screen with quick connect
- **Proxies** — Saved proxies list + add custom proxy
- **9Proxy** — Dashboard (if logged in) or login prompt
- **Settings** — About, privacy policy, update checker, logout

This eliminates the black screen issue on 9Proxy back-navigation entirely, and makes the app feel like a real product instead of a prototype.

---

## 5. Custom Proxy Form UX — Medium Impact

**The problem:** CustomProxyView has good functionality (paste parsing, manual input, save toggle) but the form feels clinical. The paste field is hidden behind a button. The "Authentication (optional)" label is vague. There's no inline validation.

**The fix:**
- Make the paste field always visible — it's the fastest path for your core user who copies `ip:port:user:pass` from their desktop. Put it at the TOP as a big text field: "Paste your proxy string"
- Auto-parse on paste (detect clipboard content on view appear, offer to auto-fill)
- Add inline validation: red border + "Invalid port" if port > 65535, "Host required" if empty
- Show a live preview: "Will connect to: 154.x.x.x:1080 via SOCKS5 with auth" before they hit connect
- The connect button should show what's happening: "Connect to 154.x.x.x" not just "Connect"

---

## 6. 9Proxy Dashboard Complexity — Medium Impact

**The problem:** NineProxyDashboardView is packed. Balance card, sub-user selection, tab picker, proxy settings with country/state/city/ISP/duration pickers, usage history, logout — all on one scrollable page. It's overwhelming for a mobile screen.

**The fix:**
- Split into two clear sections via the existing tab picker (which is good) but make it a proper segmented control, not custom buttons
- "Create Proxies" tab: simplify to Country picker → Connect. The state/city/ISP picker should be a "Advanced Filters" expandable section, collapsed by default. 90% of users just pick a country.
- Duration: replace the -1/+1 stepper with preset buttons (5m, 30m, 1h, 12h, 24h) — nobody is tapping minus 1439 times to get from 1440 to 1
- "Usage History" tab: this is good as-is, just needs pull-to-refresh

---

## 7. Visual Design Language — Medium Impact

**The problem:** The app uses system defaults everywhere. `.systemGroupedBackground`, `.systemBackground`, default corner radii, default shadows. It looks like a Settings screen, not a product. There's no brand color, no personality, no signature element.

**What competitors do:** ExpressVPN owns red + green. NordVPN owns dark blue + mountain imagery. Surfshark uses teal + playful illustrations. Mullvad uses yellow + brutalist typography. Every one has a visual identity you'd recognize in a screenshot.

**The fix:**
- Pick ONE signature color for ProxySocket (blue is fine but commit to a specific shade — not system blue)
- Create a simple but memorable connection animation — this is what users see 10x/day
- Use SF Pro Display for headings (already system font, but use the Bold/Heavy weights intentionally)
- Add subtle gradient backgrounds instead of flat gray — dark mode should feel premium, not just inverted
- The app icon should echo the in-app color scheme

---

## 8. No Haptic Feedback — Low-Medium Impact

**The problem:** Zero haptic feedback anywhere. Connect, disconnect, toggle, parse — all silent taps.

**Why it matters:** iOS users subconsciously associate haptics with quality. Every Apple app, every top VPN app uses them. Their absence makes the app feel flat.

**The fix:** Add `UIImpactFeedbackGenerator` for:
- Connect button tap (medium impact)
- Successful connection (success notification feedback)
- Disconnect (light impact)
- Proxy string parsed successfully (light impact)
- Error states (error notification feedback)

This is 15 minutes of work with massive perceived quality improvement.

---

## 9. No Connection Timer — Low-Medium Impact

**The problem:** When connected, the user sees "Connected" and the proxy address. They have no sense of how long they've been connected or if the connection is still active.

**What competitors do:** Every VPN app shows a live timer: "Connected 00:12:34". It's a constant reassurance that the tunnel is alive.

**The fix:** Add a simple timer that starts on connection and displays in ConnectionView and the HomeView status banner. Use a `Timer.publish` that ticks every second. Show as "Connected · 2h 14m" (don't need seconds precision after the first minute).

---

## 10. Error States Need Humanity — Low Impact

**The problem:** Error messages are technical: "VPN error: ... (code: 1)", "Load failed: ...", "Session expired. Please login again." The `userFriendlyError()` function in ConnectionView is a good start but incomplete.

**The fix:**
- Every error should have: what happened (1 line), what to do about it (1 line), and optionally a retry button
- "Couldn't reach proxy" → "The proxy server didn't respond. Check the IP and port, or try a different proxy." + [Try Again] button
- "VPN permission denied" → "ProxySocket needs VPN permission to work." + [Open Settings] button that deep-links to Settings
- Never show raw error codes to users

---

## 11. No Empty States — Low Impact

**The problem:** When there are no saved proxies, that section just doesn't appear on HomeView. The user doesn't know the feature exists.

**The fix:** Show a subtle empty state: a dashed-border card with "Save your first proxy for quick reconnection" or similar. This teaches the feature and makes the home screen feel complete even when empty.

---

## 12. Accessibility Gaps — Low Impact (High for App Store)

**The problem:** No explicit accessibility labels. VoiceOver users would hear "bolt.fill" instead of "Quick connect to US proxy". No Dynamic Type support verification. Color-only status indicators (green dot = connected).

**The fix:**
- Add `.accessibilityLabel()` to all buttons and status indicators
- Pair every color indicator with a text label or icon (you already do this in most places — verify it's consistent)
- Test with Dynamic Type XXL to ensure nothing clips or overlaps

---

## Priority Roadmap

### Do Now (before App Store resubmission)
1. Add haptic feedback (30 min)
2. Show real IP when disconnected, proxy IP when connected (1 hr)
3. Fix duration stepper to preset buttons (30 min)
4. Add basic onboarding (2-3 hrs)

### Do Next (v1.1)
5. Tab bar navigation
6. Connection timer
7. Simplify 9Proxy dashboard
8. Empty states
9. Inline form validation

### Do Later (v1.2+)
10. Visual rebrand with signature color/animation
11. Full accessibility audit
12. Auto-paste detection from clipboard

---

## One Design Principle to Remember

The best proxy/VPN apps in 2026 all follow one rule: **the connection state should be obvious from across the room.** A glance at the phone should tell you: am I protected or not? Every design decision should serve that single clarity.
