"use client";

import { useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { buttonClass, Field, Input } from "@/components/ui";
import { startEnrollment, verifyCode, type Enrollment } from "./actions";

export function Enroll() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [pending, startTransition] = useTransition();

  if (!enrollment || "error" in enrollment) {
    return (
      <div className="space-y-4 text-sm">
        <p>
          Your account needs two-step sign-in. You&apos;ll need an authenticator app on your phone, such as Google
          Authenticator or Microsoft Authenticator.
        </p>
        <button
          className={buttonClass()}
          disabled={pending}
          onClick={() => startTransition(async () => setEnrollment(await startEnrollment()))}
        >
          {pending ? "Starting…" : "Set up authenticator app"}
        </button>
        {enrollment && "error" in enrollment && <p className="text-red-700">{enrollment.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <p>Scan this code with your authenticator app, then enter the 6-digit code it shows.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from Supabase */}
      <img src={enrollment.qrCode} alt="QR code for your authenticator app" className="mx-auto h-48 w-48" />
      <p className="text-xs text-stone-500">
        Can&apos;t scan? Enter this key instead: <code className="break-all">{enrollment.secret}</code>
      </p>
      <ActionForm action={verifyCode} submitLabel="Verify">
        <input type="hidden" name="factorId" value={enrollment.factorId} />
        <Field label="Code">
          <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required />
        </Field>
      </ActionForm>
    </div>
  );
}
