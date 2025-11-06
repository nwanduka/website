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
                    posts.append({
                        'content': content,
                        'filename': file['name'],
                        'url': f"https://prometheus.io/blog/{file['name'].replace('.md', '')}/"
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
        
        title = frontmatter.get('title', 'Untitled')
        date_str = frontmatter.get('created_at', datetime.now().strftime('%Y-%m-%d'))
        
        # Convert date format
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        except:
            date_obj = datetime.now()
        
        # Create Jekyll filename
        slug = post_data['filename'].replace('.md', '')
        filename = f"{date_obj.strftime('%Y-%m-%d')}-{slug}.md"
        
        # Create Jekyll frontmatter
        jekyll_frontmatter = f"""---
layout: post
title: "{title}"
date: {date_obj.strftime('%Y-%m-%d')}
categories: [blog, external]
tags: [prometheus, monitoring]
canonical_url: {post_data['url']}
published_on: "Prometheus Blog"
external: true
---

> Originally published on [Prometheus Blog]({post_data['url']})

{body}
"""
    
    
    # Write to file
    filepath = Path(POSTS_DIR) / filename
    
    # Check if file already exists
    if filepath.exists():
        print(f"  Skipping {filename} - already exists")
        return
    
    # Create posts directory if it doesn't exist
    Path(POSTS_DIR).mkdir(exist_ok=True)
    
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
