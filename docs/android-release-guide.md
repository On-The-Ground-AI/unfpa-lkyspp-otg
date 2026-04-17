# Android Release Guide — UNFPA OTG Clinical AI

Complete steps from keystore to Play Store. Do these in order.

---

## Step 1 — Generate the Keystore

Run this in your terminal (requires JDK, which comes with Android Studio):

```bash
keytool -genkey -v \
  -keystore ~/Desktop/unfpa-otg-release.jks \
  -alias unfpa-otg \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

When prompted:
| Prompt | What to enter |
|--------|--------------|
| Keystore password | Pick a strong password. Save it in 1Password right now. |
| Re-enter password | Same again |
| First and last name | Haojun See |
| Organization unit | On The Ground |
| Organization | On The Ground Pte Ltd |
| City | Singapore |
| State | Singapore |
| Country code | SG |
| Confirm with `yes` | yes |
| Key password | Press Enter to use same as keystore |

This creates `unfpa-otg-release.jks` on your Desktop.
**Back this file up immediately.** Losing it = can never update the app on Play Store.

---

## Step 2 — Create keystore.properties

Copy the template and fill in your passwords:

```bash
cp android/keystore.properties.template android/keystore.properties
```

Edit `android/keystore.properties`:
```properties
storeFile=../../Desktop/unfpa-otg-release.jks
storePassword=YOUR_ACTUAL_PASSWORD
keyAlias=unfpa-otg
keyPassword=YOUR_ACTUAL_PASSWORD
```

The path in `storeFile` is relative to the `android/app/` directory, so `../../Desktop/` points to your Desktop. Adjust if you moved the .jks file.

Verify it's git-ignored:
```bash
git check-ignore -v android/keystore.properties
# Should print: .gitignore:... android/keystore.properties
```

---

## Step 3 — Build the Release AAB

```bash
cd android
./gradlew bundleRelease
```

Output file:
```
android/app/build/outputs/bundle/release/app-release.aab
```

If the build fails, the most common causes:
- Wrong path to .jks in keystore.properties — use absolute path to be safe: `/Users/seehaojun/Desktop/unfpa-otg-release.jks`
- Missing Gemma model dependency — that's OK, the model downloads at first run
- Missing ONNX model asset — check `android/app/src/main/assets/`

---

## Step 4 — Google Play Console Setup

### 4a. Create the app
1. Go to play.google.com/console
2. "Create app" → App name: **OTG Clinical AI**
3. Default language: English (United States)
4. App or game: App
5. Free or paid: Free
6. Accept developer policies

### 4b. App content / declarations
Under "Policy" → complete each section:
- **App access**: All or most functionality is available without special access
- **Ads**: No ads
- **Content rating**: Complete the questionnaire → select "Medicine" category → answer all questions conservatively (no violence, no user-generated content)
- **Target audience**: Adults (18+) — do NOT select children
- **Data safety**: Fill out carefully (see section below)

### 4c. Data safety form
| Question | Answer |
|----------|--------|
| Does your app collect/share data? | Yes |
| Data types collected | App activity (queries sent to AI), App info and performance (crash logs) |
| Is data encrypted in transit? | Yes |
| Can users request deletion? | Yes |
| Is collection required or optional? | Required for core functionality |

### 4d. Upload the AAB
Store listing → Production → Create new release → Upload `app-release.aab`

---

## Step 5 — Store Listing Copy

### App name
```
OTG Clinical AI — UNFPA Field Tool
```

### Short description (80 chars max)
```
Offline clinical decision support for frontline health workers.
```

### Full description
```
OTG Clinical AI gives frontline health workers instant access to verified clinical guidance — with no internet connection required.

Built for resource-limited settings across Asia-Pacific and East Africa, the app runs an on-device AI (Gemma 4) that answers clinical questions, looks up drug dosing, and surfaces emergency protocols — all from locally stored WHO guidelines and verified formularies.

KEY FEATURES

● Offline-first AI chat — answers clinical questions using Gemma 4 running entirely on your device. No data leaves the phone.

● Drug formulary — 59+ verified medicines with dosing, routes, contraindications, and WHO Essential Medicines List status.

● Emergency protocols — step-by-step algorithms for PPH, eclampsia, neonatal resuscitation, and more.

● 3 modes — Clinical (for healthcare providers), Community (for community health workers), Partnership (for programme staff).

● 6 languages — English, Swahili, Amharic, French, Tigrinya, Somali.

● Cited answers — every AI response references the source document and page number.

● Export — save conversations and protocols as PDF or Word documents.

● Automatic updates — knowledge bundles update over Wi-Fi every 12 hours so you always have current guidelines.

IMPORTANT
This app is a clinical reference tool designed to support trained healthcare professionals. It is not a substitute for professional medical judgment, supervision, or your facility's protocols. All clinical content has been reviewed against WHO guidelines.

Developed by LKYSPP Policy Innovation Team (National University of Singapore) and On The Ground, with support from UNFPA Asia-Pacific.
```

### Category
**Medical**

### Tags (if available)
`healthcare`, `clinical`, `offline`, `WHO`, `maternal health`, `formulary`

### Privacy policy URL
You need a publicly accessible privacy policy before Play Store will approve. Create a simple one at a URL like `https://unfpa-lkyspp-otg.vercel.app/privacy` — add a route to the Next.js app.

---

## Step 6 — Screenshots Required by Play Store

You need at least 2 screenshots per device type. Required sizes:
- **Phone**: 16:9 or 9:16, min 320px on shortest side, max 3840px on longest
- **7-inch tablet** (optional but recommended)
- **10-inch tablet** (optional)

Suggested screenshots to capture on the device:
1. Mode selection screen (shows Clinical/Community/Partnership)
2. Clinical chat with an AI response (PPH or eclampsia query works well)
3. Drug formulary list (showing oxytocin, magnesium sulphate)
4. Drug detail card for one drug
5. Citation drawer open (showing source document)

Use Android Studio's emulator or a real device to capture these.

---

## Step 7 — Submit for Review

1. Complete all required fields in Play Console (green checkmarks)
2. "Send for review" — Google typically reviews in 1–3 days for new apps
3. You'll get an email when approved or if there are issues

### Common rejection reasons for medical apps:
- Missing privacy policy → add the /privacy page
- Content rating incomplete → redo the questionnaire carefully
- Misleading medical claims → make sure the store listing says "reference tool" not "diagnostic tool"

---

## Checklist

- [ ] Keystore generated and backed up in 1Password
- [ ] `keystore.properties` created (not committed)
- [ ] `./gradlew bundleRelease` succeeds
- [ ] `.aab` file under 150 MB (the Gemma model downloads at first run, not bundled)
- [ ] Privacy policy page live at a public URL
- [ ] Play Console app created
- [ ] All policy declarations completed
- [ ] Store listing copy filled in
- [ ] At least 2 phone screenshots uploaded
- [ ] Sent for review
