# Android download — 18 October 2026

The public site serves `/downloads/spawt-1.1.1-build32.apk` directly from its nginx image. It is not a Google Play release.

- Version: 1.1.1, build 32, created 17 October 2026.
- App source: aff0e1f2129539659ff0ead4790fa2d899d39344.
- Bytes: 162441167.
- SHA-256: ed1693324b285237276116396102bd76447ea08ed8caf1810eda1a82927267e1.
- Transport archive contains only the APK, no documents or credentials.
- Docker rejects any archive or decompressed binary that fails its pinned checksum.
- Source binary is preserved in the existing Application Drive folder, without changing folder permissions.
- Apple remains « Bientôt sur iOS » unless the configured App Store link exists.
- Pictogram sources: Simple Icons, CC0 (`android.svg`, `apple.svg`); platform names remain their owners’ trademarks.

For the next release, replace the archive URL, both checksums, size, version labels and filename together, run the portal CI, then redeploy only the portal in Coolify. Test the final APK bytes from the public site before reporting completion. A rollback to the preceding image restores the previous website.
