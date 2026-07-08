import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CitizenSubmission } from '../store/useStore';
import 'leaflet/dist/leaflet.css';

// Monkey-patch Leaflet container initialization to prevent StrictMode double-mounting crash
const originalInit = L.Map.prototype._initContainer;
L.Map.prototype._initContainer = function (id) {
  const container = L.DomUtil.get(id);
  if (container && (container as any)._leaflet_id) {
    delete (container as any)._leaflet_id;
  }
  originalInit.call(this, id);
};

// ─── Priority config ────────────────────────────────────────────────────────
const PRIORITY_CONFIG = [
  { urgency: 5, label: 'Very High', color: '#EF4444', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200'    },
  { urgency: 4, label: 'High',      color: '#F97316', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  { urgency: 3, label: 'Medium',    color: '#F59E0B', dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 border-amber-200'   },
  { urgency: 2, label: 'Low',       color: '#10B981', dot: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { urgency: 1, label: 'Low',       color: '#10B981', dot: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

const getPriorityConfig = (urgency: number) =>
  PRIORITY_CONFIG.find(p => p.urgency === urgency) ?? PRIORITY_CONFIG[3];

const getPriorityText = (urgency: number): string => getPriorityConfig(urgency).label;
const getPriorityColor = (urgency: number): string => getPriorityConfig(urgency).color;
const getPriorityBadge = (urgency: number): string => getPriorityConfig(urgency).badge;

const getDepartment = (category: string): string => {
  const deptMap: Record<string, string> = {
    Roads:      'Ministry of Road Transport and Highways',
    Water:      'Ministry of Jal Shakti',
    Sanitation: 'Ministry of Jal Shakti (Drinking Water & Sanitation)',
    Healthcare: 'Ministry of Health and Family Welfare',
    Education:  'Ministry of Education',
    Safety:     'Ministry of Home Affairs',
    Other:      'Department of Public Grievances',
  };
  return deptMap[category] ?? 'Department of Public Grievances';
};

// ─── Inject pulse keyframe & legend CSS once ────────────────────────────────
const LEGEND_STYLE_ID = 'yukti-map-legend-style';
if (!document.getElementById(LEGEND_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = LEGEND_STYLE_ID;
  style.textContent = `
    @keyframes yukti-pulse-ring {
      0%   { transform: scale(1);   opacity: 0.9; }
      70%  { transform: scale(2.4); opacity: 0;   }
      100% { transform: scale(2.4); opacity: 0;   }
    }
    .yukti-marker-pulse::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      animation: yukti-pulse-ring 1.4s ease-out infinite;
      background: inherit;
      z-index: -1;
    }
    .yukti-legend-ctrl {
      pointer-events: auto;
    }
    .leaflet-tooltip-own {
      background: rgba(15,23,42,0.92) !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
      color: #f1f5f9 !important;
      font-family: inherit !important;
      font-size: 11px !important;
      padding: 6px 10px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
    }
    .leaflet-tooltip-own::before {
      border-top-color: rgba(15,23,42,0.92) !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface ConstituencyMapProps {
  submissions: CitizenSubmission[];
  selectedMarkerId: string | null;
  onMarkerClick: (sub: CitizenSubmission) => void;
  center: { lat: number; lng: number };
  onViewDetails: (sub: CitizenSubmission) => void;
}

// ─── ChangeView sub-component ────────────────────────────────────────────────
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
    setTimeout(() => map.invalidateSize(), 200);
  }, [center, zoom, map]);
  return null;
};

// ─── Floating Legend Control ─────────────────────────────────────────────────
const LegendControl: React.FC<{ submissions: CitizenSubmission[] }> = ({ submissions }) => {
  const map = useMap();

  const counts = useMemo(() => ({
    5: submissions.filter(s => s.urgency === 5).length,
    4: submissions.filter(s => s.urgency === 4).length,
    3: submissions.filter(s => s.urgency === 3).length,
    low: submissions.filter(s => s.urgency <= 2).length,
    total: submissions.length,
  }), [submissions]);

  useEffect(() => {
    const ctrl = new (L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'yukti-legend-ctrl');
        div.style.cssText = `
          display: flex; flex-direction: column; gap: 8px;
          pointer-events: auto; user-select: none;
        `;
        div.innerHTML = `
          <!-- Overview Card -->
          <div style="
            background: rgba(15,23,42,0.90);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            padding: 12px 14px;
            min-width: 170px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          ">
            <div style="color:#94a3b8; font-size:9px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">
              📊 Constituency Overview
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;">
              <span style="color:#cbd5e1; font-size:10px; font-weight:600;">Total Grievances</span>
              <span style="color:#f8fafc; font-size:13px; font-weight:900;">${counts.total}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex; align-items:center; gap:5px; color:#fca5a5; font-size:10px; font-weight:600;">
                  <span style="width:8px;height:8px;border-radius:50%;background:#EF4444;display:inline-block;flex-shrink:0;"></span>Very High
                </span>
                <span style="color:#fca5a5; font-size:11px; font-weight:800;">${counts[5]}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex; align-items:center; gap:5px; color:#fdba74; font-size:10px; font-weight:600;">
                  <span style="width:8px;height:8px;border-radius:50%;background:#F97316;display:inline-block;flex-shrink:0;"></span>High
                </span>
                <span style="color:#fdba74; font-size:11px; font-weight:800;">${counts[4]}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex; align-items:center; gap:5px; color:#fcd34d; font-size:10px; font-weight:600;">
                  <span style="width:8px;height:8px;border-radius:50%;background:#F59E0B;display:inline-block;flex-shrink:0;"></span>Medium
                </span>
                <span style="color:#fcd34d; font-size:11px; font-weight:800;">${counts[3]}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex; align-items:center; gap:5px; color:#6ee7b7; font-size:10px; font-weight:600;">
                  <span style="width:8px;height:8px;border-radius:50%;background:#10B981;display:inline-block;flex-shrink:0;"></span>Low
                </span>
                <span style="color:#6ee7b7; font-size:11px; font-weight:800;">${counts.low}</span>
              </div>
            </div>
          </div>

          <!-- Priority Legend Card -->
          <div style="
            background: rgba(15,23,42,0.90);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            padding: 12px 14px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          ">
            <div style="color:#94a3b8; font-size:9px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">
              📍 Priority Legend
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${[
                { color:'#EF4444', label:'Very High',  sub:'Immediate Action Required' },
                { color:'#F97316', label:'High',       sub:'Action Required Soon'       },
                { color:'#F59E0B', label:'Medium',     sub:'Planned Maintenance'        },
                { color:'#10B981', label:'Low',        sub:'Routine Monitoring'         },
              ].map(({ color, label, sub }) => `
                <div style="display:flex; align-items:flex-start; gap:8px;">
                  <div style="
                    width:12px; height:12px; border-radius:50%;
                    background:${color}; border:2px solid rgba(255,255,255,0.3);
                    box-shadow: 0 0 6px ${color}88;
                    flex-shrink:0; margin-top:1px;
                  "></div>
                  <div>
                    <div style="color:#f1f5f9; font-size:10px; font-weight:700;">${label}</div>
                    <div style="color:#64748b; font-size:8.5px; margin-top:1px;">${sub}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
      },
    }))({ position: 'topright' });
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map, counts]);

  return null;
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const ConstituencyMap: React.FC<ConstituencyMapProps> = ({
  submissions,
  selectedMarkerId,
  onMarkerClick,
  center,
  onViewDetails,
}) => {

  const getMarkerIcon = (urgency: number, isSelected: boolean) => {
    const color = getPriorityColor(urgency);
    const size  = isSelected ? 22 : 16;
    const pulse = isSelected ? 'yukti-marker-pulse' : '';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="${pulse}" style="
          position: relative;
          background-color: ${color};
          width:  ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${isSelected ? '3px' : '2.5px'} solid white;
          box-shadow: 0 0 ${isSelected ? '14px' : '6px'} ${color}${isSelected ? 'cc' : '88'};
          cursor: pointer;
        "></div>`,
      iconSize:   [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const mapCenter: [number, number] = [center.lat, center.lng];
  const selectedSub = selectedMarkerId
    ? submissions.find(s => s.id === selectedMarkerId)
    : null;
  const focusCenter: [number, number] = selectedSub?.latitude && selectedSub?.longitude
    ? [selectedSub.latitude, selectedSub.longitude]
    : mapCenter;
  const focusZoom = selectedSub ? 16 : 13;

  return (
    <MapContainer
      key={`${center.lat}-${center.lng}-${submissions.length}`}
      center={mapCenter}
      zoom={13}
      style={{ width: '100%', height: '100%', minHeight: '500px', borderRadius: '1rem', zIndex: 1 }}
    >
      <ChangeView center={focusCenter} zoom={focusZoom} />
      <LegendControl submissions={submissions} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {submissions.map((sub) => {
        if (!sub.latitude || !sub.longitude) return null;
        const isSelected = sub.id === selectedMarkerId;
        const priorityText  = getPriorityText(sub.urgency);
        const priorityBadge = getPriorityBadge(sub.urgency);

        return (
          <Marker
            key={sub.id}
            position={[sub.latitude, sub.longitude]}
            icon={getMarkerIcon(sub.urgency, isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ click: () => onMarkerClick(sub) }}
          >
            {/* ── Hover Tooltip ── */}
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
              className="leaflet-tooltip-own"
            >
              <div style={{ lineHeight: '1.5' }}>
                <div style={{ fontWeight: 700, fontSize: '11px', color: '#f1f5f9', marginBottom: '2px' }}>
                  {sub.summary ? sub.summary.slice(0, 50) : sub.text.slice(0, 50)}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-block', width: '7px', height: '7px',
                    borderRadius: '50%', background: getPriorityColor(sub.urgency), flexShrink: 0,
                  }} />
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>{priorityText}</span>
                  <span style={{ color: '#475569', fontSize: '10px' }}>·</span>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>{sub.ward || sub.affected_infrastructure || 'Constituency Area'}</span>
                </div>
              </div>
            </Tooltip>

            {/* ── Click Popup ── */}
            <Popup minWidth={260} maxWidth={300}>
              <div style={{ fontFamily: 'inherit', padding: '4px 2px', minWidth: '250px' }}>
                {/* Header */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#1e40af', lineHeight: '1.3', flex: 1 }}>
                      {sub.category} Grievance
                    </h4>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                      borderRadius: '4px', border: '1px solid',
                      background: getPriorityColor(sub.urgency) + '18',
                      color: getPriorityColor(sub.urgency),
                      borderColor: getPriorityColor(sub.urgency) + '44',
                      flexShrink: 0,
                    }}>
                      {priorityText}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                    {sub.created_at ? new Date(sub.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    }) : 'N/A'}
                  </div>
                </div>

                {/* AI Summary */}
                {(sub.summary || sub.text) && (
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
                    padding: '7px 9px', marginBottom: '8px', fontSize: '10.5px',
                    color: '#475569', lineHeight: '1.5', fontStyle: 'italic',
                  }}>
                    "{(sub.summary || sub.text).slice(0, 100)}{(sub.summary || sub.text).length > 100 ? '…' : ''}"
                  </div>
                )}

                {/* Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', marginBottom: '10px' }}>
                  {[
                    { label: 'Category',   value: sub.category },
                    { label: 'Department', value: getDepartment(sub.category) },
                    { label: 'Ward / Area',value: sub.ward || sub.affected_infrastructure || 'Constituency Area' },
                    { label: 'Status',     value: sub.status },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: '68px', flexShrink: 0 }}>{label}:</span>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => onViewDetails(sub)}
                  style={{
                    width: '100%', padding: '7px 12px',
                    background: '#1d4ed8', color: '#fff',
                    border: 'none', borderRadius: '7px',
                    fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#1e40af')}
                  onMouseOut={e => (e.currentTarget.style.background = '#1d4ed8')}
                >
                  View Full Details & AI Support →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};
