import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import type { FormEvent } from 'react'
import { useState } from 'react'

const getServerSnapshot = createServerFn({ method: 'GET' }).handler(async () => {
  const now = new Date()

  return {
    environment: 'Cloudflare Workers target',
    isoTime: now.toISOString(),
    message: 'This data was rendered through a TanStack Start server function.',
  }
})

const createGreeting = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => ({
    name: data.name.trim().slice(0, 40),
  }))
  .handler(async ({ data }) => {
    const name = data.name || 'friend'

    return {
      greeting: `Hello, ${name}. This response came from the server.`,
      generatedAt: new Date().toISOString(),
    }
  })

export const Route = createFileRoute('/')({
  loader: () => getServerSnapshot(),
  component: Home,
})

function Home() {
  const snapshot = Route.useLoaderData()
  const greet = useServerFn(createGreeting)
  const [name, setName] = useState('Cloudflare')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [result, setResult] = useState<Awaited<ReturnType<typeof createGreeting>>>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')

    try {
      const nextResult = await greet({ data: { name } })
      setResult(nextResult)
      setStatus('idle')
    } catch (error) {
      console.error('Greeting server function failed', { name, error })
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-300">
            TanStack Start + Cloudflare Workers
          </p>
          <h1 className="mt-4 text-4xl font-bold text-white">
            Minimal full-stack demo
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            A route loader calls a server function during rendering, and the
            form below calls a POST server function from the browser.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold text-white">Server snapshot</h2>
            <dl className="mt-4 space-y-3 text-sm text-zinc-300">
              <div>
                <dt className="text-zinc-500">Runtime target</dt>
                <dd>{snapshot.environment}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Server time</dt>
                <dd>{snapshot.isoTime}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Message</dt>
                <dd>{snapshot.message}</dd>
              </div>
            </dl>
          </div>

          <form
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
            onSubmit={handleSubmit}
          >
            <label className="block text-lg font-semibold text-white">
              Server greeting
            </label>
            <div className="mt-4 flex gap-3">
              <input
                className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-emerald-400 transition focus:ring-2"
                name="name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
              <button
                className="rounded-md bg-emerald-400 px-4 py-2 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status === 'loading'}
                type="submit"
              >
                {status === 'loading' ? 'Sending' : 'Send'}
              </button>
            </div>

            {status === 'error' ? (
              <p className="mt-4 text-sm text-red-300">
                The server call failed. Check the browser console and Worker
                logs for details.
              </p>
            ) : null}

            {result ? (
              <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950 p-4 text-sm text-emerald-100">
                <p>{result.greeting}</p>
                <p className="mt-2 text-emerald-300">
                  Generated at {result.generatedAt}
                </p>
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  )
}
