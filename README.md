# 3D Television Production Simulator

A web-based 3D television production simulator built with **Three.js**, **TypeScript** and **Vite**.

The player acts as both **vision mixer/director** and **camera operator**, managing several virtual camera feeds from a live 3D studio and switching between **Preview** and **Programme** outputs inside a procedural 3D control room.

## Current Features

- Procedural 3D studio scene
- Procedural 3D control room
- Four virtual studio cameras:
  - CAM1: crane camera
  - CAM2: wide/general tripod camera
  - CAM3: detail tripod camera
  - CAM4: detail tripod camera
- Real-time camera feeds rendered to control room monitors
- Preview and Programme monitors
- CUT switching
- Green Preview tally
- Red Programme tally
- Manual camera operation:
  - Crane movement
  - Tripod pan/tilt
  - Zoom in/out
- Operator commands:
  - Frame host
  - Frame guest A
  - Frame guest B
  - Return to wide shot
- Reset camera shot
- Help overlay with controls

## Tech Stack

- [Three.js](https://threejs.org/)
- TypeScript
- Vite
- HTML/CSS

## Installation

```bash
npm install
````

## Development

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Controls

### Vision Mixing

| Key     | Action                   |
| ------- | ------------------------ |
| `1`     | Select CAM1 to Preview   |
| `2`     | Select CAM2 to Preview   |
| `3`     | Select CAM3 to Preview   |
| `4`     | Select CAM4 to Preview   |
| `Space` | CUT Preview to Programme |

### Manual Camera Operation

| Key / Input | Action                                                |
| ----------- | ----------------------------------------------------- |
| Mouse wheel | Zoom in/out on the Preview camera                     |
| `W` / `S`   | Move crane up/down when CAM1 is in Preview            |
| `A` / `D`   | Move crane left/right when CAM1 is in Preview         |
| Arrow keys  | Pan/tilt tripod cameras when CAM2-CAM4 are in Preview |
| `R`         | Reset current Preview camera                          |

### Operator Commands

| Key | Action                                |
| --- | ------------------------------------- |
| `H` | Ask operator to frame the host        |
| `J` | Ask operator to frame Guest A         |
| `K` | Ask operator to frame Guest B         |
| `G` | Ask operator to return to a wide shot |

### Help

| Key        | Action              |
| ---------- | ------------------- |
| `F1` / `?` | Toggle help overlay |
| `Esc`      | Close help overlay  |

## Project Structure

```txt
src/
  main.ts
  style.css

  types.ts
  constants.ts

  ui/
    helpOverlay.ts

  utils/
    createCanvasLabel.ts

  studio/
    createPerson.ts
    createStudio.ts
    createStudioCameras.ts

  control-room/
    createButton.ts
    createMonitor.ts
    createControlRoom.ts

  game/
    operators.ts
```

## Concept

The game simulates a live television production workflow.

The player can either manually operate cameras or delegate framing commands to virtual camera operators. The goal is to prepare shots in Preview and cut them to Programme at the right moment, creating a clean live broadcast.

## Roadmap

Planned features include:

* Operator status indicators: `IDLE`, `MOVING`, `READY`, `ON AIR`
* Shot quality scoring
* Timeline-based events
* Presenter and guest speaking states
* Programme rhythm scoring
* Camera movement smoothness scoring
* More shot types
* Better studio set design
* Audio and VU indicators
* Graphics/lower thirds
* Replay/VTR-style inputs
* Game modes and levels

## Licence

This project is licensed under the GNU Affero General Public License v3.0.