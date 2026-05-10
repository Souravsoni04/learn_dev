import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const ForgotPassword = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setRequested(true);
      addToast(data.message || "OTP requested", "success");
    } catch (err) {
      addToast(getErrorMessage(err, "Could not request OTP"), "error");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/reset-password", { email, otp, newPassword });
      addToast(data.message || "Password updated", "success");
    } catch (err) {
      addToast(getErrorMessage(err, "Could not reset password"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="shell page-stack narrow-stack auth-page">
      <h1>Password recovery</h1>
      {!requested ? (
        <form className="panel form-panel" onSubmit={requestOtp}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Requesting..." : "Send OTP"}
          </button>
          <Link to="/login">Back to login</Link>
        </form>
      ) : (
        <form className="panel form-panel" onSubmit={resetPassword}>
          <label>Email</label>
          <input type="email" value={email} disabled />
          <label>OTP</label>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} required />
          <label>New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "Updating..." : "Reset password"}
          </button>
        </form>
      )}
    </section>
  );
};

export default ForgotPassword;
