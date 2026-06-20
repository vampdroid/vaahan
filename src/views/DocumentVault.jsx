import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../services/supabase';
import TopAppBar from '../components/TopAppBar';

export function DocumentVault() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldOpenAdd = searchParams.get('action') === 'add-insurance';

  const [vehicle, setVehicle] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(shouldOpenAdd);

  // Form states
  const [docName, setDocName] = useState(shouldOpenAdd ? 'Insurance' : '');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileSize, setFileSize] = useState(0);
  const [fileType, setFileType] = useState('pdf');
  const [formError, setFormError] = useState('');

  // Storage Quota Stats
  const [usedSpace, setUsedSpace] = useState(380 * 1024); // mock starting space (380 KB)
  const quotaLimit = 1024 * 1024 * 1024; // 1 GB in bytes

  useEffect(() => {
    fetchVehicleAndDocs();
  }, [id]);

  const fetchVehicleAndDocs = async () => {
    setLoading(true);
    try {
      // Fetch vehicle
      const { data: vData, error: vError } = await supabase.from('vehicles').select('*').eq('id', id);
      if (vError) throw vError;
      if (vData && vData.length > 0) {
        setVehicle(vData[0]);
      } else {
        navigate('/dashboard');
        return;
      }

      // Fetch documents
      const { data: docsData, error: dError } = await supabase
        .from('document_vault')
        .select('*')
        .eq('vehicle_id', id);

      if (dError) throw dError;
      setDocuments(docsData || []);

      // Calculate total size of docs
      const totalSize = (docsData || []).reduce((acc, curr) => acc + (curr.file_size || 0), 380 * 1024);
      setUsedSpace(totalSize);
    } catch (err) {
      console.error("Error loading document vault:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileSize(file.size);
      const ext = file.name.split('.').pop().toLowerCase();
      setFileType(ext);
      if (!docName) {
        // Prefill document name based on file name without extension
        setDocName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!docName.trim()) {
      setFormError("Please enter a document name.");
      return;
    }

    setFormError('');
    try {
      // Mock uploading to Supabase Storage / base64 string
      const fileUrl = selectedFile 
        ? URL.createObjectURL(selectedFile)
        : `https://mockstorage.supabase.co/object/public/documents/${id}_${Date.now()}.pdf`;

      const newDoc = {
        vehicle_id: id,
        name: docName.trim(),
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize || Math.floor(50 * 1024 + Math.random() * 200 * 1024), // mock size between 50KB and 250KB if no file selected
        expiry_date: expiryDate || null
      };

      // 1. Insert document metadata
      const { error: dError } = await supabase.from('document_vault').insert(newDoc);
      if (dError) throw dError;

      // 2. If it is PUC or Insurance, let us optionally update the vehicle expiry dates!
      const updateData = {};
      if (docName.toLowerCase().includes('puc') && expiryDate) {
        updateData.puc_expiry_date = expiryDate;
      } else if (docName.toLowerCase().includes('insur') && expiryDate) {
        updateData.insurance_expiry_date = expiryDate;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase.from('vehicles').update(updateData).eq('id', id);
      }

      setShowAddModal(false);
      resetForm();
      fetchVehicleAndDocs();
    } catch (err) {
      console.error("Error uploading document:", err);
      setFormError(err.message || "Could not upload document. Please try again.");
    }
  };

  const resetForm = () => {
    setDocName('');
    setExpiryDate('');
    setSelectedFile(null);
    setFileSize(0);
    setFileType('pdf');
    setFormError('');
  };

  const getDocStatus = (doc) => {
    if (!doc.expiry_date) return { text: 'Valid', class: 'bg-tertiary-fixed text-on-tertiary-fixed' };
    const diff = new Date(doc.expiry_date) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) return { text: 'Expired', class: 'bg-error text-on-error' };
    if (days <= 15) return { text: 'Exp. Soon', class: 'bg-secondary-fixed text-on-secondary-fixed' };
    return { text: 'Valid', class: 'bg-tertiary-fixed text-on-tertiary-fixed' };
  };

  const getDocIcon = (name) => {
    const lName = name.toLowerCase();
    if (lName.includes('puc') || lName.includes('pollution')) return 'air';
    if (lName.includes('insur') || lName.includes('policy')) return 'policy';
    if (lName.includes('license')) return 'badge';
    return 'description'; // default RC book / standard doc
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading || !vehicle) {
    return (
      <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col justify-center items-center font-body">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Loading documents...</span>
      </div>
    );
  }

  const quotaPercent = (usedSpace / quotaLimit) * 100;

  return (
    <div className="bg-surface text-on-surface w-full max-w-[768px] mx-auto min-h-screen relative flex flex-col font-body">
      <TopAppBar 
        title="Document Vault" 
        subtitle={vehicle.nickname || vehicle.model_name}
        showBack={true}
        rightElement={
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        }
      />

      <main className="flex-1 px-container-margin py-4 flex flex-col gap-6 overflow-y-auto">
        {/* Storage Quota Section */}
        <section className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 shadow-ambient-lvl1 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="font-label-lg text-label-lg text-primary font-bold">Storage Quota</h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
              {formatSize(usedSpace)} of 1 GB used
            </span>
          </div>
          
          <div className="w-full bg-outline-variant/30 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-secondary h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(2, quotaPercent)}%` }}
            ></div>
          </div>
        </section>

        {/* Documents Grid */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">Documents</h3>

          <div className="grid grid-cols-2 gap-grid-gutter">
            {documents.map((doc) => {
              const status = getDocStatus(doc);
              const icon = getDocIcon(doc.name);
              const isExpired = status.text === 'Expired';
              const isExpSoon = status.text === 'Exp. Soon';
              
              let borderClass = 'border-transparent';
              let cardBg = 'bg-surface-container-lowest';
              
              if (isExpired) {
                borderClass = 'border-l-4 border-error';
                cardBg = 'bg-error-container/20';
              } else if (isExpSoon) {
                borderClass = 'border-l-4 border-secondary';
                cardBg = 'bg-secondary-fixed/20';
              }

              return (
                <a 
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${cardBg} rounded-xl p-4 shadow-ambient-lvl1 flex flex-col items-center justify-center gap-3 border ${borderClass} relative overflow-hidden group hover:bg-surface-container-low active:scale-95 transition-all text-center min-h-[135px]`}
                >
                  <div className="absolute top-2 right-2">
                    <span className={`${status.class} font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold`}>
                      {status.text}
                    </span>
                  </div>
                  
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isExpired 
                      ? 'bg-error-container text-error' 
                      : isExpSoon 
                        ? 'bg-secondary-fixed text-on-secondary-fixed' 
                        : 'bg-primary-fixed text-primary-container'
                  }`}>
                    <span className="material-symbols-outlined filled text-2xl">
                      {icon}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <span className="font-label-lg text-label-lg text-on-surface font-bold leading-tight truncate max-w-[120px]">
                      {doc.name}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-80 mt-0.5">
                      {formatSize(doc.file_size)}
                    </span>
                  </div>
                </a>
              );
            })}

            {/* Add Document dashed card */}
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-surface-variant/20 rounded-xl p-4 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-low active:scale-95 transition-all min-h-[135px]"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl">add</span>
              </div>
              <span className="font-label-lg text-label-lg text-on-surface font-bold">Add Document</span>
            </button>
          </div>
        </section>
      </main>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)}></div>
          <form 
            onSubmit={handleUpload}
            className="bg-surface text-on-surface w-[320px] rounded-xl p-5 shadow-2xl relative z-10 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Upload Document</h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Document Name</label>
                <input 
                  type="text"
                  placeholder="e.g. RC Book, Insurance Policy"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Expiry Date (Optional)</label>
                <input 
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-2.5 font-body-md text-body-md shadow-sm outline-none"
                />
              </div>

              {/* File Upload Selector */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-semibold">Attach Document File</span>
                <label className="border-2 border-dashed border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-surface-container-low transition-colors text-center bg-surface-container-lowest">
                  <span className="material-symbols-outlined text-[28px] text-outline">cloud_upload</span>
                  <span className="font-label-sm text-label-sm text-primary font-bold">
                    {selectedFile ? selectedFile.name : 'Select PDF or Image'}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant opacity-75">
                    {selectedFile ? formatSize(selectedFile.size) : 'Max size 10MB'}
                  </span>
                  <input 
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {formError && <p className="text-error font-label-sm text-label-sm px-1">{formError}</p>}

            <button 
              type="submit"
              className="w-full bg-[#E8690B] hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Upload Document
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default DocumentVault;
