import CreateScreen from "../components/CreateScreen";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-4">
          <img src="/icon.png" alt="Paper Flow" className="h-16 w-16 rounded-xl" />
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
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
