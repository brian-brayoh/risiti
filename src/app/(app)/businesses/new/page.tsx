import { createBusinessAction } from "@/app/actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Add business" };

export default function NewBusinessPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add a business" subtitle="Connect a paybill or till. You can change everything later in Settings." />
      <ActionForm action={createBusinessAction} className="card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" name="name" required placeholder="Mama Njeri Hardware" />
          <Field label="KRA PIN" name="kraPin" required placeholder="P051234567X" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">M-Pesa type</span>
            <select name="shortcodeType" className="input" defaultValue="PAYBILL">
              <option value="PAYBILL">Paybill</option>
              <option value="TILL">Till (Buy Goods)</option>
            </select>
          </label>
          <Field label="Paybill / Till number" name="shortcode" required inputMode="numeric" placeholder="600984" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What you sell (invoice line)" name="itemDescription" required defaultValue="Goods and services" />
          <Field label="Invoice prefix" name="invoicePrefix" required defaultValue="INV" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone (optional)" name="phone" />
          <Field label="Email (optional)" name="email" type="email" />
        </div>
        <Field label="Address (optional)" name="address" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="vatRegistered" defaultChecked className="h-4 w-4 accent-brand-600" />
            Registered for VAT (16%)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">I am the</span>
            <select name="role" className="input w-auto py-1">
              <option value="OWNER">owner</option>
              <option value="ACCOUNTANT">accountant</option>
            </select>
          </label>
        </div>
        <SubmitButton pendingText="Creating…">Create business</SubmitButton>
      </ActionForm>
    </div>
  );
}
