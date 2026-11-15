"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import type { InstitutionOption, SubjectOption } from "@/db/resources";

interface Props {
  initialInstitutions: InstitutionOption[];
  initialSubjects: SubjectOption[];
}

export function TaxonomyClient({ initialInstitutions, initialSubjects }: Props) {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>(initialInstitutions);
  const [subjects, setSubjects] = useState<SubjectOption[]>(initialSubjects);
  const [selectedInstId, setSelectedInstId] = useState<string>(initialInstitutions[0]?.id ?? "");

  // Institution Modal
  const [showInstModal, setShowInstModal] = useState(false);
  const [instName, setInstName] = useState("");
  const [editingInst, setEditingInst] = useState<InstitutionOption | null>(null);

  // Subject Modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subDept, setSubDept] = useState("");
  const [subSem, setSubSem] = useState<number | "">("");
  const [editingSub, setEditingSub] = useState<SubjectOption | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeInstitution = institutions.find((i) => i.id === selectedInstId);
  const filteredSubjects = subjects.filter((s) => s.institutionId === selectedInstId);

  async function handleSaveInstitution(e: React.FormEvent) {
    e.preventDefault();
    if (!instName.trim() || busy) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editingInst
        ? `/api/admin/taxonomy/institutions/${editingInst.id}`
        : "/api/admin/taxonomy/institutions";
      const method = editingInst ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: instName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to save institution.");
      }

      const data = await res.json();
      if (editingInst) {
        setInstitutions((prev) =>
          prev.map((i) => (i.id === editingInst.id ? { ...i, name: data.data.name } : i)),
        );
        setSuccess(`Updated institution “${data.data.name}”.`);
      } else {
        const newInst = { ...data.data, subjectCount: 0 };
        setInstitutions((prev) => [...prev, newInst]);
        setSelectedInstId(newInst.id);
        setSuccess(`Created institution “${newInst.name}”.`);
      }

      setShowInstModal(false);
      setEditingInst(null);
      setInstName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving institution.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!subName.trim() || !selectedInstId || busy) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editingSub
        ? `/api/admin/taxonomy/subjects/${editingSub.id}`
        : "/api/admin/taxonomy/subjects";
      const method = editingSub ? "PATCH" : "POST";

      const payload = editingSub
        ? {
            name: subName.trim(),
            code: subCode.trim() || null,
            department: subDept.trim() || null,
            semester: subSem === "" ? null : Number(subSem),
          }
        : {
            institutionId: selectedInstId,
            name: subName.trim(),
            code: subCode.trim() || null,
            department: subDept.trim() || null,
            semester: subSem === "" ? null : Number(subSem),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to save subject.");
      }

      const data = await res.json();
      const updated = data.data;

      if (editingSub) {
        setSubjects((prev) => prev.map((s) => (s.id === editingSub.id ? { ...s, ...updated } : s)));
        setSuccess(`Updated subject “${updated.name}”.`);
      } else {
        setSubjects((prev) => [...prev, updated]);
        setSuccess(`Created subject “${updated.name}”.`);
      }

      setShowSubModal(false);
      setEditingSub(null);
      setSubName("");
      setSubCode("");
      setSubDept("");
      setSubSem("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving subject.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSubject(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete subject “${name}”?`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/taxonomy/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to delete subject.");
      }
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setSuccess(`Deleted subject “${name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting subject.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ paddingBottom: "var(--space-12)" }}>
      <div className="section-head">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1>Academic Taxonomy Administration</h1>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Link href="/admin/moderation" className="btn btn--secondary btn--sm">
            Moderation Queue
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingInst(null);
              setInstName("");
              setShowInstModal(true);
            }}
            className="btn btn--primary btn--sm"
          >
            + Add Institution
          </button>
        </div>
      </div>

      {error ? (
        <Alert tone="warning" title="Taxonomy notice">
          {error}
        </Alert>
      ) : null}

      {success ? (
        <div className="alert alert--info" role="status" style={{ marginBottom: "var(--space-4)" }}>
          <span className="alert__title">Success</span>
          <span>{success}</span>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: "var(--space-6)",
          marginTop: "var(--space-6)",
        }}
      >
        {/* Left: Institution list */}
        <aside
          className="card"
          style={{
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <h2
            style={{
              fontSize: "var(--fs-h3)",
              margin: "0 0 var(--space-2)",
              padding: "0 var(--space-2)",
            }}
          >
            Institutions ({institutions.length})
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              maxHeight: "600px",
              overflowY: "auto",
            }}
          >
            {institutions.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => setSelectedInstId(inst.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-pill)",
                  background: inst.id === selectedInstId ? "var(--c-brand-tint)" : "transparent",
                  color: inst.id === selectedInstId ? "var(--c-brand)" : "var(--c-ink)",
                  fontWeight: inst.id === selectedInstId ? 600 : 400,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--fs-body-sm)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {inst.name}
                </span>
                <span style={{ fontSize: "11px", opacity: 0.7, fontFamily: "var(--font-mono)" }}>
                  {subjects.filter((s) => s.institutionId === inst.id).length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Right: Selected Institution Subjects */}
        <main className="card" style={{ padding: "var(--space-6)" }}>
          {activeInstitution ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "var(--space-6)",
                  borderBottom: "1px solid var(--c-border)",
                  paddingBottom: "var(--space-4)",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{activeInstitution.name}</h2>
                  <p style={{ color: "var(--c-ink-3)", fontSize: "var(--fs-meta)", margin: 0 }}>
                    {filteredSubjects.length} accredited subjects registered
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInst(activeInstitution);
                      setInstName(activeInstitution.name);
                      setShowInstModal(true);
                    }}
                    className="btn btn--secondary btn--sm"
                  >
                    Edit Name
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSub(null);
                      setSubName("");
                      setSubCode("");
                      setSubDept("");
                      setSubSem("");
                      setShowSubModal(true);
                    }}
                    className="btn btn--primary btn--sm"
                  >
                    + Add Subject
                  </button>
                </div>
              </div>

              {filteredSubjects.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-8)",
                    color: "var(--c-ink-3)",
                  }}
                >
                  <p>No subjects added to this institution yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSub(null);
                      setSubName("");
                      setSubCode("");
                      setSubDept("");
                      setSubSem("");
                      setShowSubModal(true);
                    }}
                    className="btn btn--secondary btn--sm"
                    style={{ marginTop: "var(--space-3)" }}
                  >
                    Create the first subject
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {filteredSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      style={{
                        padding: "12px 16px",
                        border: "1px solid var(--c-border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--c-surface-sunken)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
                        >
                          <span style={{ fontWeight: 600 }}>{sub.name}</span>
                          {sub.code ? (
                            <span
                              className="badge badge--role"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              {sub.code}
                            </span>
                          ) : null}
                          {sub.semester ? (
                            <span className="badge badge--role">Sem {sub.semester}</span>
                          ) : null}
                        </div>
                        {sub.department ? (
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: "var(--fs-meta)",
                              color: "var(--c-ink-3)",
                            }}
                          >
                            Department: {sub.department}
                          </p>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSub(sub);
                            setSubName(sub.name);
                            setSubCode(sub.code ?? "");
                            setSubDept(sub.department ?? "");
                            setSubSem(sub.semester ?? "");
                            setShowSubModal(true);
                          }}
                          className="btn btn--ghost btn--sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="btn btn--quiet-danger btn--sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
              Select an institution from the left to view and manage subjects.
            </div>
          )}
        </main>
      </div>

      {/* Institution Modal */}
      {showInstModal ? (
        <dialog open className="dialog" style={{ display: "block" }}>
          <form onSubmit={handleSaveInstitution} className="dialog__body">
            <h2 className="dialog__title">
              {editingInst ? "Edit Institution" : "Add New Institution"}
            </h2>

            <div className="field">
              <label htmlFor="inst-name" className="label">
                Institution Name:
              </label>
              <input
                id="inst-name"
                required
                className="input"
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                placeholder="e.g. Stanford University"
              />
            </div>

            <div className="dialog__actions" style={{ gap: "var(--space-2)" }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowInstModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={busy || !instName.trim()}
              >
                {busy ? "Saving..." : "Save Institution"}
              </button>
            </div>
          </form>
        </dialog>
      ) : null}

      {/* Subject Modal */}
      {showSubModal ? (
        <dialog open className="dialog" style={{ display: "block" }}>
          <form onSubmit={handleSaveSubject} className="dialog__body">
            <h2 className="dialog__title">{editingSub ? "Edit Subject" : "Add Subject"}</h2>

            <div className="field">
              <label htmlFor="sub-name" className="label">
                Subject Name:
              </label>
              <input
                id="sub-name"
                required
                className="input"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Operating Systems"
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="sub-code" className="label">
                  Course Code:
                </label>
                <input
                  id="sub-code"
                  className="input"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  placeholder="e.g. CS-402"
                />
              </div>

              <div className="field">
                <label htmlFor="sub-sem" className="label">
                  Semester (1-12):
                </label>
                <input
                  id="sub-sem"
                  type="number"
                  min={1}
                  max={12}
                  className="input"
                  value={subSem}
                  onChange={(e) => setSubSem(e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 4"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="sub-dept" className="label">
                Department:
              </label>
              <input
                id="sub-dept"
                className="input"
                value={subDept}
                onChange={(e) => setSubDept(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
              />
            </div>

            <div className="dialog__actions" style={{ gap: "var(--space-2)" }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowSubModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={busy || !subName.trim()}
              >
                {busy ? "Saving..." : "Save Subject"}
              </button>
            </div>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}
