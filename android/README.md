# Anbu Assistant

React Native / Expo Android starter for a Tamil and English personal assistant.

## Project structure

```text
src/
  app/                    Expo Router screens and navigation
    _layout.tsx           Root layout and shared state provider
    (tabs)/               Today, Inbox, Calls and Settings tabs
  components/             Shared screen shell and UI components
  data/                   Sample inbox messages
  hooks/                  Assistant state and preference persistence
  providers/              Shared assistant context
  services/               Speech, calendar and SMS device actions
  theme/                  App styles
  types/                  Shared TypeScript types
  utils/                  Message priority helpers
assets/                   Images and icons
modules/anbu-notifications/ Android notification listener and offline speech
```

The app starts through `expo-router/entry`. Add screens under `src/app/` and keep shared code outside that folder. Source files use UTF-8 to preserve Tamil text.

## Run

```powershell
npm.cmd install
npm.cmd start
```

Open a compatible native Android development build, or run `npm.cmd start -- --go` for a local-only Expo Go preview. Google Drive sign-in and background backups require the native build. Device calendar, SMS, and speech need a real device or suitable emulator. Tamil speech depends on an installed Tamil text-to-speech voice. The language switch selects the greeting, default busy reply and speech locale; it does not translate pasted messages.

## Implemented

- Five screens: daily brief, inbox, calls, Google and settings.
- Device Tamil / English text-to-speech and important-message readout.
- Sample inbox and manually pasted messages with keyword-based priority and manual overrides.
- Calendar event editor (review and save in the system calendar).
- Busy reply voice preview and SMS composer (user confirms sending).
- Local persistence of messages, priority flags, settings and input drafts.
- Android WhatsApp and default SMS app notification capture, with optional offline read-aloud.
- Optional incoming/missed call alert capture from the default phone app.
- Direct Google Drive daily backup, manual backup and validated restore (requires native sign-in setup).

All app messages, settings, priority flags and input drafts persist locally in AsyncStorage (React Native’s local storage). Existing preferences migrate automatically. No app backend or analytics are used. Google Drive is contacted directly from the phone only after you connect it for backup.

## Android notification setup

Notification capture requires a native Android build; Expo Go and the web preview cannot run the listener.

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build:configure
npx.cmd eas-cli@latest build --platform android --profile preview
```

Install the APK on your phone. In Settings, open **Notification assistant**, select the access button, and enable **Anbu message assistant** in Android's notification access settings. Return to Anbu and enable WhatsApp, SMS or phone call alerts. All capture switches start off. WhatsApp and WhatsApp Business are supported; SMS alerts come from your default SMS app.

Read-aloud starts off and asks for confirmation when enabled. Install an offline Tamil or English voice in your phone's text-to-speech settings. Speech respects silent mode, Do Not Disturb and active calls. Important-only speech starts enabled; importance uses local keyword matching and can be changed in the inbox.

Alerts are saved in a private native queue before speech. Opening/resuming Anbu imports them into its local inbox, and the foreground app checks every three seconds. The queue holds up to 2,000 pending alerts and reports a storage error when full. Successfully saved alerts are acknowledged; duplicate deliveries preserve manual priority changes. Drive snapshots include pending alerts even before inbox import, without consuming them.

Only content exposed in notifications is available. Old chats, SMS history, muted messages, hidden previews and Android-protected sensitive content are not available. Force-stopping the app or manufacturer battery restrictions can interrupt capture. Call alerts depend on notifications from the default phone app; they do not provide call audio, conversation transcripts or automatic answering.

The service and local queue have compiled against the Android SDK; the complete native APK and behavior on a physical phone still need verification. EAS currently requires account login before a build can run.

References: [Android notification listeners](https://developer.android.com/reference/android/service/notification/NotificationListenerService), [Android call audio restrictions](https://developer.android.com/media/platform/sharing-audio-input).

## Daily Google Drive backup (Android)

Storage uses the phone's app-private internal storage through AsyncStorage, with no SD card permission or app backend. Google Drive is an additional copy, enabled only after account connection. Each day's `anbu-YYYY-MM-DD.json` contains a snapshot of locally saved activity and preferences, including pending notification alerts. Automatic checks refresh the same daily file when the data changes and skip identical snapshots; previous days' files remain available. Checks run on app open/resume and approximately hourly in the background, subject to Android scheduling. This is a daily snapshot, not a separate log of every edit. Google OAuth configuration and a native Android build are still required for real uploads.

Uninstalling or clearing app data removes internal storage. Connected Drive backups remain available for restore; offline activity stays local until a later successful upload.

1. Enable the Google Drive API in your Google Cloud project and configure the OAuth consent screen, including your test account if the app is in testing.
2. Create an Android OAuth client for `com.anbu.assistant` with the signing SHA-1 for your development/release build. Create a Web OAuth client in the same Google project.
3. Each customer enters their **Google Web OAuth client ID** in Settings and selects **Save client ID on this phone**. It persists in local AsyncStorage and takes priority over the optional `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` build default. No client secret or service account is needed or included. Disconnect Drive before changing the ID, save the new ID, and reconnect. Customer configuration is excluded from activity backups and is preserved when restoring messages.
4. Build a native Android development/production app. Google Sign-In is not included in Expo Go. Use an EAS development build, for example `npx.cmd eas-cli@latest build --platform android --profile development` after configuring EAS for your project.
5. In Settings, tap **Sign in with Google**, choose an account on the phone and approve the private backup access request. The app obtains access through the Google SDK and starts daily backup after successful approval. A newly entered client ID is saved automatically by the sign-in button, or can be saved separately. Cancellation leaves backup disabled; OAuth tokens are managed by the native Google SDK.

When the app already includes a valid default client ID, customers can sign in without entering one. Optional **Google client ID setup** allows per-customer overrides. Google OAuth cannot automatically discover or create a project client ID; the app publisher or customer project owner must supply it once. Account selection and consent always remain under the user's control.

Different customer IDs must belong to Google projects that also register this app's Android package and signing SHA-1, enable Drive, and configure consent. Entering an Android client ID into the Web client ID field will not work. Changing the Web ID itself does not require rebuilding an already compatible native app. A different Google project has its own private app-data backups.

The app uploads a UTF-8 JSON snapshot per local calendar day to Drive’s private `appDataFolder`. These files are accessible to Anbu, not visible in My Drive. Backups contain app data, not OAuth tokens or settings from other apps. Google’s native SDK manages access tokens; they are not stored in AsyncStorage.

Android background work checks hourly and uploads when the day’s backup is due. This is best effort: Android decides when work runs; internet, battery restrictions and force-stopping can delay it. Opening/resuming the app also retries due backups. Backups show their last successful time and failure status in Settings. **Back up now** refreshes today’s file; **Restore latest backup** validates the format and asks before replacing local data. Old daily cloud snapshots are retained; disconnecting stops uploads without deleting backups.

Google sign-in and real background execution must be verified on a physical Android development build with your own OAuth configuration. Without that configuration, local read/write works but Drive remains disconnected.

Android links the Google Sign-In native library automatically. No Firebase project or `google-services.json` is required for this setup; the package’s Firebase-oriented config plugin is intentionally omitted. iOS Drive sign-in is not implemented.

References: [Google app-data storage](https://developers.google.com/workspace/drive/api/guides/appdata), [Google Sign-In Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo), [Expo background tasks](https://docs.expo.dev/versions/v57.0.0/sdk/background-task/).

## Backend connection

Settings includes authenticated HTTPS backend connection, local-to-server snapshot upload, confirmed restore, and optional automatic foreground sync. The approved temporary default URL is `https://curve-ultra-produced-civilization.trycloudflare.com`. Copy the backend key from local `backend/.env`; the phone stores it in SecureStore. Do not add the backend key to public Expo environment variables. Backend requests send only the local snapshot, excluding Google IDs and OAuth tokens. After the temporary tunnel changes, disconnect and enter the new URL. See `../backend/README.md` for running and HTTPS setup. All local data remains available offline. Google workspace requests go directly to Google rather than through the backend.

## Gmail and Drive files

The Google tab adds device-side Gmail inbox reading, reviewed email sending, and plain text note creation/reading in My Drive. Set the Web client ID in Settings, enable **Gmail API** and **Google Drive API** in the same Google Cloud project, then select **Connect Gmail and Drive** and approve the additional scopes. The native Google SDK manages account sessions and tokens. Existing consent can be reused; first-time account selection and consent cannot be bypassed.

Scopes are `gmail.readonly`, `gmail.send` and `drive.file`, in addition to the private backup's `drive.appdata`. Drive file access is limited to files created or opened through Anbu, not every file in the account. The current interface creates new `.txt` notes and displays up to 100 accessible files. Gmail displays the latest 20 inbox messages, preferring plain text and otherwise showing the snippet; attachments and full HTML rendering are not implemented. Read requests do not mark mail read. Sending shows the recipient, subject and body for confirmation. UTF-8 Tamil/English content is encoded as MIME/base64url.

Email content stays in screen memory until you choose **Save to local inbox**; saved emails join local storage and connected daily Drive backups. Google requests do not go through the Python backend. No email is sent automatically on sign-in. Google permission revocation or an API error must be resolved by reconnecting/configuring your project. Public Gmail access can require Google's sensitive/restricted OAuth scope verification. The native account flow still requires physical-phone testing with your OAuth project.

References: [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Sending email](https://developers.google.com/workspace/gmail/api/guides/sending), [Drive file scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

## Remaining integrations

1. **Calls:** This frontend-only app does not answer calls, record callers or generate transcripts. Ordinary Android apps do not have unrestricted access to cellular call audio. Device speech previews and SMS composition are available.
2. **WhatsApp:** Notification text capture is implemented with user-authorized Android notification access. Full chat history and sending WhatsApp messages are not implemented.
3. **SMS:** Default SMS app notification capture and the system composer are implemented. Reading the SMS database or sending messages automatically is not implemented.
4. **Email:** Gmail read/send and incremental account authorization are implemented in the Google tab. Other email providers, attachments and mailbox editing are not implemented. Never put provider secrets in this mobile app.
5. **Calendar updates:** The current app opens the system event editor. Reading upcoming events requires calendar permission and a separate sync implementation.
6. **Silent / DND:** Implement an Android native module with notification policy access and current Android behavior. The busy switch currently stores a preference only; it does not change device mode or trigger messages.
7. **Summaries:** Current priority matching and readout run locally. No cloud AI or summary backend is used.

Reference: https://developer.android.com/media/platform/sharing-audio-input and https://docs.expo.dev/versions/latest/sdk/calendar/

## Checks

```powershell
npx.cmd expo lint
npx.cmd tsc --noEmit
node --test tests/backup.test.cjs
npx.cmd expo export --platform android
```

Before production, connect the services above and test permission denial, installed voices, calendar cancel/save and SMS cancel/send on a physical Android phone.

The latest dependency installation reports 30 advisories (10 moderate, 20 high), including Expo / React Native transitive build tooling. No forced downgrade was applied. Review and resolve these before production distribution.
