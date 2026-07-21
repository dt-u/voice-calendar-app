import React, { useState, useEffect } from 'react';
import { X, Save, Image as ImageIcon, Sliders, UploadCloud } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [aiMascotUrl, setAiMascotUrl] = useState('');
  const [userMascotUrl, setUserMascotUrl] = useState('');
  const [dashboardOpacity, setDashboardOpacity] = useState(0.95);

  useEffect(() => {
    if (isOpen) {
      setAiMascotUrl(localStorage.getItem('aiMascotUrl') || 'https://api.dicebear.com/7.x/bottts/svg?seed=Calendar&backgroundColor=transparent');
      setUserMascotUrl(localStorage.getItem('userMascotUrl') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User&backgroundColor=b6e3f4');
      const savedOpacity = localStorage.getItem('dashboardOpacity');
      setDashboardOpacity(savedOpacity ? parseFloat(savedOpacity) : 0.95);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('aiMascotUrl', aiMascotUrl);
    localStorage.setItem('userMascotUrl', userMascotUrl);
    localStorage.setItem('dashboardOpacity', dashboardOpacity.toString());

    // Dispatch a storage event manually
    window.dispatchEvent(new Event('local-storage-update'));

    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setter(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent, setter: (url: string) => void) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setter(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-drag-region">
      <div 
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders size={20} className="text-blue-400" />
            Dashboard Settings
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* AI Mascot Upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <ImageIcon size={16} className="text-blue-400" />
              AI Mascot Image
            </label>
            <div 
              className="relative flex flex-col items-center justify-center w-full h-32 bg-gray-950 border-2 border-dashed border-gray-700 rounded-xl hover:border-blue-500 hover:bg-gray-900/50 transition-colors cursor-pointer overflow-hidden group"
              onDrop={(e) => handleDrop(e, setAiMascotUrl)}
              onDragOver={handleDragOver}
            >
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setAiMascotUrl)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              {aiMascotUrl && aiMascotUrl.startsWith('data:') ? (
                <img src={aiMascotUrl} alt="AI Mascot Preview" className="absolute inset-0 w-full h-full object-contain opacity-40 group-hover:opacity-20 transition-opacity" />
              ) : null}
              <div className="z-10 flex flex-col items-center pointer-events-none">
                <UploadCloud size={24} className="text-gray-500 mb-2" />
                <span className="text-sm text-gray-400">Click to browse or drag and drop</span>
                <span className="text-xs text-gray-600 mt-1">PNG, JPG, GIF up to 5MB</span>
              </div>
            </div>
          </div>

          {/* User Mascot Upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <ImageIcon size={16} className="text-green-400" />
              User Mascot Image
            </label>
            <div 
              className="relative flex flex-col items-center justify-center w-full h-32 bg-gray-950 border-2 border-dashed border-gray-700 rounded-xl hover:border-green-500 hover:bg-gray-900/50 transition-colors cursor-pointer overflow-hidden group"
              onDrop={(e) => handleDrop(e, setUserMascotUrl)}
              onDragOver={handleDragOver}
            >
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setUserMascotUrl)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              {userMascotUrl && userMascotUrl.startsWith('data:') ? (
                <img src={userMascotUrl} alt="User Mascot Preview" className="absolute inset-0 w-full h-full object-contain opacity-40 group-hover:opacity-20 transition-opacity" />
              ) : null}
              <div className="z-10 flex flex-col items-center pointer-events-none">
                <UploadCloud size={24} className="text-gray-500 mb-2" />
                <span className="text-sm text-gray-400">Click to browse or drag and drop</span>
              </div>
            </div>
          </div>

          {/* Background Opacity */}
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <label className="text-sm font-semibold text-gray-300 flex items-center justify-between">
              <span>Background Opacity</span>
              <span className="text-blue-400">{Math.round(dashboardOpacity * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0" max="1" step="0.05"
              value={dashboardOpacity}
              onChange={e => setDashboardOpacity(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <p className="text-xs text-gray-500">Adjust the transparency of the dashboard background.</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
