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

1. git command line
2. nodejs v12 or later

**To set up hompag**

1. Clone the hompag repo:  `git clone https://github.com/nebosite/hompag.git`

2. Somewhere on your computer, Create a folder to store hompag files.
   If you want hompag to sync between computers, choose a path that is managed by cloud storage (e.g.: a folder inside your OneDrive or DropBox folder.)

   **NOTE**:   Most cloud storage services default to offline storage, and MacOS actually forces offline files for cloud storage.  Therefore, in order to make sure clients stay in sync across computers, hompag must poll for file changes, which is does every 30 seconds.  This costs about 1 millisecond each time, so the overhead is low.   

3. Before you can build, you need to create a config file:

   1. Go to the root of the hompag repo (`cd [root of hompag]`)
   2. Create a config file:  `cp webserver/src/config.ts.template webserver/src/config.ts`
   3. Edit config.ts and follow all the instructions in the comments


**Building hompag for the first time**

1. Go to the root of the hompag repo  (`cd [root of hompag]`)
2. `node build-all.js`

**Running hompag**

1. In the root of the hompag repo
2. `node webserver/dist/index.js storepath=[path to your hompag store]`

**Set it up to run whenever the computer starts**

Windows:  Create a schedule task with this action:

```
Action: Start Program
Program/script: [hompag root]/webserver/scripts/hompagserver.vbs
Arguments: "[path to your hompag store folder]"
Start in: [hompag root]/webserver/scripts
Trigger: At Logon (for you)
```

Linux/IOS:  Create a chrontab item with these properties:

```
TBD.  I haven't figured out how to set this up to run automatically on Mac or Linux yet. 

This is what needs to run:
node [hompag root]webserver/dist/index.js storepath=[path to your hompag store]
```

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

