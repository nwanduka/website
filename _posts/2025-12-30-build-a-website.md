---
layout: post
title: "What You Need to Build a Website"
date: 2025-12-30
tags: [website, beginner]
---
A friend recently asked me how I built my website. It's a simple question, but I realized the answer involves several moving pieces that aren't always obvious when you're just starting out. So I thought I'd write this down, not as a step-by-step tutorial, but as a conceptual guide.

By the end, you'll understand what's actually involved in building a website and have a better sense of which tools and platforms might work for you.

## What is a website, really?
At its core, a website is just a collection of files: HTML files that structure your content, CSS files that make it look nice, maybe some JavaScript files that add interactivity, and your actual content like text and images. When someone types your website address into their browser, their computer requests these files from a server somewhere on the internet, downloads them, and displays them as a webpage.

That's it. Everything else we'll talk about is just different ways of creating those files and making them available to visitors.

## The building blocks
There are four main components to a website:

**1. Content** - The actual files that make up your website

**2. Hosting** - Where your website lives on the internet

**3. Domain name** - Your website's address

**4. Version control (optional)** - A system to track changes to your files

Let's break down each one.

### 1. Content
First, you need to actually create those HTML, CSS, and content files. You have a few approaches here:

**Writing code from scratch** means you're literally creating HTML and CSS files yourself. This gives you complete control but requires learning these languages. It's more approachable than you might think. HTML and CSS aren't programming languages, they're markup languages that describe structure and style.

**Using a content management system (CMS)** like [WordPress](https://wordpress.com/) means you work through a visual interface. You write your content in an editor that looks like Microsoft Word, click buttons to add images, choose from themes for your design, and WordPress generates all the HTML and CSS behind the scenes. This is easier to start with but can feel constraining as you get more comfortable.

**Using a website builder** like [Wix](https://www.wix.com/), [Squarespace](https://www.squarespace.com/), or [Webflow](https://webflow.com/) gives you a drag-and-drop interface where you design your site visually. These are the most beginner-friendly but typically bundle hosting and domain registration into their pricing, which means less flexibility in how you set things up.

**Using a static site generator** (which is what I did with [Jekyll](https://jekyllrb.com/)) is another option. You write your content in simple text files using a format called Markdown, which is much easier than HTML. The generator then transforms these simple files into a complete website with all the HTML and CSS. You get simplicity for your content but still have full control over the design and code if you want it. Other popular static site generators include [Hugo](https://gohugo.io/), [Eleventy](https://www.11ty.dev/), and [Astro](https://astro.build/).

### 2. Hosting
Once you've created your website files, they need to live somewhere that's accessible 24/7 on the internet. This is called web hosting.

A web host is essentially a computer (a server) that's always connected to the internet and configured to serve your website files to anyone who requests them. When someone types in your website address, their browser contacts your host's server and downloads your files.

You have several hosting options. Traditional web hosts like [Bluehost](https://www.bluehost.com/), [HostGator](https://www.hostgator.com/), or [SiteGround](https://world.siteground.com/) rent you space on their servers, usually for a monthly fee. Cloud platforms like [AWS](https://aws.amazon.com/), [Google Cloud](https://cloud.google.com/), or [DigitalOcean](https://www.digitalocean.com/) offer more flexible, scalable options but with a steeper learning curve.

If you're using a static site generator like I did, there are specialized hosts that make things incredibly simple. [GitHub Pages](https://docs.github.com/en/pages) (which I use) hosts static sites for free, as does [Netlify](https://www.netlify.com/) and [Vercel](https://vercel.com/). These services are designed specifically for static sites and handle a lot of the technical details for you.

If you're using a website builder like Wix or Squarespace, hosting is built into their service. You don't need to think about it separately.

### 3. Domain name
Your domain name is your website's address on the internet, like yourname.com. Technically, websites are accessed via IP addresses (strings of numbers like 192.168.1.1), but domain names give you something memorable that humans can actually remember and type.

You need to register your domain name through a domain registrar. Popular registrars include [Namecheap](https://www.namecheap.com/) (where I registered mine), [GoDaddy](https://www.godaddy.com/), and [Cloudflare](https://www.cloudflare.com/). Domain registration typically costs around ten to fifteen dollars per year, depending on the domain extension you choose (.com, .net,or .org.)

If you’re wondering, “why do I need to register a domain name? Why can't I just choose a name and start using it?” Well, the short answer is: someone needs to maintain the global directory that tells computers where to find every website.

Think of it like phone numbers. You can't just decide your phone number is 555-1234 and start using it. There needs to be a system that ensures:
- No two people have the same number
- When someone dials that number, the call gets routed to your phone specifically
- There's a record that you own that number

Domain names work the same way. When you register a domain through a registrar like Namecheap, you're essentially:
- Checking that no one else is using that name (that's why you get "domain not available" messages meaning that someone else is using the name)
- Adding your domain to the global Domain Name System (DNS). DNS is like the internet's phone book. It's a distributed database that says "yourname.com points to this specific server at this specific IP address"
- Claiming ownership so no one else can use that name while you're registered

Domain registrars are accredited organizations that have the authority to update this global DNS system. When you pay for registration, you're paying for:
- The administrative work of maintaining that record
- Ensuring the system stays secure and reliable
- Your "slot" in this global database

Without this system, the internet would be chaos. Multiple people could try to use the same domain name, and there'd be no way for browsers to know which server to connect to when someone types in a web address.

Note that your domain name and your hosting are separate things. You register your domain with a registrar, but your website files live on your host's servers. You connect these two by pointing your domain name to your host's servers through something called DNS (Domain Name System) settings. Most registrars and hosts have guides for doing this, and it's usually just a matter of copying some information from your host into your domain registrar's settings.

Some hosting services and website builders offer to register your domain for you as part of their package. This can be convenient, but it also means everything is bundled together with one company, which can make it harder to move things around later if you want to switch hosts.

### 4. Version control
This one's not strictly necessary, but if you're building your site with code (whether from scratch or with a static site generator), you'll want to know about version control systems like [Git](https://git-scm.com/) and platforms like [GitHub](https://github.com/).

Think of version control as a detailed history of every change you've ever made to your website files. If you break something, you can roll back to a working version. If you want to try a redesign, you can experiment in a separate branch without affecting your live site. GitHub, [GitLab](https://about.gitlab.com/), and similar platforms let you store this history in the cloud and, as a bonus, some of them (like GitHub Pages) will host your static site for free.

## How it all connects
Let's walk through how these pieces work together using my setup as an example.

I write my website content in simple Markdown files on my computer. When I'm ready to publish, Jekyll (my static site generator) transforms those Markdown files into a complete website with HTML, CSS, and all the necessary files. I push these files to GitHub, which both stores my code and hosts the website through GitHub Pages. Meanwhile, my domain name (which I registered through Namecheap) is configured to point to GitHub's servers, so when someone types in my domain, they get my website from GitHub Pages.

If you went with a different approach, say, using WordPress on a traditional host like Bluehost, it would look different. You'd write and design your content through WordPress's interface in your browser. WordPress stores everything in a database on Bluehost's servers. Your domain name (which you might have registered through Bluehost or separately through a registrar) points to those Bluehost servers. When someone visits your site, Bluehost's servers use WordPress to generate the HTML on the fly and send it to the visitor's browser.

Or if you used a website builder like Squarespace, it's even more integrated. You'd design everything in Squarespace's interface, your domain might be registered through Squarespace, and everything is hosted on their servers. It's all in one place, which is simpler but gives you less flexibility to mix and match services.

## What approach should you use?
So where should you start? It depends on your goals, technical comfort level, and how much control you want.

If you want the simplest path and don't mind paying a monthly fee, website builders like Squarespace, Wix, or Carrd are nice. Everything's in one place, the interfaces are intuitive, and you can have a site up in an afternoon.

If you want more flexibility and don't mind a learning curve, a static site generator like Jekyll, Hugo, or Eleventy paired with free hosting on GitHub Pages or Netlify gives you full control and costs almost nothing (just the domain registration). This is the route I took, and while there's more to learn upfront, you're working with simple text files and have complete ownership of everything.

If you're planning a content-heavy site like a blog and want something between these extremes, WordPress on a traditional host is a solid middle ground. There's a reason it powers a huge percentage of the internet. You get a balance of ease of use and flexibility, though you'll be paying for hosting.

You don't need to make a perfect choice right now. Most of these approaches let you export your content if you want to switch later. The important thing is to understand what each piece does so you can make an informed decision.

## Next steps
Once you've decided on an approach, look for beginner-friendly tutorials specific to the tools you've chosen. Most popular platforms and static site generators have excellent documentation and community tutorials. Search for phrases like "getting started with [tool name]" or "[tool name] for beginners."

A few resources to explore:
- [Jekyll's documentation for GitHub Pages](https://jekyllrb.com/docs/github-pages/)
- [Setting up a GitHub Pages site with Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll)
- [How to register a domain name on Namecheap](https://www.namecheap.com/support/knowledgebase/article.aspx/10072/35/how-to-register-a-domain-name/)

The technical aspects might feel overwhelming at first, but remember that at its heart, a website is just files on a server. Everything else is tools and services to make creating and managing those files easier. Start simple, learn as you go, and don't be afraid to experiment. That's how most of us learned.

All the best with your website.