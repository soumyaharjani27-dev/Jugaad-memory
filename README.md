# Jugaad Memory

[Live Demo](https://jugaad-memory.vercel.app/)

[GitHub Repository](https://github.com/soumyaharjani27-dev/Jugaad-memory)

### Private memory layer for repair technicians

Most AI assistants give technicians general knowledge.

**Jugaad Memory helps a workshop remember what it has already learned.**

## Problem

Repair knowledge is often trapped in technicians' heads, WhatsApp chats and scattered old repair records.

When a similar problem appears again, technicians may have to ask senior technicians, search old conversations, or diagnose the issue from scratch.

The problem isn't that repair knowledge doesn't exist — it is that workshops struggle to reliably remember and reuse it.

## Solution

Jugaad Memory turns a workshop's previous repair experience into a searchable, persistent memory.

A technician can show the system a device, describe the problem, and let the Repair Agent:

1. Inspect the current device using multimodal AI.
2. Search the workshop's previous repair memories.
3. Compare previous experience with the current situation.
4. Create the next diagnostic step.
5. Accept observations and corrections from the technician.
6. Replan when the situation changes.
7. Verify the repair.
8. Save the confirmed repair as new workshop knowledge.

## Agent Workflow

**Inspect → Remember → Reason → Plan → Observe → Replan → Verify → Learn**

The key idea is that the repair process is stateful.

The agent does not simply generate one answer and stop. Technician observations can change the current repair state and trigger a new plan.

## Core Features

- Multimodal device inspection
- Workshop memory retrieval
- Technician-in-the-loop diagnosis
- Adaptive repair planning
- Replanning after technician feedback
- Persistent workshop memories
- Memory creation and deletion
- Developer mode showing agent/tool events

## Agentic Architecture

Jugaad Memory uses a stateful Repair Agent rather than a single image-to-answer prompt.

### 1. Inspect

The system sends the device image and problem description to Gemini for multimodal inspection.

It extracts information such as:

- Device category
- Brand and model
- Visible evidence
- Components
- Error codes
- Reported symptoms

### 2. Remember

The system searches the workshop's stored repair memories using relevant device, brand, category, component and problem information.

Matching memories are ranked and returned with their relevance.

### 3. Reason & Plan

The Repair Agent combines the current repair state with relevant workshop memory and creates the next diagnostic step.

If no relevant workshop memory exists, the agent can still continue using the current device evidence and general diagnostic reasoning.

### 4. Observe

The technician can confirm the agent's finding or provide a different observation.

For example:

> "Battery nahi, charging port loose hai."

The technician's observation becomes new evidence in the repair state.

### 5. Replan

The agent updates the repair state and generates a new plan based on the technician's observation.

This prevents the system from blindly following its original assumption.

### 6. Verify & Learn

After the repair is confirmed, the technician can save the actual repair outcome as workshop memory.

This allows future repairs to benefit from previous experience.

## Core Agent Operations

The Repair Agent is organized around tool-style operations:

- `inspectScene()`
- `searchWorkshopMemory()`
- `compareWithMemory()`
- `createRepairPlan()`
- `recordTechnicianObservation()`
- `replan()`
- `verifyRepair()`
- `saveRepairMemory()`

## Tech Stack

- React
- TypeScript
- Node.js
- Express
- Google Gemini multimodal AI
- Vite
- Browser LocalStorage
- Server-side JSON persistence

## Data & Persistence

Workshop memories are persisted locally through browser storage and server-side JSON storage.

The application also supports individual memory deletion, so technicians can remove a stored repair when required.

## Developer Mode

Developer mode exposes concise runtime events from the agent workflow, such as:

```text
inspectScene()
searchWorkshopMemory()
PLAN CREATED
TECHNICIAN OBSERVATION
REPLANNING
PLAN UPDATED
REPAIR VERIFIED
MEMORY SAVED
