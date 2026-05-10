import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/errors.js";
import { SUPPORT_ENABLED } from "../config/features.js";

const Settings = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
  const [notifications, setNotificationSettings] = useState({
    emailAlerts: user?.notificationSettings?.emailAlerts ?? true,
    courseUpdates: user?.notificationSettings?.courseUpdates ?? true,
    newFeatures: user?.notificationSettings?.newFeatures ?? false,
  });
  
  const [editingProfile, setEditingProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, email: user.email });
      if (user.notificationSettings) {
        setNotificationSettings({
          emailAlerts: user.notificationSettings.emailAlerts,
          courseUpdates: user.notificationSettings.courseUpdates,
          newFeatures: user.notificationSettings.newFeatures,
        });
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchTickets = async () => {
      if (activeTab === "notifications" && user) {
        if (!SUPPORT_ENABLED) {
          setTickets([]);
          return;
        }
        setLoadingTickets(true);
        try {
          const { data } = await api.get("/support/my-tickets");
          setTickets(data || []);
          
          // Mark as seen
          if (data.some(t => !t.userHasSeen)) {
            await api.put("/support/mark-as-seen");
          }
        } catch (err) {
          console.error("Failed to fetch tickets", err);
        } finally {
          setLoadingTickets(false);
        }
      }
    };
    fetchTickets();
  }, [activeTab, user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/auth/profile", profileForm);
      addToast("Profile updated successfully. Refresh to see changes.", "success");
      setEditingProfile(false);
    } catch (err) {
      addToast(getErrorMessage(err, "Profile update failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/change-password", passwordForm);
      addToast(data.message || "Password updated", "success");
      setPasswordForm({ oldPassword: "", newPassword: "" });
    } catch (err) {
      addToast(getErrorMessage(err, "Password update failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleNotification = async (key) => {
    const newVal = !notifications[key];
    setNotificationSettings(prev => ({
      ...prev,
      [key]: newVal
    }));
    
    try {
      await api.put("/auth/notifications", { [key]: newVal });
      addToast("Preferences updated", "success");
    } catch (err) {
      addToast("Failed to sync preferences", "error");
      // Rollback on failure
      setNotificationSettings(prev => ({
        ...prev,
        [key]: !newVal
      }));
    }
  };

  return (
    <section className="shell max-w-5xl py-12 animate-fade-in">
      <div className="mb-10">
        <p className="kicker text-aqua mb-2">Account Management</p>
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-ink-soft mt-2">Manage your profile, security, and learning preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Tabs */}
        <aside className="lg:w-64 shrink-0">
          <nav className="flex lg:flex-col gap-2 p-1 bg-paper rounded-2xl border border-line overflow-x-auto">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "profile" ? "bg-white text-ink shadow-sm border border-line/50" : "text-ink-soft hover:bg-white/50"
              }`}
            >
              <span>👤</span> Personal Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "security" ? "bg-white text-ink shadow-sm border border-line/50" : "text-ink-soft hover:bg-white/50"
              }`}
            >
              <span>🔒</span> Security
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "notifications" ? "bg-white text-ink shadow-sm border border-line/50" : "text-ink-soft hover:bg-white/50"
              }`}
            >
              <span>🔔</span> Notifications
            </button>
          </nav>

          <div className="mt-8 p-6 bg-paper rounded-2xl border border-line border-dashed">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Help</p>
            <p className="text-xs text-ink-soft leading-relaxed">
              Need to delete your account or have privacy questions? 
              <br/><br/>
              Support is temporarily unavailable while we update the help experience.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          {activeTab === "profile" && (
            <article className="panel p-8 animate-fade-in">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Public Profile</h2>
                  <p className="text-sm text-ink-soft">How other members see you on the platform.</p>
                </div>
                {!editingProfile && (
                  <button className="btn btn-outline py-2" onClick={() => setEditingProfile(true)}>
                    Edit Profile
                  </button>
                )}
              </div>
              
              <form onSubmit={handleProfileUpdate}>
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                      disabled={!editingProfile}
                      className={`w-full p-4 rounded-xl border transition-all outline-none ${
                        editingProfile ? "bg-white border-line focus:border-aqua shadow-sm" : "bg-paper border-transparent text-ink font-medium"
                      }`}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                      disabled={!editingProfile}
                      className={`w-full p-4 rounded-xl border transition-all outline-none ${
                        editingProfile ? "bg-white border-line focus:border-aqua shadow-sm" : "bg-paper border-transparent text-ink font-medium"
                      }`}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                
                {editingProfile && (
                  <div className="flex items-center gap-4 mt-10 pt-8 border-t border-line">
                    <button type="submit" className="btn px-8" disabled={busy}>
                      {busy ? "Saving..." : "Save Changes"}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileForm({ name: user.name, email: user.email });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </article>
          )}

          {activeTab === "security" && (
            <article className="panel p-8 animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-1">Security & Access</h2>
                <p className="text-sm text-ink-soft">Protect your account with a strong password.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="max-w-md">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      required
                      className="w-full p-4 bg-paper border border-line rounded-xl focus:border-aqua outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-ink-soft">New Password</label>
                    <input
                      type="password"
                      placeholder="Min. 8 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      className="w-full p-4 bg-paper border border-line rounded-xl focus:border-aqua outline-none transition-all"
                    />
                    <p className="text-[10px] text-ink-soft mt-1">Make sure it's unique and at least 8 characters long.</p>
                  </div>
                </div>
                <div className="mt-10 pt-8 border-t border-line">
                  <button type="submit" className="btn px-8" disabled={busy}>
                    {busy ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </article>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-12 animate-slide-up">
              <article className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-line/50 relative overflow-hidden group">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-aqua/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-aqua/10 transition-colors duration-700" />
                
                <div className="mb-10 relative z-10">
                  <h2 className="text-3xl font-bold mb-2 tracking-tight">Communication Preferences</h2>
                  <p className="text-base text-ink-soft">Control how and when you receive updates from Learn Dev.</p>
                </div>

                <div className="grid gap-6 relative z-10">
                  {[
                    { id: 'emailAlerts', title: 'Email Notifications', desc: 'Critical updates about your account and course progress.', icon: '📧', delay: '0ms' },
                    { id: 'courseUpdates', title: 'Course Activity', desc: 'Get notified when new lessons or materials are added to your courses.', icon: '📚', delay: '100ms' },
                    { id: 'newFeatures', title: 'Platform Updates', desc: 'News about new features, tools, and community events.', icon: '✨', delay: '200ms' }
                  ].map((item) => (
                    <div 
                      key={item.id} 
                      style={{ animationDelay: item.delay }}
                      className="flex items-center justify-between p-6 bg-paper rounded-[2rem] border border-line/30 hover:border-aqua/30 hover:bg-white hover:shadow-xl hover:shadow-aqua/5 transition-all duration-500 group/item animate-scale-in"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm group-hover/item:scale-110 group-hover/item:rotate-3 transition-transform duration-500">
                          {item.icon}
                        </div>
                        <div>
                          <strong className="block text-lg text-ink font-bold mb-0.5">{item.title}</strong>
                          <p className="text-sm text-ink-soft max-w-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleNotification(item.id)}
                        className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-all duration-300 ease-in-out focus:outline-none ring-offset-2 focus:ring-2 focus:ring-aqua/20 ${
                          notifications[item.id] ? "bg-aqua shadow-lg shadow-aqua/20" : "bg-line"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xl ring-0 transition duration-300 ease-in-out ${
                          notifications[item.id] ? "translate-x-8" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </article>

              {SUPPORT_ENABLED && (
              <article className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-line/50 animate-slide-up [animation-delay:300ms]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 tracking-tight">Activity Feed</h2>
                    <p className="text-sm text-ink-soft">Recent updates and messages from the team.</p>
                  </div>
                  {tickets.length > 0 && (
                    <button 
                      onClick={async () => {
                        try {
                          await api.put("/support/mark-as-seen");
                          setTickets(prev => prev.map(t => ({ ...t, userHasSeen: true })));
                          addToast("All marked as read", "info");
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-aqua hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {loadingTickets ? (
                  <div className="py-20 flex flex-col items-center justify-center text-ink-soft">
                    <div className="w-10 h-10 border-4 border-aqua/20 border-t-aqua rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Checking for updates...</p>
                  </div>
                ) : tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.map((ticket, idx) => {
                      const hasUnread = !ticket.userHasSeen;
                      const lastReply = ticket.replies?.[ticket.replies.length - 1];
                      
                      return (
                        <div 
                          key={ticket._id} 
                          style={{ animationDelay: `${idx * 50}ms` }}
                          className={`group flex items-start gap-5 p-6 rounded-3xl transition-all duration-300 animate-scale-in border ${
                            hasUnread 
                              ? "bg-mint/30 border-aqua/20 shadow-lg shadow-aqua/5" 
                              : "bg-paper border-line/30 hover:bg-white hover:border-line/60"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                              hasUnread ? "bg-aqua text-white" : "bg-white text-ink-soft"
                            }`}>
                              {ticket.category === "Technical" ? "🛠️" : 
                               ticket.category === "Billing" ? "💳" : 
                               ticket.category === "Course Content" ? "📚" : "💬"}
                            </div>
                            {hasUnread && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-aqua border-2 border-white rounded-full animate-pulse" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <h4 className={`text-base font-bold truncate ${hasUnread ? "text-ink" : "text-ink-soft"}`}>
                                {ticket.subject}
                              </h4>
                              <span className="text-[10px] font-bold text-ink-soft/40 whitespace-nowrap">
                                {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <p className={`text-sm line-clamp-2 leading-relaxed ${hasUnread ? "text-ink font-medium" : "text-ink-soft"}`}>
                              {lastReply ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="text-aqua font-black">Staff:</span> {lastReply.message}
                                </span>
                              ) : ticket.message}
                            </p>

                            <div className="mt-4 flex items-center gap-4">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                ticket.status === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-sun/10 text-sun"
                              }`}>
                                {ticket.status}
                              </span>
                              <button className="text-[9px] font-black uppercase tracking-widest text-ink-soft hover:text-aqua transition-colors">
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-paper rounded-[3rem] border border-dashed border-line group">
                    <div className="text-5xl mb-6 grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">📭</div>
                    <h3 className="text-lg text-ink font-bold mb-1">Your inbox is clear</h3>
                    <p className="text-xs text-ink-soft">No new notifications or messages at this time.</p>
                  </div>
                )}
              </article>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
};

export default Settings;
