import { Linkedin, Instagram, Github, Mail } from "lucide-react"
import { RotatingWord } from "@/components/rotating-word"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="mx-auto">
        <div className="flex items-start gap-6 mb-8">
          <div className="flex-shrink-0">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/profile-pic-avatar-TIEf74HCwuHc5aEJTsdRv98ZM4Po8C.png"
              alt="Sander Blue"
              className="w-24 h-24 rounded-full object-cover border-2 border-border bg-muted"
            />
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground font-mono mb-2">Sander Blue</h1>
            <p className="text-lg font-mono font-medium mb-3 text-muted-foreground">
              <RotatingWord />
              {" Engineer"}
            </p>
            <div className="flex gap-3 justify-start text-muted-foreground">
              <a
                href="https://github.com/sanderblue"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 p-0 flex items-center justify-left hover:text-foreground transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/sanderblue/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 p-0 flex items-center justify-left hover:text-foreground transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/SanderBlue"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 p-0 flex items-center justify-left hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/sanderazul"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 p-0 flex items-center justify-left hover:text-foreground transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="mailto:sblue@sanderblue.com"
                className="h-8 w-8 p-0 flex items-center justify-left hover:text-foreground transition-colors"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <ThemeToggle />
    </main>
  )
}
