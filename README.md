# Waypoint

AI project memory for ChatGPT and Claude.

Waypoint automatically captures project context from your AI conversations, generates structured handoff summaries, and lets you continue work across platforms without repeatedly re-explaining your project.

## The Problem

AI assistants are great at understanding conversations, but terrible at maintaining project state.

Every time you:

* Start a new chat
* Hit context limits
* Switch between ChatGPT and Claude
* Return after a long break

you lose continuity.

The AI no longer knows:

* What project you're working on
* What you've already built
* What is currently in progress
* What should happen next

Most people solve this by maintaining notes, pinning tabs, or repeatedly copying context into new conversations.

Waypoint automates that process.

## What Waypoint Does

Waypoint acts as a project memory layer for AI-assisted work.

While you work in ChatGPT or Claude, Waypoint monitors conversation activity and automatically creates structured project summaries.

When you open a new conversation, Waypoint detects that context exists and offers to continue where you left off.

> "Continue working on Vault?"

One click later, your project context is injected into the new conversation.

## Features

### AI-Generated Session Summaries

Waypoint automatically summarizes active work sessions into structured handoffs:

* What we were doing
* Current state
* Next steps

### Cross-Platform Continuation

Move seamlessly between:

* ChatGPT → Claude
* Claude → ChatGPT
* New chat → New chat

without manually rebuilding context.

### Automatic Session Detection

Waypoint monitors active AI conversations and extracts relevant project context in the background.

### Continue Banner

When a new conversation is detected, Waypoint presents a one-click continuation prompt.

### Manual Project Mode

Create named projects and store:

* Completed work
* In progress tasks
* Blockers
* Next steps
* Notes

for precise control over project state.

### Multi-Project Support

Manage multiple ongoing projects simultaneously.

Examples:

* Vault
* Waypoint
* Habi

### Local-First Architecture

Project data remains stored locally within the browser.

AI summaries are generated through the configured OpenAI backend.

## Example

A user spends several hours building Vault.

They discuss:

* File uploads
* Authentication
* OpenAI integration
* AI document chat

The next day they open Claude.

Waypoint automatically provides:

Continuing from a previous ChatGPT session.

What we were doing:
Building Vault's storage and AI features.

Current state:

* File uploads working
* OpenAI summaries working
* Dashboard in progress

Next step:

* Project-aware memory
* AI document chat

The user resumes immediately without re-explaining the project.

## Tech Stack

### Extension

* Chrome Extension (Manifest V3)
* JavaScript
* HTML
* CSS
* Chrome Tabs API
* chrome.storage.local

### AI Layer

* OpenAI API
* Express.js
* Node.js

## Installation

### Extension

1. Clone the repository
2. Open Chrome
3. Navigate to chrome://extensions
4. Enable Developer Mode
5. Click Load Unpacked
6. Select the Waypoint directory

### Backend

1. Navigate to waypoint-api

```bash
cd waypoint-api
```

2. Install dependencies

```bash
npm install
```

3. Create a .env file

```env
OPENAI_API_KEY=your_api_key_here
PORT=3001
```

4. Start the server

```bash
npm start
```

## Current Roadmap

### Completed

* Session detection
* AI-generated summaries
* Cross-platform continuation
* Continue banner
* Automatic context injection

### In Progress

* Summary quality improvements
* Better project detection

### Planned

* Project-aware memory
* Automatic project matching
* Semantic project search
* Conversation timeline view

## Why I Built This

I frequently switched between ChatGPT and Claude while building software projects.

Every new conversation required rebuilding project context from scratch.

Waypoint was created to solve that problem by giving AI tools a memory layer that survives across conversations, platforms, and context windows.

