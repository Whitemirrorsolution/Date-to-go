import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.js';
import { 
  Shield, UploadCloud, X, CheckCircle2, AlertCircle, 
  FileText, Lock, ChevronLeft, Loader2, Info
} from 'lucide-react';

interface KycDocument {
  _id: string;
  type: string;
  status: string;
}

interface KycSubmission {
  _id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
  decision?: string;
  reason?: string;
  documents: KycDocument[];
}

export const KycPage: React.FC = () => {
  const { user } = useAuth();
  const [submission, setSubmission] = useState<KycSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom Notification State (Replaces native alerts)
  const [notification, setNotification] = useState<{type: 'error' | 'success', msg: string} | null>(null);
  
  const [uploadType, setUploadType] = useState<string>('AADHAAR_MASKED');
  const [idNumber, setIdNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKyc();
  }, []);

  // Auto-hide notifications after 4 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const showMsg = (msg: string, type: 'error' | 'success' = 'error') => {
    setNotification({ msg, type });
  };

  const fetchKyc = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/partner/kyc');
      if (res.success && res.data) {
        setSubmission(res.data);
      }
    } catch (e: any) {
      if (e.status !== 404) showMsg(e.message || 'Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    if (!idNumber.trim()) {
      showMsg("Please enter the document ID number first.");
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      return;
    }

    setUploading(true);
    const file = e.target.files[0];
    
    try {
      // 1. Upload to main cloud storage
      const formData = new FormData();
      formData.append('file', file);
      
      const resUpload = await api.post<any>('/upload', formData);
      if (!resUpload.success || !resUpload.data?.url) {
        throw new Error(resUpload.message || 'Upload failed');
      }

      // 2. Register document
      await api.post('/partner/kyc/documents', {
        type: uploadType,
        storageKey: resUpload.data.url,
        mime: file.type,
        sizeBytes: file.size,
        idNumber: idNumber.trim()
      });
      
      showMsg('Document uploaded successfully!', 'success');
      setIdNumber('');
      fetchKyc();
    } catch (e: any) {
      showMsg(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset for re-upload
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Remove this document?')) return;
    try {
      await api.delete(`/partner/kyc/documents/${docId}`);
      showMsg('Document removed.', 'success');
      fetchKyc();
    } catch (e: any) {
      showMsg(e.message || 'Delete failed');
    }
  };

  const handleSubmit = async () => {
    if (!consentGiven) {
      showMsg("Please agree to the privacy policy first.");
      return;
    }
    try {
      await api.post('/partner/kyc/submit');
      showMsg('KYC submitted for review!', 'success');
      fetchKyc();
    } catch (e: any) {
      showMsg(e.message || 'Submit failed');
    }
  };

  const goBack = () => {
    window.history.back();
  };

  if (!user?.roles?.includes('PARTNER')) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-bg text-textMain p-6 text-center">
        <Shield size={64} className="mb-4 text-muted opacity-50" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted text-sm mt-2">KYC verification is only required for Partners.</p>
        <button onClick={goBack} className="mt-6 px-6 py-3 bg-surface border border-borderLight rounded-full font-bold active:scale-95 transition-transform">
          Go Back
        </button>
      </div>
    );
  }

  if (loading) return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-bg text-textMain">
      <Loader2 size={40} className="text-primary animate-spin mb-4" />
      <p className="text-sm font-bold text-muted animate-pulse">Loading Identity Portal...</p>
    </div>
  );

  const status = submission?.status || 'NOT_SUBMITTED';
  const docs = submission?.documents || [];
  const canUpload = ['NOT_SUBMITTED', 'NEEDS_CHANGES'].includes(status);
  const showStickyFooter = canUpload && docs.length > 0;

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex flex-col bg-bg">
      {/* Main PWA Container */}
      <div className="w-full flex-1 flex flex-col bg-bg relative">
        
        {/* Sticky Header */}
        <header className="absolute top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur-xl border-b border-borderLight/50 pt-safe transition-all">
          <div className="h-14 px-4 flex items-center gap-3 max-w-4xl mx-auto w-full">
            <button onClick={goBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-borderLight active:scale-95 transition-transform">
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-lg font-black tracking-tight">Identity Verification</h1>
          </div>
        </header>

        {/* Global Notification Toast */}
        {notification && (
          <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[360px] animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${
              notification.type === 'error' ? 'bg-failed-bg border-failed-text/30 text-failed-text' : 'bg-success-text/10 border-success-text/30 text-success-text'
            }`}>
              {notification.type === 'error' ? <AlertCircle size={20} className="shrink-0 mt-0.5"/> : <CheckCircle2 size={20} className="shrink-0 mt-0.5"/>}
              <p className="text-sm font-bold leading-tight">{notification.msg}</p>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <main className={`flex-1 overflow-y-auto px-5 pt-24 ${showStickyFooter ? 'pb-40' : 'pb-8'} scrollbar-hide max-w-4xl mx-auto w-full`}>
          
          <div className="flex flex-col items-center text-center mb-6 mt-2">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Shield size={32} />
            </div>
            <p className="text-sm text-muted max-w-[280px]">Mandatory verification to ensure platform safety and build trust with seekers.</p>
          </div>

          {/* Status Banner */}
          <div className="mb-6">
            {status === 'NOT_SUBMITTED' && docs.length === 0 && (
              <div className="bg-surface border border-borderLight p-4 rounded-2xl flex items-center gap-3">
                <Info className="text-primary shrink-0"/> 
                <span className="text-sm font-medium">Please upload your documents to begin.</span>
              </div>
            )}
            {status === 'NOT_SUBMITTED' && docs.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3 text-amber-600">
                <AlertCircle className="shrink-0"/> 
                <span className="text-sm font-bold">Draft saved. Submit when ready.</span>
              </div>
            )}
            {(status === 'SUBMITTED' || status === 'UNDER_REVIEW') && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 text-primary">
                <Shield className="shrink-0"/> 
                <span className="text-sm font-bold">Documents are under manual review.</span>
              </div>
            )}
            {status === 'APPROVED' && (
              <div className="bg-success-text/10 border border-success-text/20 p-5 rounded-3xl flex flex-col items-center text-center text-success-text shadow-sm">
                <CheckCircle2 size={40} className="mb-2"/> 
                <h3 className="font-black text-lg mb-1">Verification Complete</h3>
                <span className="text-sm font-medium opacity-80">Your identity is verified! You can now create listings and accept bookings.</span>
              </div>
            )}
            {(status === 'REJECTED' || status === 'NEEDS_CHANGES') && (
              <div className="bg-failed-bg border border-failed-text/30 p-5 rounded-3xl flex items-start gap-3 text-failed-text">
                <AlertCircle className="shrink-0 mt-0.5"/> 
                <div>
                  <p className="font-black mb-1">Verification {status === 'REJECTED' ? 'Rejected' : 'Needs Changes'}</p>
                  <p className="text-sm font-medium opacity-90">{submission?.reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Section */}
          {canUpload && (
            <div className="space-y-4 mb-8">
              <h3 className="font-black text-lg px-1">Upload Documents</h3>
              
              <div className="bg-surface p-5 rounded-3xl border border-borderLight shadow-sm flex flex-col gap-5 relative overflow-hidden">
                <p className="text-xs font-bold text-muted flex items-center justify-center gap-1.5 bg-bg py-2 rounded-lg">
                  <Lock size={12}/> 256-bit Encrypted & Auto-deleted in 30 days
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 px-1">Document Type</label>
                    <div className="relative">
                      <select 
                        value={uploadType} 
                        onChange={e => setUploadType(e.target.value)} 
                        className="w-full h-14 px-4 rounded-2xl bg-bg border border-borderLight focus:border-primary outline-none font-bold appearance-none text-textMain"
                      >
                        <option value="AADHAAR_MASKED">Masked Aadhaar</option>
                        <option value="PAN">PAN Card</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="DRIVING_LICENCE">Driving Licence</option>
                        <option value="SELFIE">Live Selfie</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                        ▼
                      </div>
                    </div>
                    {uploadType === 'AADHAAR_MASKED' && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-amber-500 bg-amber-500/10 p-2.5 rounded-xl">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <p>IMPORTANT: Please mask the first 8 digits of your Aadhaar before uploading.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 px-1">ID Number</label>
                    <input 
                      type="text" 
                      value={idNumber} 
                      onChange={e => setIdNumber(e.target.value.toUpperCase())} 
                      className="w-full h-14 px-4 rounded-2xl bg-bg border border-borderLight focus:border-primary outline-none font-bold text-textMain placeholder:text-muted/50 transition-colors" 
                      placeholder="e.g. ABCDE1234F" 
                    />
                  </div>
                </div>

                <label className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer block ${uploading ? 'border-borderLight bg-bg opacity-70 pointer-events-none' : 'border-primary/50 bg-primary/5 active:bg-primary/10 active:scale-[0.98]'}`}>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/jpeg, image/png, application/pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {uploading ? (
                    <Loader2 size={32} className="mx-auto text-primary mb-2 animate-spin" />
                  ) : (
                    <UploadCloud size={32} className="mx-auto text-primary mb-2" />
                  )}
                  <p className="font-black text-sm text-primary mb-1">
                    {uploading ? 'Uploading securely...' : 'Tap to select & upload file'}
                  </p>
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wide">JPEG, PNG, PDF up to 5MB</p>
                </label>
              </div>
            </div>
          )}

          {/* Uploaded Documents List */}
          {docs.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="font-black text-lg px-1">Uploaded Vault</h3>
              <div className="space-y-3">
                {docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-borderLight shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight mb-0.5">{doc.type.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] font-bold text-success-text uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={10} strokeWidth={3}/> Securely vaulted
                        </p>
                      </div>
                    </div>
                    {canUpload && (
                      <button 
                        onClick={() => handleDelete(doc._id)} 
                        className="w-10 h-10 flex items-center justify-center text-failed-text bg-failed-bg rounded-full active:scale-90 transition-transform shrink-0"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* Sticky Submit Footer */}
        {showStickyFooter && (
          <div className="absolute bottom-0 left-0 w-full z-40 bg-surface/90 backdrop-blur-xl border-t border-borderLight/50 pb-safe animate-in slide-in-from-bottom-8 flex justify-center">
            <div className="max-w-4xl mx-auto w-full p-4">
              <label className="flex items-start gap-3 mb-4 cursor-pointer p-2 bg-bg rounded-xl border border-borderLight">
                <div className="shrink-0 mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={consentGiven} 
                    onChange={e => setConsentGiven(e.target.checked)} 
                    className="w-5 h-5 accent-primary rounded cursor-pointer" 
                  />
                </div>
                <span className="text-xs font-semibold text-muted leading-relaxed">
                  I consent to the collection and secure processing of my identity documents for verification. Documents are auto-deleted 30 days post-review per the DPDP Act.
                </span>
              </label>
              
              <button 
                onClick={handleSubmit} 
                disabled={!consentGiven}
                className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                Submit for Verification
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};