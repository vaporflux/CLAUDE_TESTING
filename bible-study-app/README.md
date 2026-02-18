# Bible Study Assistant

A Reformed Bible study web app powered by OpenAI Agents SDK. Ask questions about any passage or doctrine and receive thorough analysis informed by John MacArthur, R.C. Sproul, and Wes Huff's scholarship, using a full hermeneutical framework.

## Features

- Chat interface optimised for mobile and desktop
- Hermeneutical analysis (historical context, literary genre, symbolic elements)
- Eschatological theme evaluation
- Web search capability for current scholarship
- Multi-turn conversation history

## Local Development

1. **Install dependencies**
   ```bash
   cd bible-study-app
   npm install
   ```

2. **Set your OpenAI API key**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your key:
   # OPENAI_API_KEY=sk-...
   ```

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### One-time setup

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** → import this repository.
3. When prompted for the **Root Directory**, set it to **`bible-study-app`**.
4. Under **Environment Variables**, add:
   - Name: `OPENAI_API_KEY`
   - Value: your OpenAI API key (`sk-...`)
5. Click **Deploy**.

Vercel will give you a URL like `https://bible-study-app-xxxx.vercel.app` — bookmark this on your phone and you can use the app from anywhere.

### Subsequent deploys

Push to the `main` branch and Vercel redeploys automatically.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |

## Tech Stack

- [Next.js 15](https://nextjs.org/) — React framework
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/) — Agent runtime
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Vercel](https://vercel.com/) — Hosting
