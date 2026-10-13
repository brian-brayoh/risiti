"use client";

import { switchBusinessAction } from "@/app/actions";

export function BusinessSwitcher({ businesses, activeId }: {
  businesses: { id: string; name: string; role: string }[]; activeId: string;
}) {
  return (
    <form action={switchBusinessAction}>
      <label className="label" htmlFor="biz">Business</label>
      <select
        id="biz"
        name="businessId"
        defaultValue={activeId}
        className="input"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>{b.name}{b.role === "ACCOUNTANT" ? " (client)" : ""}</option>
        ))}
      </select>
    </form>
  );
}
