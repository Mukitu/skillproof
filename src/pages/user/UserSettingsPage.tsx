import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateMyProfile } from '../../services/auth';

export const UserSettingsPage = () => {
  const { user, refresh } = useAuth();
  const [language, setLanguage] = useState(user?.language || 'bn');
  const [notifications, setNotifications] = useState(user?.notification_settings || { email: true, job_alerts: true, verification_updates: true });
  const [privacy, setPrivacy] = useState(user?.privacy_settings || { public_profile: true, show_phone: true });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setLanguage(user.language || 'bn');
      setNotifications(user.notification_settings || { email: true, job_alerts: true, verification_updates: true });
      setPrivacy(user.privacy_settings || { public_profile: true, show_phone: true });
    }
  }, [user]);

  const save = async () => {
    await updateMyProfile({ language: language as any, notification_settings: notifications, privacy_settings: privacy });
    await refresh();
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      {saved && <div className="rounded bg-green-50 p-3 text-sm text-green-700">Settings saved.</div>}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 font-semibold">Language</h2>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded border px-3 py-2"><option value="bn">বাংলা</option><option value="en">English</option></select>
      </div>
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 font-semibold">Notifications</h2>
        <div className="space-y-2">
          {Object.entries({ email: 'Email', job_alerts: 'Job alerts', verification_updates: 'Verification updates' }).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={!!(notifications as any)[k]} onChange={(e) => setNotifications({ ...notifications, [k]: e.target.checked })} />{label}</label>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 font-semibold">Privacy</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!privacy.public_profile} onChange={(e) => setPrivacy({ ...privacy, public_profile: e.target.checked })} />Make my profile public</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!privacy.show_phone} onChange={(e) => setPrivacy({ ...privacy, show_phone: e.target.checked })} />Show phone on profile</label>
        </div>
      </div>
      <button onClick={save} className="rounded bg-blue-600 px-6 py-2 text-white">Save Settings</button>
    </div>
  );
};

export default UserSettingsPage;
