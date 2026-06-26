# Teable_UI&UX.mov — animation & flow analysis vs current app

Sampled at 1s across key windows (PyAV). Below = the motion/interaction choreography and
how the current code compares.

## Flow timeline (what animates, when)
| t | Event | Animation |
|---|---|---|
| 0–11s | Home empty state | **Auto-cycling typewriter carousel** inside the input — prompts type out char-by-char (resumes → feedback analysis → "Build a CRM"), pagination dots, looping. Greeting avatar bobs. |
| 12–20s | User types "Build a CRM" | char-by-char input; **Démarrer** submit |
| ~21s | Submit | Empty state (greeting + carousel + template cards) **collapses/clears**; thread mounts. User prompt animates to a **floating pill pinned top-right** ("Build a CRM"). "Guppy" header + "En train de penser" appear. |
| 26–50s | Thinking | Plain reasoning text streams; centered **pulsing `•••`** indicator above input; status pin "En train de penser". |
| 70–130s | Tool use | Tool calls render as **collapsible grouped cards** — header "+N more tools", each row a ✓ + chevron, auto-collapses as the next group starts. Sticky **"Task Progress N/4" checklist** mounts above input and ticks live. |
| ~161–176s | Build | Left nav tree **populates row-by-row** as tables are created; then center pane **auto-opens the live grid** (URL → /CRM Companies) while chat stays docked right → **3-pane** (nav │ grid │ chat). |
| 300–330s | Data insert | Grid fills **row-by-row**; bottom-left "N enregistrements" **counter + progress shimmer** during writes. |
| later | Error | Inline **"Server error occurred" + "Continue"** resume button in the chat stream. |

## Parity in current code (`components/AgentChat/`, `features/app/components/chat-panel/`)
- **Has:** `ToolExecutionCard` (per-card chevron expand + `CheckCircle2`/`Loader2`); `ThinkingStepStream`
  (interval-driven steps); `isStreaming` spinner + `animate-bounce` thinking dots; docked
  `ChatPanel` (open/close via `useChatPanelStore`); `BuilderStatusPanel` (circular-progress SVG +
  `scan` gradient line); `ProposalCard` "Failed — retry?".

## Gaps — animations/flows NOT in current app
1. **Typewriter auto-cycling prompt carousel** — current empty state is static `suggestionGroups`; no typing/rotation/dots.
2. **Empty-state→thread collapse choreography** + **user-prompt floating pill (top-right)** — not present (`MessageItem` has no pill/sticky).
3. **Grouped "+N more tools" auto-collapse** — current cards expand individually; no grouping/roll-up.
4. **Sticky "Task Progress N/4" checklist** docked above input — closest analog is `BuilderStatusPanel` (a *scanning circular* visual in the wizard, not a pinned step-checklist in the grid chat).
5. **3-pane build choreography** — left tree row-by-row populate + **auto-navigate center pane to the live grid** while chat stays docked. Current `ChatPanel` is a toggled side panel; no auto-open/resizable split tied to agent actions.
6. **Live record-insert shimmer + "N enregistrements" counter** during agent writes — absent.
7. **Inline "Server error → Continue" resume** in the stream — current only has `ProposalCard` Retry, not a mid-run continue affordance.
8. Branding "Guppy" + GPT-5.5 model label.
