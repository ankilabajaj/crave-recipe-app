import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useSession } from "../context/Session";
import { FoodImage } from "../components/Shared";
export default function Auth() {
  const [params, setParams] = useSearchParams();
  const signup = params.get("mode") === "signup";
  const { authenticate } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (signup && values.password !== values.confirmPassword) {
      setError("Your passwords don’t match. Please try again.");
      return;
    }
    if (new TextEncoder().encode(values.password).length > 72) {
      setError("Password must be at most 72 bytes.");
      return;
    }
    setBusy(true);
    try {
      await authenticate(signup ? "register" : "login", values);
      navigate("/app", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page wrap">
      <div className="auth-story">
        <FoodImage
          src="https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg"
          alt="Freshly prepared food to share and enjoy"
          width="650"
          height="800"
        />
        <div>
          <p className="eyebrow">A seat at our table</p>
          <h1>
            Good food.
            <br />
            Better days.
          </h1>
          <p>Your next favorite recipe is closer than you think.</p>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">Welcome to your kitchen</p>
        <h2>{signup ? "A fresh start." : "Hello again."}</h2>
        <p>
          {signup
            ? "Let’s make something delicious together."
            : "Your favorites are right where you left them."}
        </p>
        <div className="auth-tabs">
          <button
            aria-pressed={!signup}
            onClick={() => {
              setParams({ mode: "login" });
              setError("");
            }}
          >
            Log in
          </button>
          <button
            aria-pressed={signup}
            onClick={() => {
              setParams({ mode: "signup" });
              setError("");
            }}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={submit} key={signup ? "signup" : "login"}>
          {signup && (
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <span className="password-input">
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={signup ? 8 : undefined}
                maxLength={72}
                aria-describedby={signup ? "password-help" : undefined}
                placeholder={signup ? "At least 8 characters" : "Your password"}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {signup && (
            <>
              <small id="password-help">
                At least 8 characters; at most 72 bytes. No special characters
                required.
              </small>
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder="One more time"
                />
              </label>
            </>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy
              ? "One moment…"
              : signup
                ? "Create your account"
                : "Back to cooking"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="quiet">
          Your recipes, your plans, your little corner of the kitchen.
        </p>
      </div>
    </section>
  );
}
