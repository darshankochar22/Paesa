import { useCallback, useState } from "react";

// Replaces the `setField = key => e => setForm(f => ({...f,[key]:e.target.value}))`
// boilerplate repeated across ~50 master Create/Alter forms.
//
//   const { form, set, setField, reset } = useFormField(initial);
//   <Input value={form.name} onChange={setField("name")} />
//   <Select value={form.nature} onChange={setField("nature")} />
//   set("rate", 12);                       // imperative update
//   set({ name: "x", nature: "Assets" });  // patch multiple

export function useFormField<T extends Record<string, any>>(initial: T) {
  const [form, setForm] = useState<T>(initial);

  /** Imperative: set one key, or merge a partial patch. */
  const set = useCallback(
    (keyOrPatch: keyof T | Partial<T>, value?: any) => {
      setForm((f) =>
        typeof keyOrPatch === "object"
          ? { ...f, ...keyOrPatch }
          : { ...f, [keyOrPatch]: value }
      );
    },
    []
  );

  /** Change-handler factory for inputs/selects/textareas. */
  const setField = useCallback(
    (key: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    []
  );

  const reset = useCallback((next?: T) => setForm(next ?? initial), [initial]);

  return { form, setForm, set, setField, reset };
}

export default useFormField;
