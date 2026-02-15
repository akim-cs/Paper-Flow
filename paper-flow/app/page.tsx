import CreateScreen from "../components/CreateScreen";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper-flow-side font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-f3d8d240 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-4">
          <img src="/lineart_boat.png" alt="Paper Flow" className="h-16 w-21 rounded-xl" />
          <h1 className="text-4xl font-bold text-[var(--color-paper-flow-border-dark)]">
            Paper Flow
          </h1>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Upload a paper to create a slide flow. Rearrange nodes by dragging; disconnect edges with{" "}
          <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">
            Delete
          </kbd>
          /{" "}
          <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">
            Backspace
          </kbd>
          .
        </p>
      </header>
      <main className="flex-1 p-6">
        <CreateScreen />
      </main>
    </div>
  );
}
