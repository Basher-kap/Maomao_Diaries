# Release 1.1.0 (production APK)

What's new: diary calendar with notes, day titles, split-by-time, moods, expandable notes,
dashboard reports, Expo SDK 58.

## Before building
1. In the CURRENT app: Backup button -> export a JSON backup and copy it off the phone.
2. Add the AI key to the production environment (it was only added to "development"):
   eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value "your-key" --environment production --visibility sensitive
3. Check:   npx expo-doctor@latest
4. Commit everything (.npmrc, package.json, package-lock.json, app.json, source files):
   git add -A
   git commit -m "Release 1.1.0"

## Build
   eas build --profile production --platform android

(versionCode is incremented automatically: autoIncrement + appVersionSource "remote".)

## Test the APK before sharing it (SDK 58 turns R8 on for release builds)
- Install over the old app (same package + same keystore keeps your diary data).
- First launch: month sections are copied into the calendar, entries split by time (one-time).
- Calendar: add / edit / delete a note, pick a mood, add a photo, expand a long note, keyboard behaviour.
- Dashboard: reports tabs, calendar bubble, Backup export + import, AI Maomao.

## After release
- Tag it:  git tag v1.1.0 && git push --tags
- JS-only fixes later:  eas update --channel production --message "what changed"
  (only reaches 1.1.0 installs). Native/dependency changes need a new build and a version bump (1.1.1 / 1.2.0).
- Do NOT publish an update to runtime 1.0.0 with this code: old installs are SDK 57 and would crash.
