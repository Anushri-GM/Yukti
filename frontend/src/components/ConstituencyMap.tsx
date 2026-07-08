import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CitizenSubmission } from '../store/useStore';
import 'leaflet/dist/leaflet.css';

// Marker overrides are handled directly inside the component via L.divIcon

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
  }, [center, map]);
  return null;
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
      center={mapCenter} 
      zoom={13} 
      style={{ width: '100%', height: '100%', borderRadius: '1rem', zIndex: 1 }}
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
              <div className="p-2 space-y-1 text-slate-800 text-xs max-w-xs font-sans">
                <h4 className="font-extrabold text-gov-brand-blue-500 text-xs">Grievance Info</h4>
                <p className="font-medium italic">"{sub.text.slice(0, 85)}..."</p>
                <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-slate-150 text-[10px] text-slate-500">
                  <span><strong>Urgency:</strong> {sub.urgency}/5</span>
                  <span><strong>Ward:</strong> {sub.ward}</span>
                  <span><strong>Category:</strong> {sub.category}</span>
                  <span><strong>Status:</strong> {sub.status}</span>
                </div>
                <button
                  onClick={() => onViewDetails(sub)}
                  className="mt-2 text-center w-full py-1 bg-gov-brand-blue-500 text-white rounded text-[10px] font-bold"
                >
                  View Full Details
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};
