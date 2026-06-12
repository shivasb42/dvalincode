# DvalinCode End-to-End POC: Plan and Build a Snake HTML Game

This POC shows DvalinCode creating a small browser game end to end: select a workspace, plan the work, build the file, and run the generated result.

## Result

- Project folder: [`snake-html-game`](./snake-html-game/)
- Generated app: [`snake-html-game/index.html`](./snake-html-game/index.html)
- Runtime: single-file HTML, CSS, and JavaScript. No build step required.

To run it locally:

```sh
cd poc/snake-html-game
python3 -m http.server 8100
```

Then open `http://localhost:8100`.

## Flow Summary

1. Open DvalinCode Web GUI.
2. Set the workspace to `poc/snake-html-game`.
3. Use Code mode with **Plan Mode** to ask for an implementation plan.
4. Switch to **Auto Mode**.
5. Ask DvalinCode to build the planned single-file Snake game.
6. DvalinCode writes `index.html`.
7. Open the generated game in a browser and verify it runs.

## Screenshots

### 1. DvalinCode Web GUI

![DvalinCode home](./screenshots/01-dvalincode-home.png)

### 2. Set Workspace

![Set workspace path](./screenshots/02-set-workspace.png)

### 3. Workspace Selected

![Workspace selected](./screenshots/03-workspace-selected.png)

### 4. Select Plan Mode

![Plan mode selected](./screenshots/04-plan-mode-selected.png)

### 5. Plan Prompt

![Plan prompt ready](./screenshots/05-plan-prompt-ready.png)

### 6. Plan Running

![Plan running](./screenshots/06-plan-running.png)

### 7. Plan Result

![Plan result](./screenshots/07-plan-result.png)

### 8. Select Auto Mode

![Auto mode selected](./screenshots/08-auto-mode-selected.png)

### 9. Build Prompt

![Build prompt ready](./screenshots/09-build-prompt-ready.png)

### 10. Build Running

![Build running](./screenshots/10-build-running.png)

### 11. Build Result

![Build result](./screenshots/11-build-result.png)

### 12. Generated Game Opened

![Generated game opened](./screenshots/12-game-opened.png)

### 13. Generated Game Playing

![Generated game playing](./screenshots/13-game-playing.png)

## Notes

- The workspace and generated file were created in `poc/snake-html-game`.
- The planning step used DvalinCode Code mode with **Plan Mode**.
- The implementation step used DvalinCode Code mode with **Auto Mode**.
- The generated app was verified in a browser after serving the project with Python's built-in HTTP server.
