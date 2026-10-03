# Actual URLSession TLS handshake verification

Scoped follow-up to ownership repair `ae8624d2303f8bc76fd5245f8f82bd0cd5d0711a`. No production source changes were needed. The committed production `API.swift` SHA-256 remains `b01168ffffdf09b2ce0b2798d487426aaf192be3349d00d9f454b540808cf02a`.

## Verified outcomes

The `MissionControlTLSTests` bundle compiles the actual production `API.swift`, including `CertificatePinningDelegate`, and uses the default production ephemeral URLSession. It makes real HTTPS requests to Python TLS servers bound exclusively to `127.0.0.1`. These tests use no URLProtocol, transport override, trust root installation, ATS exception or external service.

All 4 tests passed, zero failures, exit 0, on dedicated iOS 27 simulator `7BDDA9D9-34FD-4A11-8398-C84DF2560301`:

1. The matching synthetic leaf fingerprint completed TLS 1.2 with `ECDHE-RSA-CHACHA20-POLY1305`, delivered the synthetic A HTTP authorization, and decoded the real API response.
2. A mismatched synthetic leaf closed before an HTTP request or authorization reached the server.
3. A TCP connection was accepted while the TLS server withheld its handshake. The test switched API pairing to B, then released the handshake with certificate A. The server recorded a completed handshake and the original synthetic A request; the API returned cancellation because its response ownership had changed.
4. The same retained-handshake sequence with certificate B rejected the TLS connection and sent no HTTP authorization, even though the new current pairing used B's fingerprint.

The held servers wait before `wrap_socket`, so the pairing change occurs before the server certificate can reach URLSession's authentication challenge. This proves the request's original fingerprint is retained across the real challenge, separately from the post-response generation guard.

Production run: `/tmp/mission-tls-evidence.04PGeG/` (full `test.log`, `server-events.jsonl`, `tls.xcresult`). Adjacent `production-*` files retain compact durable receipts.

## Negative control and initial failure

An initial test build failed because XCTest assertion autoclosures cannot await a Task value; the fixture remained loopback-only and was cleaned up. That diagnostic is retained in `/tmp/mission-tls-evidence.MMw0pC/`.

A temporary, uncommitted negative control read a live shared fingerprint instead of the request's captured fingerprint. Matching/mismatching static checks still passed, while both pairing-change tests failed with 3 assertions: certificate B received the original A HTTP request, and certificate A was rejected after switching to B. This demonstrates that the ownership tests detect the prior live-pairing design. Result: `/tmp/mission-tls-evidence.Y6fO2p/`; compact results, server receipts and the exact temporary mutation patch are retained here. The production API was then restored byte-for-byte, with no diff from the accepted ownership commit. The negative-control failures are expected, not passing production evidence.

## Reproduce

From `mission-control/ios`:

```sh
MC_TLS_SIMULATOR=7BDDA9D9-34FD-4A11-8398-C84DF2560301 scripts/test-tls-loopback.sh
```

Use a dedicated available simulator UUID if that device is absent. The script generates fresh one-day RSA 2048/SHA-256 self-signed leaf certificates in a temporary directory, uses dynamically allocated loopback ports, creates an ignored runtime manifest resource, generates the ignored Xcode project, and runs the separate TLS test target. Each run retains logs and its result bundle in a fresh `/tmp/mission-tls-evidence.*` directory. Certificate private keys are never printed or committed. Fixture termination unwinds its temporary directory, closes its servers and removes the runtime manifest.

After the terminal runs, verification found no running `tls-loopback-fixture.py` process, zero remaining `mission-synthetic-tls-*` directories in Python's temporary directory, and no runtime manifest. There was no trust-store installation or modification. The runner also removes any stale ignored runtime manifest before starting a new fixture.

## Adaptations and limits

The test bundle is unhosted and uses default transport security without ATS exception keys; the production app additionally sets only `NSAllowsLocalNetworking`. TLS requests use the original production API/session configuration and pin policy. A separate ordinary URLSession makes HTTP calls to the loopback coordination server to observe accepted connections and release the handshake gates. Those calls do not replace or customize the production HTTPS transport.

This verifies real certificate challenge behavior on the simulator using synthetic leaves. It does not verify physical-device local-network permission, camera QR pairing, LAN discovery, production credentials/hosts, server deployment, TestFlight or App Store readiness. Production source, application Info.plist, identity and signing settings are unchanged. Original 12-test ownership and native-build evidence remains intact in `../pair-ownership/`.
