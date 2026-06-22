# Crica

A private accountability app for two founders. Habits, tasks, points, a company money vault, clients and invoices, a daily report, dark mode, and reminders. Built with React and Vite, with Firebase for live syncing between both of your computers.

The two accounts are already created for you:

- Cristian, password 12345
- Catalin, password 12345

Change the passwords any time under Settings once you are in.

---

## What you need first

- Node.js installed (you said you already have this). Check by running `node -v` in a terminal.
- A code editor (VS Code).
- A free GitHub account (for putting it online later).
- A free Google account (for Firebase, which does the syncing).

---

## Step 1: Open the project in VS Code

1. Unzip the `crica` folder somewhere you will find it again, for example your Desktop.
2. Open VS Code.
3. File menu, "Open Folder", and pick the `crica` folder.
4. Open the built-in terminal in VS Code: the "Terminal" menu, then "New Terminal".

## Step 2: Install and run it

In that terminal, type these one at a time:

```
npm install
```

Wait for it to finish, then:

```
npm run dev
```

It will print a local address, usually `http://localhost:5173`. Hold Ctrl (or Cmd on Mac) and click it, or paste it into your browser. You should see the Crica login screen with Cristian and Catalin.

At this point it already works on your machine. It is not syncing to the other PC yet. That is Step 4.

To stop the server later, click the terminal and press Ctrl+C. To start it again, run `npm run dev`.

## Step 3: Add your logo

1. Take your logo PNG and rename it to exactly `logo.png`.
2. Put it inside the `public` folder in the project (so the path is `public/logo.png`).
3. If `npm run dev` is running, the page refreshes on its own. The logo now shows in the header, the login screen, and the browser tab.

A square image looks best. If the file is missing, Crica shows a small crown instead, so nothing breaks.

## Step 4: Turn on syncing between both PCs (Firebase)

This is the part that answers "does it save for the other person too". Until this is done, each computer keeps its own separate data. After this, both of you share the exact same live data.

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click "Add project", give it a name like `crica`, and continue. You can turn Google Analytics off, it is not needed.
3. In the left menu open "Build", then "Firestore Database", then "Create database". Choose "Start in test mode", pick the region closest to you, and enable it.
4. Go back to "Project Overview". Click the web icon that looks like `</>` to register a web app. Name it `crica` and click "Register app". You do not need Hosting from here.
5. Firebase shows you a block of code with a `firebaseConfig` object full of values (apiKey, authDomain, projectId, and so on).
6. In VS Code open `src/firebase.js` and paste those values over the `REPLACE_ME` placeholders. Save the file.

Now stop the server (Ctrl+C) and run `npm run dev` again. Whatever one of you does shows up on the other's screen within a second or two. Done.

A note on "test mode": Firebase opens the database to anyone for 30 days while you build. For a tiny two-person tool this is usually fine to start. When you are ready to lock it down, open Firestore "Rules" and replace them with rules that require sign in, or ask me and I will walk you through a simple lock. The data itself is small and private to your project.

## Step 5: Put it on GitHub

1. Create a new empty repository on GitHub (the website), for example named `crica`. Do not add a README there, you already have one.
2. In the VS Code terminal, inside the project folder, run these in order. Replace the URL with the one GitHub shows you for your new repo.

```
git init
git add .
git commit -m "Crica first version"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/crica.git
git push -u origin main
```

Your `firebase.js` will be pushed too. For a private tool that is acceptable, and a Firebase web config is not a secret password by design. If you prefer the repo to be private, set it to Private on GitHub when you create it.

## Step 6: Put it online so you can both use it from anywhere

The easiest path is Vercel, which builds the project for you and gives you a link.

1. Go to https://vercel.com and sign in with your GitHub account.
2. Click "Add New", then "Project", and import your `crica` repository.
3. Vercel detects Vite on its own. Just click "Deploy".
4. After a minute you get a public link like `crica.vercel.app`. Open it on either PC, log in, and you are both on the same live board.

Every time you push changes to GitHub, Vercel rebuilds and updates the site for you.

Netlify works the same way if you prefer it. Firebase Hosting is also an option since you already have a Firebase project, but Vercel is the least fiddly.

---

## Day to day

- `npm run dev` runs it locally while you tinker.
- Push to GitHub to update the live site.
- Settings has dark mode, notifications, your name, color, and password.
- Notifications and the daily report popup work while the site is open in a browser tab. Web apps cannot pop up reminders when every tab is fully closed without extra background setup, so keep a tab open during the workday for the nudges.

## How points work

- Every habit kept is worth 10 points for that day. They are all hard to keep, so they all count the same.
- Tasks pay on completion by importance: Low 5, Medium 10, High 20, Urgent 35.
- Miss a habit one day and the streak freezes with a warning. Miss two days in a row and it resets.

## If something looks off

- Blank screen: check the VS Code terminal for a red error and send it to me.
- No syncing: open the browser console (F12) and look for a line starting with `[Crica]`. It will say if Firebase is not configured.
- Logo not showing: confirm the file is named `logo.png` exactly and sits in the `public` folder.

---

## Where things live (project map)

The app is split into small files so you can work on one thing at a time.

- `src/App.jsx` is the shell: login state, routing, the top and bottom nav, and the daily popup.
- `src/styles.jsx` holds all the CSS in one place.
- `src/firebase.js` and `src/storage.js` handle the database and syncing.
- `src/lib/` is the plumbing: `dates`, `format`, `constants`, `points` (scoring and the streak rule), `confetti`, `notify`, `invoices`, `hooks`.
- `src/components/` is shared UI: `ui.jsx` (buttons, cards, modals, the logo), `DraggableList`, `AlertBar`.
- `src/screens/` is `LoginScreen` and `DbErrorScreen`.
- `src/tabs/` is one file per page: `Dashboard`, `HabitsTab`, `TasksTab`, `CompanyTab`, `DailyReport`, `SettingsTab`.

So if you want to change the Company page, open `src/tabs/CompanyTab.jsx`. To tweak colors or spacing, open `src/styles.jsx`. To change a default, open `src/lib/constants.js`.
