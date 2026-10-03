"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { SubjectOption } from "@/db/resources";
import { Alert } from "@/components/ui/alert";
import { MAX_UPLOAD_BYTES, type ResourceType } from "@/lib/validation";

const ACCEPT = ".pdf,.txt,.md,.csv,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.zip";

interface InitialValues {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  resourceType?: ResourceType;
  visibility: "public" | "private";
  fileName: string | null;
}

interface ApiFailure {
  error?: { message?: string; fields?: Record<string, string> };
}

/**
 * The upload and edit form — one component, two modes.
 *
 * One component rather than two, so field order, validation messages, the
 * dropzone and the progress treatment cannot drift apart between "put something
 * new in" and "correct what is already there".
 *
 * Four behaviours worth stating, because each is asserted from outside:
 *
 *  - **Real progress.** `XMLHttpRequest.upload.onprogress` reports bytes the
 *    server has actually accepted, so the bar is determinate. A spinner would
 *    be a claim without evidence.
 *  - **Errors land next to their field.** The API returns `error.fields`, which
 *    is rendered under the control that caused it; anything without a field
 *    becomes a form-level alert.
 *  - **The browser is not the authority.** `required` on the title is a
 *    convenience; the server's Zod schema decides, and this form renders
 *    whatever it answers. A missing file is deliberately *not* blocked here —
 *    the server's own sentence is the better message.
 *  - **Cancel is never disabled.** While a transfer is in flight it aborts the
 *    request; otherwise it steps back. There is always a way out of the form.
 */
export function ResourceForm({
  mode,
  subjects,
  initial,
}: {
  mode: "create" | "edit";
  subjects: SubjectOption[];
  initial?: InitialValues;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(
    initial?.visibility ?? "public",
  );
  const [resourceType, setResourceType] = useState<ResourceType>(initial?.resourceType ?? "other");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  /** The in-flight request, so Cancel can abort it instead of being disabled. */
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (busy) return;

    const body = new FormData();
    body.set("title", title);
    body.set("description", description);
    body.set("subjectId", subjectId);
    body.set("resourceType", resourceType);
    body.set("visibility", visibility);
    if (file) body.set("file", file);

    const url = mode === "create" ? "/api/resources" : `/api/resources/${initial?.id ?? ""}`;
    const xhr = new XMLHttpRequest();

    setBusy(true);
    setProgress(0);
    setFields({});
    setFormError(null);

    xhr.open(mode === "create" ? "POST" : "PATCH", url);
    xhr.withCredentials = true;
    xhrRef.current = xhr;
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      xhrRef.current = null;
      setBusy(false);
      let parsed: (ApiFailure & { resource?: { id: string } }) | null = null;
      try {
        parsed = JSON.parse(xhr.responseText) as ApiFailure & { resource?: { id: string } };
      } catch {
        parsed = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && parsed?.resource) {
        setProgress(100);
        router.push(`/resources/${parsed.resource.id}`);
        router.refresh();
        return;
      }

      if (parsed?.error?.fields) setFields(parsed.error.fields);
      setFormError(
        parsed?.error?.message ??
          "The upload did not go through. Check your connection and try again.",
      );
    });
    xhr.addEventListener("error", () => {
      xhrRef.current = null;
      setBusy(false);
      setFormError("Could not reach the server. Check your connection and try again.");
    });
    xhr.addEventListener("abort", () => {
      xhrRef.current = null;
      setBusy(false);
      setProgress(0);
      setFormError("Upload cancelled. Nothing was stored.");
    });

    xhr.send(body);
  }

  const fileLimitMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert tone="error" title="Nothing was saved" live>
          <p>{formError}</p>
        </Alert>
      ) : null}

      <div className="field">
        <div className="field__row">
          <label className="field__label" htmlFor="title">
            Title
          </label>
          <span className="field__optional">required</span>
        </div>
        <input
          className="input"
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Organic chemistry — week 4 reactions"
          maxLength={160}
          required
          aria-invalid={Boolean(fields.title)}
          aria-describedby={fields.title ? "title-error" : "title-hint"}
        />
        {fields.title ? (
          <span className="err" id="title-error" role="alert">
            {fields.title}
          </span>
        ) : (
          <span className="hint" id="title-hint">
            Say what the file covers, not just the filename — this is what search matches on.
          </span>
        )}
      </div>

      <div className="field">
        <div className="field__row">
          <label className="field__label" htmlFor="description">
            Description
          </label>
          <span className="field__optional">optional</span>
        </div>
        <textarea
          className="textarea"
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is in it, and who is it for? Lecture notes, a past paper, a worked problem set…"
          maxLength={4000}
          aria-invalid={Boolean(fields.description)}
        />
        {fields.description ? (
          <span className="err" role="alert">
            {fields.description}
          </span>
        ) : (
          <span className="hint">
            Search reads the title and this description only. It never looks inside the file.
          </span>
        )}
      </div>

      <div className="form-grid form-grid--2">
        <div className="field">
          <div className="field__row">
            <label className="field__label" htmlFor="subjectId">
              Subject
            </label>
            <span className="field__optional">optional</span>
          </div>
          <select
            className="select"
            id="subjectId"
            name="subjectId"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            aria-invalid={Boolean(fields.subjectId)}
          >
            <option value="">No subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} — {subject.institutionName}
              </option>
            ))}
          </select>
          {fields.subjectId ? (
            <span className="err" role="alert">
              {fields.subjectId}
            </span>
          ) : subjects.length === 0 ? (
            <span className="hint">
              No subjects have been catalogued yet, so this can stay empty. The upload does not need
              one.
            </span>
          ) : (
            <span className="hint">
              Filing it correctly is what makes it findable next semester.
            </span>
          )}
        </div>

        <div className="field">
          <div className="field__row">
            <label className="field__label" htmlFor="resourceType">
              Resource type
            </label>
            <span className="field__optional">required</span>
          </div>
          <select
            className="select"
            id="resourceType"
            name="resourceType"
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value as ResourceType)}
            aria-invalid={Boolean(fields.resourceType)}
          >
            <option value="lecture_notes">Lecture notes</option>
            <option value="study_notes">Study notes</option>
            <option value="past_paper">Past paper</option>
            <option value="summary">Summary</option>
            <option value="lab_material">Lab material</option>
            <option value="assignment">Assignment</option>
            <option value="reference">Reference</option>
            <option value="other">Other / General</option>
          </select>
          {fields.resourceType ? (
            <span className="err" role="alert">
              {fields.resourceType}
            </span>
          ) : (
            <span className="hint">
              Categorises your upload so students can filter for exams, notes or summaries.
            </span>
          )}
        </div>
      </div>

      <fieldset className="fieldset">
        <legend>Visibility</legend>
        <div className="choice-row">
          <label className="choice">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            <span className="choice__text">
              <span className="choice__title">Public</span>
              <span className="choice__note">
                Anyone signed in can find, read and download it in the library.
              </span>
            </span>
          </label>
          <label className="choice">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            <span className="choice__text">
              <span className="choice__title">Private</span>
              <span className="choice__note">
                Only you. It stays on “My uploads” and never appears in search.
              </span>
            </span>
          </label>
        </div>
        {fields.visibility ? (
          <span className="err" role="alert">
            {fields.visibility}
          </span>
        ) : null}
      </fieldset>
      <div className="field">
        <div className="field__row">
          <span className="field__label" id="file-label">
            {mode === "create" ? "File" : "Replace file"}
          </span>
          <span className="field__optional">{mode === "create" ? "required" : "optional"}</span>
        </div>

        <div
          className={`drop${dragging ? " drop--over" : ""}${file ? " drop--filled" : ""}${
            fields.file ? " drop--bad" : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files.item(0);
            if (dropped) setFile(dropped);
          }}
        >
          <input
            className="drop__input"
            id="file"
            name="file"
            type="file"
            accept={ACCEPT}
            aria-labelledby="file-label"
            aria-invalid={Boolean(fields.file)}
            aria-describedby={fields.file ? "file-error" : "file-hint"}
            onChange={(event) => setFile(event.target.files?.item(0) ?? null)}
          />
          <span className="drop__face">
            <span className="drop__title">
              {file ? "File chosen — choose again to change it" : "Choose a file, or drop one here"}
            </span>
            <span className="drop__name">
              {file ? file.name : (initial?.fileName ?? "No file chosen")}
            </span>
            <span className="hint" id="file-hint">
              PDF, DOCX, PPTX, XLSX, PNG, JPG, TXT, MD, CSV or ZIP, up to {fileLimitMb} MB. The
              server checks the real contents, not the extension.
            </span>
          </span>
        </div>

        {fields.file ? (
          <span className="err" id="file-error" role="alert">
            {fields.file}
          </span>
        ) : null}
      </div>

      {busy || progress === 100 ? (
        <div className="stack--tight">
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Upload progress"
          >
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="hint">
            {progress < 100
              ? `Uploading… ${progress}% of the file accepted`
              : "Stored. Opening it…"}
          </span>
        </div>
      ) : null}

      <div className="btn-group">
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Upload resource" : "Save changes"}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--lg"
          onClick={() => {
            if (busy) {
              xhrRef.current?.abort();
              return;
            }
            router.back();
          }}
        >
          {busy ? "Cancel upload" : "Cancel"}
        </button>
      </div>

      <p className="hint">
        {mode === "create"
          ? "By uploading you confirm the file is yours to share, or that you are allowed to pass it on. The acceptable-use policy is the contract."
          : "Changing the visibility takes effect immediately: a private resource disappears from the library for everyone else, and public one appears in it."}
      </p>
    </form>
  );
}
