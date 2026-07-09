import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">
            <span className="text-gradient-primary">Game</span>Vault
          </span>
        </Link>

        <h1 className="font-display text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().getFullYear()}</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using GameVault, you accept and agree to be bound by these Terms of Service.
              If you do not agree, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Digital Ownership</h2>
            <p className="text-muted-foreground">
              GameVault provides verified digital ownership of games purchased through our platform.
              Each purchase is recorded with a unique asset ID. Resale of digital assets is permitted
              for games marked as resellable, subject to the royalty system which compensates original
              creators on secondary sales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the security of your account and password.
              GameVault cannot be liable for any loss or damage from your failure to comply
              with this security obligation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Acceptable Use</h2>
            <p className="text-muted-foreground">
              You agree not to use the service for any unlawful purpose, to harass or harm others,
              to submit false or misleading content, or to attempt to circumvent the platform&apos;s
              ownership verification or royalty systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Fees</h2>
            <p className="text-muted-foreground">
              GameVault charges a 10% platform fee on primary sales. Resale transactions include
              a creator royalty percentage set by the game developer. These fees are clearly
              displayed before any purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Termination</h2>
            <p className="text-muted-foreground">
              GameVault reserves the right to terminate or suspend access to accounts that violate
              these terms. Upon termination, your right to use the service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these Terms? Contact us at support@gamevault.app
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40">
          <Link href="/signup" className="text-primary hover:underline">
            Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
