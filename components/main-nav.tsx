import Link from "next/link"

export function MainNav() {
  return (
    <div className="mr-4 flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="hidden font-bold sm:inline-block">
          API Testing Platform
        </span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="https://github.com/yourusername/api-testing-platform"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-foreground/80 text-foreground/60"
        >
          GitHub
        </Link>
        <Link
          href="/docs"
          className="transition-colors hover:text-foreground/80 text-foreground/60"
        >
          Documentation
        </Link>
      </nav>
    </div>
  )
} 