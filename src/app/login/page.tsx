import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { AuthShell } from "@/app/auth/auth-shell";
import { sendPasswordReset, signIn } from "./actions";

const notices: Record<string, string> = {
  inactive: "Your account is not active. Please contact the nursery office.",
  link: "That link has expired or was already used. Ask for a new one below.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, reset } = await searchParams;
  const notice = typeof error === "string" ? notices[error] : undefined;

  return (
    <AuthShell title="Sign in">
      {notice && <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}
      {reset === undefined ? (
        <>
          <ActionForm action={signIn} submitLabel="Sign in">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
          </ActionForm>
          <a href="/login?reset" className="mt-4 block text-sm text-teal-700 hover:underline">
            Forgotten your password?
          </a>
        </>
      ) : (
        <>
          <ActionForm action={sendPasswordReset} submitLabel="Email me a reset link">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
          </ActionForm>
          <a href="/login" className="mt-4 block text-sm text-teal-700 hover:underline">
            Back to sign in
          </a>
        </>
      )}
    </AuthShell>
  );
}
