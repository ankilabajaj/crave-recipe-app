import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus, X } from "lucide-react";
import { api, days } from "../services/api";
export default function PlanPicker({ meal }) {
  const [params] = useSearchParams();
  const dialog = useRef(null);
  const id = useId();
  const [day, setDay] = useState(
      days.includes(params.get("day")) ? params.get("day") : days[0],
    ),
    [plan, setPlan] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => () => dialog.current?.close(), []);
  async function open() {
    setError("");
    setMessage("");
    setLoading(true);
    dialog.current.showModal();
    try {
      setPlan((await api("/planner")).plan);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/planner/${day}`, {
        method: "PUT",
        body: { mealId: meal.id },
      });
      dialog.current.close();
      setMessage(`Saved ${meal.name} to ${day}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button" onClick={open}>
        <CalendarPlus size={19} />
        Add to meal planner
      </button>
      <span className="success-message" role="status">
        {message}
      </span>
      <dialog
        ref={dialog}
        aria-labelledby={id}
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) dialog.current.close();
        }}
      >
        <div className="dialog-header">
          <h2 id={id}>Make room for delicious.</h2>
          <button
            className="icon-button"
            aria-label="Close meal planner"
            disabled={busy}
            onClick={() => dialog.current.close()}
          >
            <X />
          </button>
        </div>
        <p>{meal.name}</p>
        <form onSubmit={save}>
          <label>
            Choose a day
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          {plan.some((p) => p.day === day) && (
            <p className="notice">
              This replaces the recipe already planned for {day}.
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy || loading || !!error}>
            {loading
              ? "Checking your plan…"
              : busy
                ? "Saving…"
                : "Save to this day"}
          </button>
          {error && (
            <button
              type="button"
              className="button outline full"
              onClick={open}
            >
              Retry
            </button>
          )}
        </form>
      </dialog>
    </>
  );
}
