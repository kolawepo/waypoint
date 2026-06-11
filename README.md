# Waypoint

A Chrome extension that acts as a project memory layer for AI-assisted work.

## The Problem

Every time you open a new ChatGPT or Claude conversation, the AI starts from zero. You have to re-explain your project, what you've built, what's broken, and where you left off. If you switch between platforms, it gets worse.

People have built workarounds — pinned tabs per project, copy-pasting notes, starting every session with a wall of context. None of it feels right.

## What Waypoint Does

Waypoint watches your AI tabs in the background. When you open a new chat, it automatically detects what project you were just working on and prompts you to inject that context — no forms, no copy-paste, no re-explaining.

> *"Continue working on Vault?"* → Click Continue → context injected.

## Features

- **Auto session detection** — reads your open Claude/ChatGPT tabs and detects what you're working on from the actual conversation content
- **Continue prompt** — a banner appears on new chats with one-click context injection
- **Cross-platform** — works across Claude → ChatGPT and vice versa
- **Manual mode** — save named projects with structured fields for precise control
- **Multi-project support** — up to 5 projects free, switch between them instantly
- **Zero setup** — just install and use your AI tools normally
- **100% local** — nothing leaves your browser, no backend, no accounts, no tracking

## Tech Stack

- Manifest V3 Chrome Extension
- Plain HTML, CSS, JavaScript (no frameworks)
- `chrome.storage.local` for persistence
- Chrome `tabs` API for session awareness

## Install

1. Clone this repo
2. Go to `chrome://extensions` in Chrome
3. Enable **Developer Mode**
4. Click **Load Unpacked** → select this folder

## Usage

**Auto mode:**
1. Have any conversation in Claude or ChatGPT
2. Open a new chat tab
3. Waypoint detects your session and shows a prompt
4. Click **Continue** — context injected automatically

**Manual mode:**
1. Click the Waypoint icon in your toolbar
2. Create a project and fill in the fields
3. Click **⊕ Waypoint** on any AI page to inject

## Why I Built This

I was working across multiple AI tools simultaneously — switching between Claude and ChatGPT, hitting context limits, opening new chats. Every new conversation started from zero. I built Waypoint because I needed it.
