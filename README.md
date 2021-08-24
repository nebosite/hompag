# hompag

A local server for hosting the best, most capable home page.

**Features**:

* Widgets that are easy to place and configure
* Changes persist instantly across all open pages
* Configurable color scheme
* Useful widgets
  * Rich text for keeping notes, bookmarks, etc.  

## **How to use**

hompag is meant to run as a mini web server on your local machine.  This makes your home page super-responsive and capable of some amazing tricks that are not easy (or even possible) from an internet web server.   

**Prerequisites**

1. git command line
2. nodejs v12 or later

**To set up hompag**

1. Clone this repo:  `git clone https://github.com/nebosite/hompag.git`

3. In the root of the hompag repo (`cd hompag`)
   1. Create a config file:  `cp webserver/src/config.ts.template webserver/src/config.ts`
   2. Edit config.ts and follow all the instructions in the comments

**Building hompag**

1. Go to the root of the hompag repo
2. `node build-all.js`

**Running hompag**

1. In the root of the hompag repo
2. `node webserver/dist/index.js`

**Set it up to run whenever the computer starts**

1. Set up a scheduled task (windows) or chron job (linux, macOS) to automatically start the server by executing the "start the app" step when the OS starts up
2. Set your browser home page to http://localhost:8101/myhomepage
3. Optional, install a tab changer in your browser and set all new tabs to open the same page as your home page. 

**What to do after you have it set up and running**

It is easy to make a new page, simply type the page name in the hompag url.  e.g. you can start with this link:  http://localhost:8101/something

Now you have a magic home page that always opens with your browser.  You can freely edit this page to help you manage whatever daily workflow you use.   A popular use to manage bookmarks by creating text widgets and arranging them an a pleasing spatial layout to help you remember what they do.   I have a widget for work links, another for financial data, another for side projects, etc.   

To create a new widget, drag a box in the open area, then select the type of widget you want.  



## **How to dev**

1. Follow the setup instructions above to get hompag running
3. In the webserver folder, start the server like this:  `npm run startdev`
3. In the clientapp folder, start the webpage app like this:  `npm start`
4. Use this URL to access to dev client:   http://localhost:3200
5. To make a new page, simply type the page name in the url.  e.g. you can start with this link:  http://localhost:8101/mycoolnewpage



