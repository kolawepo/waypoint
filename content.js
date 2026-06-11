/**
 * content.js — Waypoint v4
 */

(function init() {
  setTimeout(() => {
    injectFloatingButton();
    checkForNewChat();
  }, 2500);

  let lastUrl = window.location.href;

  setInterval(() => {
    injectFloatingButton();

    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log("[Waypoint] URL changed, checking for new chat...");
      setTimeout(checkForNewChat, 1000);
    }
  }, 1000);
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_SESSION") {
    const snapshot = extractSessionSnapshot();
    sendResponse({ snapshot });
    return true;
  }
});

function extractSessionSnapshot() {
  console.log("[Waypoint] Scanning page...");

  const rawText = getConversationText();
  const cleanedText = cleanSessionText(rawText);

  if (!cleanedText || cleanedText.length < 50) return {};

  const hostname = window.location.hostname;
  const platform = hostname.includes("claude.ai") ? "Claude" : "ChatGPT";

  const projectMatch = matchSavedProject(cleanedText);
  const lastTopic = extractLastTopic(cleanedText);
  const keywords = extractKeywords(cleanedText);
  const lastLines = getLastLines(cleanedText, 3);

  return {
    platform,
    projectName: projectMatch?.name || null,
    projectId: projectMatch?.id || null,
    lastTopic,
    keywords,
    lastLines,
    url: window.location.href,
  };
}

function getConversationText() {
  const hostname = window.location.hostname;

  const selectors = hostname.includes("claude.ai")
    ? [
        '[data-testid="conversation-turn"]',
        '[class*="ConversationTurn"]',
        '[class*="conversation-turn"]',
        '[class*="message"]',
        '[class*="Message"]',
        "article",
        "main",
        '[role="main"]',
      ]
    : [
        '[data-testid="conversation-turns"]',
        '[data-testid="conversation-turn"]',
        '[class*="conversation"]',
        "main",
        '[role="main"]',
      ];

  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const text = el.innerText || el.textContent || "";
        if (text.length > 100) return text;
      }
    } catch {}
  }

  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("script, style, nav, header, footer").forEach(el => el.remove());
  return clone.innerText || clone.textContent || "";
}

function cleanSessionText(text) {
  const junk = [
    "Resume Instruction:",
    "Continuing from a previous",
    "What we were doing:",
    "Current state:",
    "Next step:",
    "Next Step:",
    "Technologies mentioned:",
    "Recent context:",
    "Summary:",
    "ChatGPT can make mistakes",
    "Check important info",
    "Claude can make mistakes",
    "Waypoint API running on port 3001",
    "The previous session involved debugging",
    "Continue from where we left off",
    "const response = await fetch",
    "SUMMARY_API_URL",
    "chrome.storage.local",
    "content.js:",
    "[Waypoint]",
    "Understand this error",
    "Grammarly.js",
    "DatadogRUM",
  ];

  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 25)
    .filter(line => !junk.some(j => line.includes(j)))
    .filter(line => !line.startsWith("at "))
    .filter(line => !line.startsWith("chrome."))
    .filter(line => !line.startsWith("document."))
    .filter(line => !line.startsWith("window."))
    .filter(line => !line.startsWith("console."))
    .join("\n");
}

function matchSavedProject(text) {
  try {
    const cached = sessionStorage.getItem("waypointProjectNames");
    if (!cached) return null;

    const projects = JSON.parse(cached);
    const lower = text.toLowerCase();

    return projects.find(p => lower.includes(p.name.toLowerCase())) || null;
  } catch {
    return null;
  }
}

function extractLastTopic(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 20);

  const buildWords = [
    "building",
    "working on",
    "implementing",
    "fixing",
    "debugging",
    "creating",
    "adding",
    "integrating",
    "deploying",
    "setting up",
    "trying to",
    "error",
    "issue",
    "feature",
    "component",
    "endpoint",
    "api",
    "database",
    "auth",
    "deploy",
  ];

  for (let i = lines.length - 1; i >= 0; i--) {
    const lower = lines[i].toLowerCase();
    if (buildWords.some(w => lower.includes(w))) {
      return lines[i].slice(0, 160);
    }
  }

  return lines[lines.length - 1]?.slice(0, 160) || null;
}

function extractKeywords(text) {
  const techTerms = [
    "React",
    "Firebase",
    "Cloudflare",
    "AWS",
    "S3",
    "OpenAI",
    "API",
    "JavaScript",
    "Python",
    "TypeScript",
    "Node",
    "Express",
    "Postgres",
    "MongoDB",
    "Docker",
    "Vercel",
    "Supabase",
    "Auth",
    "JWT",
    "Claude",
    "ChatGPT",
    "GPT",
    "Chrome",
    "extension",
    "Stripe",
    "Redux",
    "Next",
    "Tailwind",
    "CSS",
    "HTML",
    "SQL",
    "Prisma",
    "Vite",
  ];

  return techTerms
    .filter(term => text.toLowerCase().includes(term.toLowerCase()))
    .slice(0, 8);
}

function getLastLines(text, n) {
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 25)
    .slice(-n)
    .join(" ")
    .slice(0, 300);
}

async function checkForNewChat() {
  if (!isNewChat()) return;

  const data = await storageGet(["waypointAutoSession", "waypointProjects"]);
  const session = data.waypointAutoSession;
  const projects = data.waypointProjects || [];

  if (!session) return;

  const threeHours = 3 * 60 * 60 * 1000;
  if (Date.now() - session.savedAt > threeHours) return;

  if (session.url === window.location.href) return;

  if (projects.length > 0) {
    sessionStorage.setItem(
      "waypointProjectNames",
      JSON.stringify(projects.map(p => ({ id: p.id, name: p.name })))
    );
  }

  const title = session.projectName
    ? `Continue working on ${session.projectName}?`
    : `Continue your last ${session.platform} session?`;

  const subtitle = session.aiSummary
    ? session.aiSummary.split("\n")[1]?.slice(0, 80) || "AI-generated session summary ready"
    : session.lastTopic || "Pick up where you left off";

  showContinuePrompt({ title, subtitle, session, projects });
}

function isNewChat() {
  const hostname = window.location.hostname;

  if (hostname.includes("claude.ai")) {
    return (
      window.location.pathname === "/" ||
      window.location.pathname.includes("/new") ||
      window.location.pathname === "/chats" ||
      !document.querySelector("article")
    );
  }

  if (hostname.includes("chatgpt.com") || hostname.includes("chat.openai.com")) {
    return (
      !document.querySelector('[data-testid="conversation-turn"]') &&
      !document.querySelector('[class*="group/conversation-turn"]')
    );
  }

  return false;
}

function showContinuePrompt({ title, subtitle, session, projects }) {
  if (document.getElementById("waypoint-prompt")) return;

  if (!document.getElementById("waypoint-styles")) {
    const style = document.createElement("style");
    style.id = "waypoint-styles";
    style.textContent = `
      @keyframes wpSlideDown {
        from { opacity:0; transform:translateX(-50%) translateY(-14px); }
        to { opacity:1; transform:translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  const prompt = document.createElement("div");
  prompt.id = "waypoint-prompt";

  Object.assign(prompt.style, {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    background: "#222d1f",
    border: "1px solid #3a4d35",
    borderLeft: "3px solid #E8753A",
    borderRadius: "10px",
    padding: "13px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    fontFamily: "'DM Sans','Inter',system-ui,sans-serif",
    fontSize: "13px",
    color: "#e8dfc8",
    maxWidth: "460px",
    width: "calc(100vw - 40px)",
    animation: "wpSlideDown 0.2s ease",
  });

  prompt.innerHTML = `
    <div style="flex:1;line-height:1.45;min-width:0">
      <div style="font-weight:700;color:#e8dfc8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
      <div style="color:#8a9e7e;font-size:11.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${subtitle}</div>
    </div>
    <button id="waypoint-yes" style="background:#E8753A;color:#1a2318;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">Continue</button>
    <button id="waypoint-no" style="background:transparent;color:#8a9e7e;border:1px solid #3a4d35;border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;font-family:inherit">✕</button>
  `;

  document.body.appendChild(prompt);

  document.getElementById("waypoint-yes").addEventListener("click", async () => {
    let contextText = "";

    if (session.projectId) {
      const p = projects.find(proj => proj.id === session.projectId);
      if (p) contextText = buildContextBlock(p);
    }

    if (!contextText) {
      if (session.aiSummary) {
        contextText = [
          `Continuing from a previous ${session.platform} session.`,
          "",
          session.aiSummary,
          "",
          "---",
          "Resume Instruction: Use this context to continue from where we left off without asking me to re-explain the conversation.",
        ].join("\n");
      } else {
        contextText = buildAutoContext(session);
      }
    }

    const inserted = insertIntoChat(contextText);

    if (!inserted) {
      navigator.clipboard.writeText(contextText);
      showToast("Copied to clipboard — paste it in.");
    } else {
      showToast("✓ Context injected");
    }

    prompt.remove();
  });

  document.getElementById("waypoint-no").addEventListener("click", () => {
    prompt.remove();
  });

  setTimeout(() => {
    document.getElementById("waypoint-prompt")?.remove();
  }, 5 * 60 * 1000);
}

function buildAutoContext(session) {
  const lines = [];

  lines.push(`Continuing from a previous ${session.platform} session.`);
  lines.push("");

  if (session.lastTopic) {
    lines.push("What we were doing:");
    lines.push(session.lastTopic);
    lines.push("");
  }

  if (session.lastLines) {
    lines.push("Current state:");
    lines.push(session.lastLines);
    lines.push("");
  }

  lines.push("Next step:");
  lines.push("Continue from where we left off without asking me to re-explain the conversation.");

  lines.push("");
  lines.push("---");
  lines.push("Resume Instruction: Use this context to continue from where we left off.");

  return lines.join("\n");
}

function injectFloatingButton() {
  if (document.getElementById("waypoint-btn")) return;

  const btn = document.createElement("button");
  btn.id = "waypoint-btn";
  btn.textContent = "⊕ Waypoint";
  btn.title = "Insert Waypoint project context manually";

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    zIndex: "99999",
    background: "#E8753A",
    color: "#1a2318",
    border: "none",
    borderRadius: "99px",
    padding: "9px 16px",
    fontSize: "13px",
    fontWeight: "700",
    fontFamily: "'DM Sans','Inter',system-ui,sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 18px rgba(232,117,58,0.4)",
  });

  btn.addEventListener("click", handleManualInsert);
  document.body.appendChild(btn);
}

function handleManualInsert() {
  chrome.storage.local.get(["waypointProjects", "waypointActiveId"], data => {
    const projects = data.waypointProjects || [];
    const project = projects.find(p => p.id === data.waypointActiveId);

    if (!project) {
      showToast("No active project. Open Waypoint and select one.");
      return;
    }

    const context = buildContextBlock(project);

    if (insertIntoChat(context)) {
      showToast(`✓ ${project.name} context inserted`);
    } else {
      navigator.clipboard.writeText(context);
      showToast("Copied to clipboard — paste it in.");
    }
  });
}

function insertIntoChat(text) {
  const hostname = window.location.hostname;

  const selectors = hostname.includes("claude.ai")
    ? [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][data-placeholder]',
        'div[contenteditable="true"]',
        "textarea",
      ]
    : [
        'div[contenteditable="true"]#prompt-textarea',
        'div[contenteditable="true"]',
        "textarea",
      ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return setValueAndTrigger(el, text);
  }

  return false;
}

function setValueAndTrigger(el, text) {
  try {
    el.focus();

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      );

      if (nativeSetter) nativeSetter.set.call(el, text);
      else el.value = text;

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);

      if (!el.textContent.includes(text.slice(0, 20))) {
        el.textContent = text;
        el.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: text,
          })
        );
      }
    }

    return true;
  } catch (err) {
    console.error("[Waypoint] Insert failed:", err);
    return false;
  }
}

function showToast(message) {
  document.getElementById("waypoint-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "waypoint-toast";
  toast.textContent = message;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "148px",
    right: "20px",
    zIndex: "99999",
    background: "#222d1f",
    color: "#e8dfc8",
    border: "1px solid #2f3d2b",
    borderLeft: "3px solid #E8753A",
    borderRadius: "7px",
    padding: "9px 14px",
    fontSize: "12px",
    fontFamily: "'DM Sans','Inter',system-ui,sans-serif",
    fontWeight: "500",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    maxWidth: "260px",
    lineHeight: "1.4",
  });

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function storageGet(keys) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(keys, resolve);
    } catch (err) {
      console.warn("[Waypoint] Storage unavailable. Refresh tab after extension reload.", err);
      resolve({});
    }
  });
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function buildContextBlock(project) {
  function bulletList(raw) {
    if (!raw) return "";
    return raw
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `• ${l}`)
      .join("\n");
  }

  const lines = [`Project: ${project.name}`];

  if (project.completed) lines.push("", "Completed:", bulletList(project.completed));
  if (project.inProgress) lines.push("", "In Progress:", bulletList(project.inProgress));
  if (project.blocked) lines.push("", "Blocked:", bulletList(project.blocked));
  if (project.nextSteps) lines.push("", "Next Steps:", bulletList(project.nextSteps));
  if (project.notes) lines.push("", "Notes:", bulletList(project.notes));

  lines.push(
    "",
    "---",
    "Resume Instruction: Use this context to continue the project without asking me to re-explain completed work."
  );

  return lines.join("\n");
}
