#!/usr/bin/env python3
"""
Fetch external blog posts from Prometheus and convert them to Jekyll markdown format.
"""

import os
import re
import requests
from datetime import datetime
from pathlib import Path

# Configuration
GITHUB_USERNAME = "nwanduka"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = PROJECT_ROOT / "_posts"

# GitHub API settings
GITHUB_API = "https://api.github.com"
PROMETHEUS_REPO = "prometheus/docs"
BLOG_PATH = "blog/posts"


def fetch_prometheus_posts():
    """Fetch blog posts from Prometheus where user is author/co-author."""
    print("Fetching Prometheus posts...")
    
    # Get list of files in blog directory
    url = f"{GITHUB_API}/repos/{PROMETHEUS_REPO}/contents/{BLOG_PATH}"
    headers = {"Accept": "application/vnd.github.v3+json"}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        files = response.json()
        
        posts = []
        for file in files:
            if file['name'].endswith('.md'):
                # Fetch file content
                content_response = requests.get(file['download_url'])
                content = content_response.text
                
                # Check if user is author
                if f"@{GITHUB_USERNAME}" in content or GITHUB_USERNAME in content:
                    # e.g. 2025-10-30-non-code-contribution
                    filename_raw = file["name"].replace(".md", "") 
                    # Use rsplit to be safe, but simple split on '-' works for this format
                    year, month, day, *rest = filename_raw.split("-")
                    post_slug = "-".join(rest)

                    posts.append({
                        "content": content,
                        "filename": file["name"],
                        "url": f"https://prometheus.io/blog/{year}/{month}/{day}/{post_slug}/"
                    })
                    print(f"  Found: {file['name']}")
        
        return posts
    except Exception as e:
        print(f"Error fetching Prometheus posts: {e}")
        return []


def extract_prometheus_frontmatter(content):
    """Extract frontmatter from Prometheus markdown."""
    frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if not frontmatter_match:
        return None, content
    
    frontmatter_text = frontmatter_match.group(1)
    body = content[frontmatter_match.end():]
    
    # Parse frontmatter
    frontmatter = {}
    for line in frontmatter_text.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            frontmatter[key.strip()] = value.strip()
    
    return frontmatter, body


def create_jekyll_post(post_data, platform):
    """Create Jekyll markdown file from post data."""

    if platform == "prometheus":
        frontmatter, body = extract_prometheus_frontmatter(post_data['content'])
        if not frontmatter:
            print(f"  Skipping {post_data['filename']} - no frontmatter")
            return

        # ------------------- FINAL FIX APPLIED HERE -------------------
        # We MUST use the filename for the final date and slug for Jekyll.
        raw = post_data['filename'].replace('.md', '')
        # raw example: 2025-10-30-non-code-contribution

        # Use regex to reliably extract the date and the rest of the string (the slug)
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})-(.*)$', raw)

        if not date_match:
            print(f"  Skipping {post_data['filename']} - failed to parse date and slug from filename.")
            return

        # date_str is '2025-10-30'
        date_str = date_match.group(1)
        # slug is 'non-code-contribution'
        slug = date_match.group(2)
        
        # Now safely separate YYYY, MM, DD for use in filename construction
        year, month, day = date_str.split('-')

        # Force date to match the filename, ignore Prometheus frontmatter date
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        # --------------------------------------------------------------

    # Correct final filename (no duplicate date, always uses filename date)
    filename = f"{year}-{month}-{day}-{slug}.md"

    # Jekyll front matter
    jekyll_frontmatter = f"""---
layout: post
title: "{frontmatter.get('title', 'Untitled')}"
date: {date_obj.strftime('%Y-%m-%d')}
categories: [blog]
tags: [prometheus, monitoring]
canonical_url: {post_data['url']}
published_on: "Prometheus Blog"
---
> Originally published on [Prometheus Blog]({post_data['url']})

{body}
"""

    # Write file
    filepath = Path(POSTS_DIR) / filename

    if filepath.exists():
        print(f"  Skipping {filename} - already exists")
        return

    POSTS_DIR.mkdir(exist_ok=True)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(jekyll_frontmatter)

    print(f"  Created: {filename}")


def main():
    """Main function to fetch and process all posts."""
    print("Starting external posts sync...\n")
    
    # Fetch from Prometheus
    prometheus_posts = fetch_prometheus_posts()
    print(f"\nFound {len(prometheus_posts)} Prometheus posts\n")
    
    for post in prometheus_posts:
        create_jekyll_post(post, "prometheus")
    
    
    print("\nSync complete!")


if __name__ == "__main__":
    main()