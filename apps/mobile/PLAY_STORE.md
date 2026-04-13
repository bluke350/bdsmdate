# Play Store / Android release checklist

This project is an Expo-managed app. The files added/updated here prepare the repo to build an Android app bundle (.aab) suitable for the Google Play Console using EAS.

What I added

- Updated `app.json` with Android `package`, `versionCode`, `icon`, and `splash` entries.
- Added `eas.json` with `production`, `preview`, and `development` build profiles.
- Added an npm script: `npm run build:android` → `eas build -p android --profile production`.

Next steps (required before uploading to Play Console)

1. Set a unique Android package name in `app.json` (`expo.android.package`).
   - Current value: `com.bdsmdate.app` — change this to your own reverse-domain ID.

2. Install EAS CLI (on your machine):

```bash
npm install -g eas-cli
# or
yarn global add eas-cli
```

3. Login and configure:

```bash
eas login
cd apps/mobile
```

4. Let EAS manage credentials (recommended) or provide your own keystore.
   - To let EAS handle it interactively while building, run:

```bash
eas build -p android --profile production
```

- To generate a local keystore (example):

```bash
keytool -genkeypair -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload -dname "CN=Your Name, OU=Dev, O=Org, L=City, S=State, C=US"
```

- Then import it using EAS:

```bash
eas credentials -p android
# follow prompts to add upload key / keystore
```

5. Versioning rules
   - Update `expo.version` in `app.json` for the user-facing version (e.g., `1.0.1`).
   - Increment `expo.android.versionCode` (integer) for each Play Store release.

6. Build and download the .aab

```bash
npm run build:android
# or
eas build -p android --profile production
```

After the build completes, download the generated `.aab` from EAS and upload to Play Console.

7. Play Console
   - Create a Google Play Developer account.
   - Create a new app and upload the `.aab`.
   - Fill in store listing (title, short description, full description), screenshots, content rating, and privacy policy.

Notes and reminders

- Ensure you supply proper high-resolution icon and splash images. I pointed `app.json` at existing images under `assets/images/` but it's best to provide an icon that's square and a dedicated adaptive icon (`foreground` + `background`).
- If you use Firebase or other native services, add `google-services.json` to the project and reference it in `app.json` (`expo.android.googleServicesFile`).
- EAS will guide you through Play App Signing upload key options; follow its prompts if you want EAS to manage keys.

If you'd like, I can:

- Generate a minimal keystore here (I can run `keytool`) and add instructions to safely store it.
- Replace the image references with newly created placeholder PNGs sized for Play Store recommendations.
- Run an `eas build` (requires `eas-cli` and your login) and capture the build URL.

## Keystore created locally

I generated a local keystore at `keystore/keystore.jks` inside the `apps/mobile` folder using a temporary password.

- Path: `apps/mobile/keystore/keystore.jks`
- Store password: `changeit` (used for generation only — rotate and secure this immediately)

This file is added to `.gitignore` to avoid committing it. For production, either:

- Upload your keystore / upload key to the Play Console and configure Play App Signing, or
- Use `eas credentials` to securely store and manage credentials with EAS.

If you want me to remove the keystore from the machine and instead provide the `keytool` command for you to run locally, tell me and I'll delete the generated file.
