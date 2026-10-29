'use client'
export const dynamic = 'force-dynamic'

export default function StudentHelpPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Help &amp; Guidelines</h1>
        <p className="mt-1 text-sm text-[#6f5c4b]">How phone handover works in Phosub.</p>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-[#d8d2c9] bg-[#F2F1ED] p-6">
          <h2 className="mb-3 text-lg font-bold">How phone handover works</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[#161616]">
            <li>A mentor starts a phone handover session for your squad.</li>
            <li>While the session is active, you record your phone status: Submitted, Not Submitted, or Retrieved.</li>
            <li>Submitted requires your phone model. Not Submitted and Retrieved require a reason.</li>
            <li>Your mentor can end the session when handover is complete.</li>
          </ol>
        </section>

        <section className="rounded-xl border border-[#d8d2c9] bg-[#F2F1ED] p-6">
          <h2 className="mb-3 text-lg font-bold">Status meanings</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-[#4b3a2d]">Submitted</dt>
              <dd className="text-[#6f5c4b]">You handed your phone in during the active session. A phone model is required.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#710014]">Not Submitted</dt>
              <dd className="text-[#6f5c4b]">You did not submit your phone. A reason is required.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#710014]">Retrieved</dt>
              <dd className="text-[#6f5c4b]">You retrieved your phone. A reason is required.</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-[#d8d2c9] bg-[#F2F1ED] p-6">
          <h2 className="mb-3 text-lg font-bold">When you can update your status</h2>
          <p className="text-sm text-[#161616]">
            Status updates are only available while your squad has an active session. The action buttons are disabled when no active
            session exists, and the server also checks your authentication, role, squad, and active session before saving.
          </p>
        </section>

        <section className="rounded-xl border border-[#d8d2c9] bg-[#F2F1ED] p-6">
          <h2 className="mb-3 text-lg font-bold">After a mentor ends a session</h2>
          <p className="text-sm text-[#161616]">
            Once a session is ended, you can no longer change your status for that session. Your submitted records remain available in
            My History for review.
          </p>
        </section>

        <section className="rounded-xl border border-[#d8d2c9] bg-[#F2F1ED] p-6">
          <h2 className="mb-3 text-lg font-bold">Incorrect information</h2>
          <p className="text-sm text-[#161616]">
            If your profile or handover information is incorrect, contact your mentor to request a correction. Profile identity, role,
            squad, and email cannot be changed from this app.
          </p>
        </section>
      </div>
    </>
  )
}
