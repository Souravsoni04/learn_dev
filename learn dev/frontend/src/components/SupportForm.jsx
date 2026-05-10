import { useState } from "react";
import api from "../api/axios.js";
import { getErrorMessage } from "../utils/errors.js";

const SupportForm = () => {
  const [formData, setFormData] = useState({
    subject: "",
    category: "General",
    priority: "Medium",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/support", formData);
      setSuccess(true);
      setFormData({ subject: "", category: "General", priority: "Medium", message: "" });
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to submit support ticket"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 text-center animate-scale-in bg-aqua/10 rounded-3xl border border-aqua/20 shadow-2xl shadow-aqua/10">
        <div className="w-16 h-16 bg-aqua text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-aqua/40 animate-float">
          ✓
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
        <p className="text-aqua/70 text-sm leading-relaxed">Our mentors will get back to you shortly. Track this in your notifications.</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700 text-4xl pointer-events-none">✨</div>
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-aqua mb-1">New Inquiry</h4>
          <p className="text-[10px] text-ink-soft font-bold uppercase tracking-widest">Secure Channel</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-widest rounded-xl mb-8 border border-danger/20 flex items-center gap-3">
          <span>⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-soft ml-1">Subject</label>
            <input
              type="text"
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-aqua/50 focus:bg-white/10 transition-all shadow-inner"
              placeholder="What's on your mind?"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-soft ml-1">Category</label>
              <div className="relative">
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/60 appearance-none cursor-pointer focus:outline-none focus:border-aqua/50 focus:bg-white/10 transition-all shadow-inner"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="General" className="bg-ink">General</option>
                  <option value="Technical" className="bg-ink">Technical</option>
                  <option value="Billing" className="bg-ink">Billing</option>
                  <option value="Course Content" className="bg-ink">Content</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 text-[10px]">▼</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-soft ml-1">Priority</label>
              <div className="relative">
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/60 appearance-none cursor-pointer focus:outline-none focus:border-aqua/50 focus:bg-white/10 transition-all shadow-inner"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="Low" className="bg-ink">Low</option>
                  <option value="Medium" className="bg-ink">Medium</option>
                  <option value="High" className="bg-ink">High</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 text-[10px]">▼</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-soft ml-1">Message Detail</label>
          <textarea
            required
            rows="5"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-aqua/50 focus:bg-white/10 transition-all resize-none shadow-inner"
            placeholder="Describe your issue or question..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group w-full py-5 rounded-2xl bg-aqua text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-aqua/20 hover:bg-aqua-deep hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:translate-y-0"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Transmitting...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <span>Initialize Dispatch</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
};

export default SupportForm;
