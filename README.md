# App Reveal Studio

Interactive app reveal animation playground built with Next.js, React, TypeScript, Tailwind CSS, and Framer Motion. Video generation runs on the server via headless Chromium to guarantee consistent rendering across all browsers.

## Features

- Live preview for app reveal animation
- Collapsible floating controls panel
- Editable title, subtitle, badge text, and icon URLs
- Badge presets for App Store, Google Play, and custom badges
- Local icon upload (takes priority over icon URL)
- Drag and pinch to reposition and scale individual layers, with alignment guides
- Adjustable duration, playback speed, and icon corner radius
- Color controls for glow, rim, and gray sweep
- Server-side video export using headless Chromium (no Safari compatibility issues)
- Cancellable export with live queue position

## Demo

- **Open Slide** [🔗](https://github.com/1weiho/open-slide)
- **Subflow** [🔗](https://github.com/ridemountainpig/subflow)

<table>
  <tr>
    <td align="left">
      <video src="https://github.com/user-attachments/assets/18ab62e3-40c2-426d-86e7-6a69df2800f9" controls width="100%"></video>
    </td>
    <td align="left">
      <video src="https://github.com/user-attachments/assets/a9d3dea7-6175-41b2-91ee-ba27dbebcb5d" controls width="100%"></video>
    </td>
  </tr>
</table>

## Development

Install dependencies:

```bash
pnpm install
```

Start local dev server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

Run lint:

```bash
pnpm lint
```
