import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
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

        <h1 className="font-display text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().getFullYear()}</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly, including your email, username, and display name.
              We also collect data about your purchases, game ownership, and activity on the platform
              to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Your Data</h2>
            <p className="text-muted-foreground">
              Your data is used to provide the GameVault service: account management, game ownership
              verification, social features, marketplace transactions, and personalized recommendations.
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Data Storage</h2>
            <p className="text-muted-foreground">
              Your data is stored securely using Supabase infrastructure. Passwords are hashed and
              never stored in plain text. Authentication is handled through Supabase Auth, which
              supports email/password and OAuth providers (Google, GitHub).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies to maintain your authentication session. We do not use
              tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, modify, or delete your personal data. You can update
              your profile in Settings or request data deletion by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Third-Party Services</h2>
            <p className="text-muted-foreground">
              We use third-party services for authentication (Google, GitHub) and data storage (Supabase).
              These services have their own privacy policies. OAuth authentication only accesses
              your basic profile information (name, email, avatar).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
            <p className="text-muted-foreground">
              Privacy questions? Contact us at privacy@gamevault.app
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
