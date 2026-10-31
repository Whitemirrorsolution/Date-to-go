import React, { useState } from 'react';
import { AppHeader } from '../components/AppHeader.js';
import { Camera, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const MyDetailsPage: React.FC = () => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [bio, setBio] = useState('Love exploring new cafes and watching movies.');

  const toggleEdit = () => setIsEditMode(!isEditMode);

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader 
        title="My Details" 
        rightAction={
          isEditMode ? (
            <div className="flex gap-2">
              <button onClick={toggleEdit} className="text-muted text-sm font-bold">Cancel</button>
              <button onClick={toggleEdit} className="text-primary font-bold text-sm bg-primary/10 px-3 py-1 rounded-pill">Save</button>
            </div>
          ) : (
            <button onClick={toggleEdit} className="text-primary font-bold text-sm bg-primary/10 px-4 py-1.5 rounded-pill">
              Edit
            </button>
          )
        }
      />

      <main className="px-5 pt-6 flex flex-col gap-6">
        
        {/* Photo Card */}
        <section className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-[120px] h-[120px] rounded-full p-1 border-[3px] border-primary/20">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-4xl">
                {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            </div>
            {isEditMode && (
              <button className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full shadow-md">
                <Camera size={18} />
              </button>
            )}
          </div>
          {isEditMode && <p className="text-sm text-primary font-medium">Tap to change photo</p>}
        </section>

        {/* Contact Info */}
        <section className="card flex flex-col gap-4">
          <div className="flex justify-between items-center pb-4 border-b border-borderLight">
            <div>
              <p className="text-xs text-muted mb-1 uppercase font-bold tracking-wider">Phone Number</p>
              <p className="font-semibold text-textMain">{user?.phone || '+91 98765 43210'}</p>
            </div>
            <button className="pill-outline !py-1.5 !px-4 !text-xs">Change</button>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted mb-1 uppercase font-bold tracking-wider flex items-center gap-1.5">
                Email Address
                <span className="bg-success-bg text-success-text px-1.5 py-0.5 rounded text-[9px]">Verified</span>
              </p>
              <p className="font-semibold text-textMain">{user?.email || 'user@example.com'}</p>
            </div>
            <button className="pill-outline !py-1.5 !px-4 !text-xs">Change</button>
          </div>
        </section>

        {/* Personal Information */}
        <section className="card">
          <h3 className="font-bold text-lg mb-4">Personal Information</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">Full Name <span className="text-failed-text">*</span></label>
              <input 
                type="text" 
                defaultValue={user?.fullName || 'Guest User'} 
                disabled={!isEditMode}
                className="w-full bg-surface border border-borderLight rounded-xl p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-bg disabled:text-muted transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">Birth Year</label>
                <input type="number" defaultValue="1995" disabled={!isEditMode} className="w-full bg-surface border border-borderLight rounded-xl p-3 text-sm disabled:bg-bg disabled:text-muted" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">Gender <span className="text-failed-text">*</span></label>
                <select disabled={!isEditMode} className="w-full bg-surface border border-borderLight rounded-xl p-3 text-sm disabled:bg-bg disabled:text-muted">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">City <span className="text-failed-text">*</span></label>
                <input type="text" defaultValue="Mumbai" disabled={!isEditMode} className="w-full bg-surface border border-borderLight rounded-xl p-3 text-sm disabled:bg-bg disabled:text-muted" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">Pincode <span className="text-failed-text">*</span></label>
                <input type="text" defaultValue="400001" disabled={!isEditMode} className="w-full bg-surface border border-borderLight rounded-xl p-3 text-sm disabled:bg-bg disabled:text-muted" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">UPI ID (For earnings/refunds)</label>
              <input type="text" defaultValue="user@okbank" disabled={!isEditMode} className="w-full bg-surface border border-borderLight rounded-xl p-3 text-sm disabled:bg-bg disabled:text-muted" />
            </div>
          </div>
        </section>

        {/* About / Bio */}
        <section className="card">
          <h3 className="font-bold text-lg mb-4">About Me</h3>
          <div>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={!isEditMode}
              rows={4}
              maxLength={300}
              className="w-full bg-surface border border-borderLight rounded-xl p-3 text-sm focus:border-primary disabled:bg-bg disabled:text-muted resize-none"
            />
            {isEditMode && (
              <p className="text-right text-xs text-muted mt-1">{bio.length}/300 characters</p>
            )}
          </div>
        </section>

        {/* Partner Section (Mock visibility) */}
        {(user?.roles?.includes('PARTNER') || user?.roles?.includes('ADMIN')) && (
          <>
            <div className="section-title">
              <span className="whitespace-nowrap px-2 text-sm uppercase tracking-widest">Partner Settings</span>
            </div>

            {/* KYC */}
            <section className="card bg-success-bg/30 border-success-text/20">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-success-bg text-success-text rounded-full shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">KYC Verified</h3>
                  <p className="text-sm text-muted mb-3">Your Aadhaar and PAN verification is complete. You are ready to receive bookings.</p>
                  <p className="text-xs font-mono text-muted/70 bg-bg inline-block px-2 py-1 rounded">Ref: KYC_9812A_OK</p>
                </div>
              </div>
            </section>

            {/* Availability */}
            <section className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Weekly Availability</h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">IST Timezone</span>
              </div>
              <div className="flex flex-col gap-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-borderLight/50 last:border-0">
                    <div className="flex items-center gap-3 w-1/3">
                      <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${i < 5 ? 'bg-success-text justify-end' : 'bg-borderLight justify-start'}`}>
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                      <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                    </div>
                    {i < 5 ? (
                      <div className="flex items-center gap-2">
                        <input type="time" defaultValue="09:00" disabled={!isEditMode} className="bg-bg text-xs p-1.5 rounded-md border border-borderLight disabled:opacity-50" />
                        <span className="text-muted text-xs">to</span>
                        <input type="time" defaultValue="18:00" disabled={!isEditMode} className="bg-bg text-xs p-1.5 rounded-md border border-borderLight disabled:opacity-50" />
                      </div>
                    ) : (
                      <span className="text-sm text-muted italic">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
