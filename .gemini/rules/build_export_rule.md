---
description: Forces the AI to read BUILD_GUIDE.md before building or exporting the application.
---
# Build and Export Rule

Whenever the user asks you to build, compile, package, or export the application (whether for Android APK or LG webOS IPK), you **MUST** first read the `BUILD_GUIDE.md` file located in the root of the project workspace.

**DO NOT** execute any build commands or attempt to present exported files to the user until you have read and understood the strict file output locations defined in `BUILD_GUIDE.md`.

**CRITICAL INSTRUCTION**: Do not copy build artifacts to your scratch folder. Always link the user to the standard output locations defined in `BUILD_GUIDE.md`.
