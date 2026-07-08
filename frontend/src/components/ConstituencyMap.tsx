import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CitizenSubmission } from '../store/useStore';
import 'leaflet/dist/leaflet.css';

// Marker overrides are handled directly inside the component via L.divIcon

// Monkey-patch Leaflet container initialization to prevent StrictMode double-mounting crash
const originalInit = L.Map.prototype._initContainer;
L.Map.prototype._initContainer = function (id) {
  const container = L.DomUtil.get(id);
  if (container && container._leaflet_id) {
    delete container._leaflet_id;
  }
  originalInit.call(this, id);
};

interface ConstituencyMapProps {
  submissions: CitizenSubmission[];
  selectedMarkerId: string | null;
  onMarkerClick: (sub: CitizenSubmission) => void;
  center: { lat: number; lng: number };
  onViewDetails: (sub: CitizenSubmission) => void;
}

// Sub-component to dynamically pan/center map when coords change
const ChangeView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [center, map]);
  return null;
};

const _getPriorityText = (urgency: number): string => {
  if (urgency === 5) return 'Very High';
  if (urgency === 4) return 'High';
  if (urgency === 3) return 'Medium';
  return 'Low';
};

const _getDepartment = (category: string): string => {
  const deptMap: Record<string, string> = {
    "Roads": "Ministry of Road Transport and Highways",
    "Water": "Ministry of Jal Shakti",
    "Sanitation": "Ministry of Jal Shakti (Drinking Water & Sanitation)",
    "Healthcare": "Ministry of Health and Family Welfare",
    "Education": "Ministry of Education",
    "Safety": "Ministry of Home Affairs",
    "Other": "Department of Public Grievances"
  };
  return deptMap[category] || "Department of Public Grievances";
};

export const ConstituencyMap: React.FC<ConstituencyMapProps> = ({
  submissions,
  onMarkerClick,
  center,
  onViewDetails
}) => {
  
  // Custom colored div-icon indicators based on urgency levels
  const getMarkerIcon = (urgency: number) => {
    let color = '#10B981'; // Green (Low)
    if (urgency === 5) color = '#EF4444'; // Red (Very High)
    else if (urgency === 4) color = '#F97316'; // Orange (High)
    else if (urgency === 3) color = '#F59E0B'; // Yellow (Medium)

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        background-color: ${color}; 
        width: 16px; 
        height: 16px; 
        border-radius: 50%; 
        border: 2.5px solid white; 
        box-shadow: 0 0 6px rgba(0,0,0,0.5);
        cursor: pointer;
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  const mapCenter: [number, number] = [center.lat, center.lng];

  return (
    <MapContainer 
      key={`${center.lat}-${center.lng}-${submissions.length}`}
      center={mapCenter} 
      zoom={13} 
      style={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '1rem', zIndex: 1 }}
    >
      <ChangeView center={mapCenter} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {submissions.map((sub) => {
        if (!sub.latitude || !sub.longitude) return null;
        return (
          <Marker 
            key={sub.id} 
            position={[sub.latitude, sub.longitude]}
            icon={getMarkerIcon(sub.urgency)}
            eventHandlers={{
              click: () => onMarkerClick(sub)
            }}
          >
            <Popup>
              <div className="p-3.5 space-y-2 text-slate-800 text-xs max-w-xs font-sans">
                <div className="border-b border-slate-200 pb-1.5">
                  <h4 className="font-extrabold text-gov-brand-blue-500 text-xs truncate">
                    {sub.title || "Citizen Grievance"}
                  </h4>
                  <span className="text-[9px] text-slate-400">
                    {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                
                <p className="text-[11px] leading-relaxed text-slate-650 bg-slate-50 p-2 rounded border border-slate-100 italic">
                  <strong>AI Summary:</strong> "{sub.summary || sub.text.slice(0, 75)}..."
                </p>

                <div className="grid grid-cols-1 gap-1.5 pt-1 text-[10px] text-slate-500 font-semibold">
                  <div><strong>Category:</strong> {sub.category}</div>
                  <div><strong>Priority:</strong> {_getPriorityText(sub.urgency)} ({sub.urgency}/5)</div>
                  <div><strong>Department:</strong> {_getDepartment(sub.category)}</div>
                  <div><strong>Status:</strong> {sub.status}</div>
                  <div><strong>Address:</strong> {sub.affected_infrastructure || sub.ward}</div>
                </div>

                <button
                  onClick={() => onViewDetails(sub)}
                  className="mt-2 text-center w-full py-1.5 bg-gov-brand-blue-500 hover:bg-gov-brand-blue-900 text-white rounded text-[10px] font-bold transition-colors"
                >
                  View Full Details & AI Support
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};
