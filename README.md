# hompag

hompag is creates an active, editable page to use as your default home page in your browser.   It improves productivity by making it easier to track the links and information you care about.   It works by running a local web server plus react application.

**Features**:

* Directly edit links and text on the page.  
* Arrange the page with widgets that can be moved and resized
* Instantly persist changes across browsers and even between many computers
* Run scripts and applications on your local machine from your home page
* Compatible with MacOS, Windows, and Linux
* Useful widgets types such as:
  * Rich text 
  * Search bar
  * Is it alive? Ping tool
  * Stock Ticker
  * Spotify control
  * Run apps on your local machine

## **How to use**

hompag is meant to run as a mini web server on your local machine.  This makes your home page super-responsive and capable of some amazing tricks that are not easy (or even possible) from an internet web server.   

**Prerequisites**

* [Node.js](https://nodejs.org) 20 or later
* For developer mode only: git (and optionally the [GitHub CLI](https://cli.github.com), so the installer can fork the repo for you)

### Install

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/nebosite/hompag/master/install.ps1 | iex
```

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/nebosite/hompag/master/install.sh | sh
```

The installer walks you through:

1. **Mode**
   * **Production** (recommended) downloads a ready-made, versioned release. Updating is `hompag update`.
   * **Developer** clones the repo, or forks it if you don't have push access, and builds it. Each time hompag starts it fast-forwards your branch (only when your working tree is clean) and rebuilds just the packages that changed.
2. **Data folder** is where your pages live. To see the same page on all of your computers, choose a folder that a cloud service syncs (OneDrive, Dropbox, Google Drive, iCloud...). The installer looks for these and suggests a `hompag` folder inside them. Pick the same folder on each machine; if it already has hompag pages, the new machine simply shares them.

   **NOTE**: Most cloud storage services default to offline storage, and macOS forces offline files for cloud storage. So hompag polls for file changes every 30 seconds to keep computers in sync. Each poll takes about 1 millisecond, so the overhead is low.
3. **API keys** (optional) for the Spotify and stock widgets. You can skip these and add them later by re-running the installer.
4. **Autostart**: hompag starts automatically when you log in. It uses a per-user Run entry on Windows, a LaunchAgent on macOS, and a systemd user service (or XDG autostart entry) on Linux. None of these need admin rights.

When it finishes, point your browser's home page and new tab page at `http://localhost:8101/home`.

Re-running the installer is safe: it repairs or reconfigures in place. Installer options include `--mode prod|dev`, `--data <folder>`, `--port <n>`, `--yes`, `--no-autostart`, and more; run `hompag help` to see them all. To pass options through the one-line installers:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/nebosite/hompag/master/install.ps1))) --mode dev
```
```sh
curl -fsSL https://raw.githubusercontent.com/nebosite/hompag/master/install.sh | sh -s -- --mode dev
```

### Managing hompag

```
hompag status      is it running? where are the data and logs?
hompag stop | start | restart
hompag logs        recent log lines
hompag open        open your home page
hompag update      install the latest release (developer mode: pull + rebuild)
hompag report      open a prefilled GitHub issue with recent logs
hompag uninstall   remove hompag (your pages are kept)
```

Settings, logs, and installed releases live in `%LOCALAPPDATA%\hompag` (Windows), `~/Library/Application Support/hompag` (macOS), or `~/.local/share/hompag` (Linux). API keys are kept there in `config.json`, outside your synced data folder.

### Crash protection

A small supervisor process runs the hompag server and watches it:

* If the server crashes or stops responding, the supervisor restarts it, waiting a little longer after each crash (1s, 2s, 4s ... up to 30s). Page data is flushed to disk on every shutdown path.
* While the server is down, the supervisor shows a status page at the hompag address, so you'll see it in your browser. The page refreshes itself and returns to your home page when the server is back.
* After 5 crashes in 15 minutes it stops retrying. The status page and a desktop notification then offer **Restart** and **Report issue on GitHub**. The report opens a prefilled issue with recent logs (secrets and your home folder path are redacted) for you to review and submit. A full crash report is saved in the logs folder.

### Building from source

1. `git clone https://github.com/nebosite/hompag.git` and `cd hompag`
2. `node build-all.js` builds `common`, `clientapp`, `webserver`, and `launcher`, in that order.
3. Then either:
   * install in developer mode against this checkout: `node launcher/dist/hompag.mjs install --mode dev --repo-dir .`, or
   * package and install a production release: `node scripts/package-release.mjs`, then `node release/hompag.mjs install --from-source .`

Releases are published by pushing a `v<version>` tag (see `.github/workflows/release.yml`).

**Upgrading from a manual setup**: earlier versions of this README had you create a Task Scheduler task that runs `webserver/scripts/hompagserver.vbs`. When the installer turns on autostart, it finds that task and offers to disable it. Your existing store folder works as-is; give it to the installer as the data folder. Settings from an old `webserver/src/config.ts` are still read in developer mode, but the installer's `config.json` takes precedence.

## **How to use hompag**

After you get the hompag server running, here is a basic set up steps to follow to get started:

1. Make a new page simply by typing in the URL for it. e.g.: you can start with this link:  http://localhost:8101/myhomelypage  (hompag will create and track as many pages as you want)
2. Create a rich text widget:
   1. With your mouse, drag out an area on the page
   2. Click on "what am i?" and select "RichText"
   3. Enter in some text - it will save to the server automagically
   4. Format text or create a link by selecting the text.  
   5. Change the formatting and color of the widget by clicking  on the "..." in the upper right hand corner of the widget.
   6. Move the widget around by grabbing the top and dragging
   7. Resize the widget by grabbing the lower right corner
   8. Change the page's layout and color scheme by clicking on the gear icon at the top right
3. Set up the newly created page as your browser's home page
   1. Copy the URL
   2. Find the setting for home page and paste the URL there.
4. (Optional) set up the page to open on every tab with a tab changer extension

## **How to dev**

**Active client development,** when you want to make rapid-fire changes to the client:

1. Follow the setup instructions above to get hompag running
2. In the webserver folder, start the server like this:  `npm run startdev`
3. In the clientapp folder, start the webpage app like this:  `npm start`
4. Use this URL to access to dev client:   http://localhost:3200  (To make a new page, simply type the page name in the url.  e.g. you can start with this link:  http://localhost:3200/dev)
5. When the client is where you want it, just build it: `npm run build` in the clientapp folder.

**Slower development**, when you want to see the server output through the day as you use hompag on your machine normally:

1. Follow the setup instructions above to get hompag running
2. Make sure the client code is built:  `npm run build` in the clientapp folder
3. Open a terminal you plan to keep open and in the webserver folder, start the server like this:  `npm run startdev`
4. Now you can use your browser normally and watch the output from the server.  You can also see interesting output in the dev console on the browser. 

### Creating a new widget type

I encourage you to extend hompag by creating your own widget types.  Here are the steps to do that: 

1. in clientapp/src/Widgets, copy _WidgetTEMPLATE.tsx to Widget[NewType].tsx
2. In Widget[NewType].tsx, string-replace `_TEMPLATE_` with `[NewType]`
3. In clientapp/src/WidgetLibrary.ts
   1. add a new line to register your widget type
   2. add a new enum [NewType]="[NewType]"

Your new widget will have two supporting classes for widget state data:

* Widget[NewType]Data - this is for data that should stored on the server so that it persists between sessions.  Follow the get/set observer pattern example for any new properties you add.   
* [NewType]TransientData - this is for data that controls your widget, but should not be permanently stored on the server.   e.g.: Current state of the spotify player uses this. 

## Questions?  

Please reach out to me by creating a github issue in this repo. 

**Contributors**:

* Eric Jorgensen (author)

