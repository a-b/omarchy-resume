# Recall

A centered, telescope-style overlay for Omarchy that finds past AI coding
sessions and opens the one you pick in a terminal. `preview.png` is the
marketplace shot.

One picker for every agent the machine already knows about: search, preview,
and resume Claude Code, Codex, Grok, OpenCode, Pi, and anything that registers
the same way.

## What you get

- A fullscreen overlay with a search field, a session list, and a live
  transcript preview
- Sessions from Claude Code, Codex, Grok, OpenCode, and Pi out of the box
- Resume in the session's original working directory via
  `xdg-terminal-exec --dir`, with the same unattended flags `omarchy agent`
  already uses
- Automatic names and default-agent highlighting from Omarchy's existing
  agent registration (usage records + `~/.config/omarchy/defaults/agent`)
- A drop-in adapter contract so a new agent never needs a plugin patch

Summon it:

```
omarchy-shell shell toggle thomas.recall
```

Or press Super+Alt+A after the binding below is in place. The Omarchy menu
gains a **Trigger > Recall session** entry as well.

## Why it hooks into Omarchy agents

Omarchy already has a registration path for coding agents:

- `omarchy default agent <name>` writes `~/.config/omarchy/defaults/agent`
- `omarchy-agent-usage-<id>` collectors publish a JSON record to
  `~/.local/state/omarchy/agents/usage/`
- `omarchy agent` launches the chosen CLI with the right “don't stop to ask”
  flags and the shared `org.omarchy.agent` window class

Recall reads those same records. A source chip uses the usage record's
display name when one exists, bolds the default agent, and resumes with the
same launch flags so a recalled session behaves like one started from the
keybinding.

Adding an agent to the picker is the same move as adding one to the usage
panel: ship a collector. For sessions, the collector is named
`omarchy-agent-sessions-<id>`.

## Adapter contract

Recall discovers session sources in this order. A later match with the same
id wins, so a user adapter can replace a bundled one.

1. Built-in adapters for Claude, Codex, Grok, OpenCode, and Pi
2. `~/.config/omarchy/agents/sessions/<id>` (next to agent config such as
   `~/.config/omarchy/agents/fireworks.json`)
3. `omarchy-agent-sessions-<id>` on `PATH`, including `$OMARCHY_PATH/bin`

An adapter is an executable that speaks three commands:

```
adapter list [--limit N]
adapter preview <session-id>
adapter resume <session-id>
```

`list` prints a JSON array, a `{ "sessions": [...] }` object, or JSONL.
Each session is:

```json
{
  "id": "abc123",
  "title": "Fix the idle lock flicker",
  "cwd": "/home/you/code/app",
  "updatedAt": "2026-08-15T18:01:00+00:00",
  "model": "grok-4.6",
  "messageCount": 12,
  "snippet": "The lock screen flashes on resume."
}
```

`preview` prints the transcript as plain text.

`resume` prints the launch plan, then Recall opens it in a terminal:

```json
{
  "command": ["my-agent", "--resume", "abc123"],
  "cwd": "/home/you/code/app"
}
```

See `examples/omarchy-agent-sessions-example` for a complete adapter. World-writable
files are ignored.

Optional config lives at `~/.config/omarchy/recall.json`:

```json
{
  "groupBy": "date",
  "sources": {
    "claude": { "enabled": true },
    "codex": { "enabled": false }
  }
}
```

`groupBy` is `date` (Today / Yesterday / June 10) or `project`. Project grouping
collapses git worktrees and jj workspaces to the main checkout, so
`berserk` stays one group. Paths without git or jj group by the folder the
session started in. Agent names are still searchable; they are no longer a
primary filter.

## Keys

| Key | Action |
|-----|--------|
| type | Filter the list |
| Backspace / Ctrl+Backspace / Ctrl+U | Edit or clear the filter |
| ↑ ↓ / Ctrl+J Ctrl+K / Ctrl+P Ctrl+N | Move the selection |
| Page Up / Page Down | Scroll the preview |
| Tab / Ctrl+G | Change grouping (`Tab:change grouping (date)` or `(project)`) |
| Ctrl+Y / Ctrl+C / Shift+Enter | Copy the transcript |
| Ctrl+O | Open in another installed agent |
| Ctrl+R | Rescan sessions |
| Enter | Resume the selected session |
| Esc | Clear the filter, or close |

Copy puts a pasteable handoff on the clipboard: title, original agent,
directory, and the conversation labeled User / Assistant. Open-in starts a
*new* session in another installed agent (the same launch flags as
`omarchy agent`) in the original working directory. A short transcript is
passed as the first prompt; a long one is written to
`~/.cache/omarchy/recall/` and the new agent is asked to read that file.
This is not a converted native session — it is a clean continuation prompt.

```
recall copy grok <session-id>
recall open grok <session-id> --agent claude
```

The overlay accepts a JSON payload, so other plugins can open it already
narrowed:

```
omarchy-shell shell summon thomas.recall '{"source":"grok","cwd":"/home/you/code/app"}'
```

## Install

This folder is a normal Omarchy plugin. From a git checkout:

```
omarchy plugin add <git-url> --enable
```

Or copy it to `~/.config/omarchy/plugins/thomas.recall/` and run:

```
omarchy plugin validate ~/.config/omarchy/plugins/thomas.recall
omarchy-shell shell rescanPlugins
omarchy plugin enable thomas.recall
```

Then bind it and add the menu row if they are not already present:

```
omarchy-shell shell toggle thomas.recall
```
