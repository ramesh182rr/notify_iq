# Local Development Environment Setup

## Required tools
- Node.js LTS compatible with the current React Native release.
- React Native Community CLI / Bare workflow.
- JDK version required by the selected React Native/Android Gradle Plugin versions.
- Android Studio and Android SDK Platform Tools.
- Python 3.11+ (or version selected for FastAPI dependencies).
- Git, VS Code and Codex.
- Physical Android phone with USB debugging enabled.

## Setup order
1. Install Node and package manager.
2. Install JDK and confirm `java -version`.
3. Install Android Studio, SDK, emulator tools and platform tools.
4. Configure `ANDROID_HOME` and platform-tools PATH according to React Native docs.
5. Install Python and create virtual environment.
6. Install Git and configure user identity.
7. Install VS Code extensions: React Native Tools (optional), Python, Pylance, ESLint, Prettier, GitLens (optional).
8. Install Codex using its current official instructions.
9. Create RN app and run on a physical device before adding app features.

## Verify
```bash
node --version
npm --version
java -version
adb version
python --version
git --version
```

React Native environment setup changes across releases. Follow the official current setup guide rather than relying on copied version-specific commands.
