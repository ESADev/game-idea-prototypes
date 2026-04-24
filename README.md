# Build-Your-Ship Invaders (Prototype)

A fast proof-of-concept arcade prototype built with Next.js for Vercel.

## Core idea
- Space Invaders style waves descend from the top.
- Destroying aliens drops matching weapon parts.
- Catch drops to auto-attach parts to your ship's sides/top.
- Attached parts auto-fire and also act as breakable armor.
- If the core base unit is hit, the run ends and you restart from scratch.

## Controls
- **Move**: `A/D` or `Left/Right`
- **Fire core weapon**: hold `Space`
- **Start / Restart run**: `Enter`

## Development
```bash
npm install
npm run dev
```

## Validation
```bash
npm run lint
npm run build
```
