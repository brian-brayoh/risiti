import { addMemberAction, registerUrlsAction, updateBusinessAction } from "@/app/actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { callbackUrls } from "@/lib/mpesa";
import { canManage, requireBusiness } from "@/lib/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { business: b, membership } = await requireBusiness();
  const manager = canManage(membership.role);
  const urls = callbackUrls(b.webhookToken);
  const members = await db.membership.findMany({ where: { businessId: b.id }, include: { user: true }, orderBy: { createdAt: "asc" } });

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Settings" subtitle={b.name} />

      <section className="card p-6">
        <h2 className="font-semibold">1. Connect M-Pesa</h2>
        <p className="mt-1 text-sm text-slate-500">
          Safaricom sends each payment to these URLs. Register them once per paybill/till (needs Daraja credentials in your environment),
          or give them to Safaricom if they register URLs for you.
        </p>
        <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 font-mono text-xs break-all">
          <div><span className="text-slate-500">Confirmation:</span> {urls.confirmation}</div>
          <div><span className="text-slate-500">Validation:</span> {urls.validation}</div>
        </div>
        {manager && (
          <ActionForm action={registerUrlsAction} className="mt-4">
            <SubmitButton className="btn-secondary" pendingText="Registering…">Register URLs with Safaricom</SubmitButton>
          </ActionForm>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">2. Business &amp; eTIMS</h2>
        <ActionForm action={updateBusinessAction} className="mt-4 space-y-4">
          <fieldset disabled={!manager} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" name="name" required defaultValue={b.name} />
              <Field label="KRA PIN" name="kraPin" required defaultValue={b.kraPin} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">M-Pesa type</span>
                <select name="shortcodeType" className="input" defaultValue={b.shortcodeType}>
                  <option value="PAYBILL">Paybill</option><option value="TILL">Till (Buy Goods)</option>
                </select>
              </label>
              <Field label="Paybill / Till" name="shortcode" required defaultValue={b.shortcode} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Invoice line" name="itemDescription" required defaultValue={b.itemDescription} />
              <Field label="Invoice prefix" name="invoicePrefix" required defaultValue={b.invoicePrefix} hint={`Next: ${b.invoicePrefix}-${String(b.nextInvoiceNumber).padStart(6, "0")}`} />
              <Field label="VAT rate %" name="vatRatePercent" type="number" step="0.01" defaultValue={b.vatRateBps / 100} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone" name="phone" defaultValue={b.phone ?? ""} />
              <Field label="Email" name="email" defaultValue={b.email ?? ""} />
              <Field label="Address" name="address" defaultValue={b.address ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block"><span className="label">eTIMS mode</span>
                <select name="etimsMode" className="input" defaultValue={b.etimsMode}>
                  <option value="MOCK">Simulated (testing)</option>
                  <option value="OSCU">KRA OSCU (live)</option>
                </select>
              </label>
              <Field label="eTIMS branch ID" name="etimsBranchId" defaultValue={b.etimsBranchId} />
              <Field label="eTIMS device serial" name="etimsDeviceSerial" defaultValue={b.etimsDeviceSerial ?? ""} />
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="vatRegistered" defaultChecked={b.vatRegistered} className="h-4 w-4 accent-brand-600" /> VAT registered</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="smsEnabled" defaultChecked={b.smsEnabled} className="h-4 w-4 accent-brand-600" /> SMS invoice to payer</label>
            </div>
          </fieldset>
          {manager && <SubmitButton pendingText="Saving…">Save settings</SubmitButton>}
        </ActionForm>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">3. Team &amp; accountant</h2>
        <p className="mt-1 text-sm text-slate-500">Accountants can manage all their client businesses from one login.</p>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between py-2">
              <span>{m.user.name} <span className="text-slate-500">· {m.user.email}</span></span>
              <span className="badge bg-slate-100 text-slate-600">{m.role.toLowerCase()}</span>
            </li>
          ))}
        </ul>
        {manager && (
          <ActionForm action={addMemberAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" resetOnSuccess>
            <div className="flex-1"><Field label="Their Risiti email" name="email" type="email" required /></div>
            <label className="block"><span className="label">Role</span>
              <select name="role" className="input"><option value="ACCOUNTANT">Accountant</option><option value="STAFF">Staff (view only)</option><option value="OWNER">Owner</option></select>
            </label>
            <SubmitButton className="btn-secondary">Add</SubmitButton>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
