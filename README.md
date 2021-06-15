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
2. Run a local deployment:  `nodejs deploy.js`
3. start the app:  `nodejs startDeployedServer.js &`
4. Set up a scheduled task (windows) or chron job (linux, maxOS) to automatically start the server by executing the "start the app" step when the OS starts up
5. Set your browser home page to http://localhost:8101/myhomepage
6. Optional, install a tab changer and set all new tabs to open the same page as your home page. 

**What to do after you have it set up**

Now you have a magic home page that always opens with your browser.  You can freely edit this page to help you manage whatever daily workflow you use.   A popular use to manage bookmarks by creating text widgets and arranging them an a pleasing spatial layout to help you remember what they do.   I have a widget for work links, another for financial data, another for side projects, etc.   

To create a new widget, drag a box in the open area, then select the type of widget you want.  



## **How to dev**

1. Clone this repo
2. In webserver/src, copy `config.ts.template` to `config.ts` and edit it according to the instructions in the comments.   
3. Start the server
4. Run the client
5. To make a new page, simply type the page name in the url.  e.g. you can start with this link:  http://localhost:8101/mycoolnewpage



