# Final Devpost checklist

> Final TLS update (November 8): Tiger replaced its initial certificate. Fresh certificate-only checks now pass with Node bundled public CA roots and hostname verification (issuer WR1). The original extracted CA remains unauthenticated and is no longer used. Cloud reconciliation and reader permissions passed again over public trust, and the administrator password was rotated and verified. Its replacement is only in ignored .env.tiger-admin-rotated.local; .env.local is unchanged. npm run tiger:import loads that override. Windows libpq uses the ignored .env.tiger-public-roots.pem exported from Node bundled public roots. Preview and Production use the reader and standard public roots, without TIGER_CA_CERT. The owner reports the preview works; desktop public HTTPS/POST probes remain unverified due to certificate interception. This update supersedes older provisional-trust/pending-rotation statements below. Domain actions remain on hold.

- [x] Preserve all six Dashboard Royale questions, four judge workflows and current financial recommendation.
- [x] Baseline 107 tests pass before sponsor work; preserve core commit 8cc7cfa.
- [x] Vercel core reports READY/production, correct repository/master branch and server-only Gemini variables.
- [x] Owner confirms immutable core URL opens on cellular HTTPS.
- [ ] Trusted-HTTPS deployed Gemini POST returns mode=live with machine, operational and both portfolio evidence.
- [x] Full local TimescaleDB import, daily reconciliation, CAGG equality, actual reader API and measured benchmark.
- [x] Import Cloud data and verify reconciliation, reader write denial, actual API and benchmarks under owner's provisional development trust exception.
- [x] Configure Cloud reader/CA/schema/label only for Vercel Preview, with the provisional-development label.
- [ ] Independently authenticate Tiger Cloud CA or obtain a publicly trusted replacement; revalidate and rotate administrator password before production trust.
- [ ] Verify Hourly Explorer preview, then production; original dashboard works during database failure.
- [ ] Verify desktop/mobile charts, keyboard/touch floor map, Help return and exports in a real browser.
- [ ] Domain on hold: owner handles registration/promo/payment manually; await the registered name and integration authorization.
- [ ] After authorization, configure exact requested DNS, verify HTTPS and custom-origin API behavior.
- [ ] Verify organizer calibration/publication clearance and third-party attribution; do not redistribute restricted raw inputs.
- [ ] Rehearse and record the two-minute investment-centered video; the script is not a video.
- [ ] Submit the actual public URL, repository, under-400-word write-up and honest sponsor evidence to the event's Devpost.

See SPONSOR_EVIDENCE.md for actual status and SPONSOR_RELEASE_AUDIT.md for test results. Do not mark pending items complete from account configuration alone.
