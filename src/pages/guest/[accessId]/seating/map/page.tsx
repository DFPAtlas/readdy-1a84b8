import { Link, useParams } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { GuestSafeMapData } from '@/types/access';

// ── Simple guest-safe room map ──

function GuestRoomMap({ mapData, guestTableId }: { mapData: GuestSafeMapData; guestTableId: string }) {
  const w = mapData.canvas_width;
  const h = mapData.canvas_height;
  const scale = Math.min(900 / w, 600 / h, 1);
  const scaledW = Math.round(w * scale);
  const scaledH = Math.round(h * scale);

  return (
    <div className="relative w-full border border-secondary-200 rounded-xl overflow-hidden bg-background-50" style={{ aspectRatio: `${scaledW}/${scaledH}` }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-full"
        aria-label="Room map showing table positions"
        role="img"
      >
        {/* Background */}
        {mapData.background_asset?.signed_url && (
          <image
            href={mapData.background_asset.signed_url}
            x={mapData.background_asset.x_position || 0}
            y={mapData.background_asset.y_position || 0}
            width={mapData.background_asset.width || w}
            height={mapData.background_asset.height || h}
            opacity={mapData.background_asset.opacity || 0.3}
          />
        )}

        {/* Zones */}
        {mapData.zones.map((zone) => (
          <rect
            key={zone.id}
            x={0}
            y={0}
            width={w}
            height={h}
            fill="none"
            stroke="#d4b896"
            strokeWidth="1"
            strokeDasharray="8 4"
            opacity={0.4}
          />
        ))}

        {/* Room objects */}
        {mapData.room_objects.map((obj) => {
          const isEntrance = obj.object_type === 'entrance' || obj.name?.toLowerCase().includes('entrance');
          const isAccessible = obj.object_type === 'accessible_entrance' || obj.name?.toLowerCase().includes('accessible');
          const isStage = obj.object_type === 'stage' || obj.name?.toLowerCase().includes('stage');
          const isBar = obj.object_type === 'bar' || obj.name?.toLowerCase().includes('bar');
          const isDanceFloor = obj.object_type === 'dance_floor' || obj.name?.toLowerCase().includes('dance');
          const isToilet = obj.object_type === 'toilet' || obj.name?.toLowerCase().includes('toilet');

          let fill = '#f0ebe3';
          let label = '';

          if (isEntrance) { fill = '#e8d5d5'; label = 'Entrance'; }
          else if (isAccessible) { fill = '#d4e8d4'; label = 'Accessible Entrance'; }
          else if (isStage) { fill = '#e8e0d5'; label = 'Stage'; }
          else if (isBar) { fill = '#d5e0e8'; label = 'Bar'; }
          else if (isDanceFloor) { fill = '#e8d5e0'; label = 'Dance Floor'; }
          else if (isToilet) { fill = '#d5d5e0'; label = 'Toilets'; }

          return (
            <g key={obj.id}>
              <rect
                x={obj.x_position}
                y={obj.y_position}
                width={obj.width}
                height={obj.height}
                rx={isEntrance || isAccessible ? 0 : 4}
                fill={fill}
                stroke="#d4b896"
                strokeWidth="1"
                opacity={obj.visible === false ? 0 : 0.7}
                transform={obj.rotation ? `rotate(${obj.rotation} ${obj.x_position + obj.width / 2} ${obj.y_position + obj.height / 2})` : undefined}
              />
              {label && (
                <text
                  x={obj.x_position + obj.width / 2}
                  y={obj.y_position + obj.height / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px]"
                  fill="#7a6b6b"
                  fontFamily="var(--font-label, sans-serif)"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {/* Tables */}
        {mapData.tables.map((t) => {
          const isGuestTable = t.id === guestTableId;
          let fill = isGuestTable ? '#d4a88c' : (t.colour || '#e8d5d5');
          const stroke = isGuestTable ? '#b8765a' : '#d4b896';
          const strokeWidth = isGuestTable ? 3 : 1;

          if (t.shape === 'round' || t.shape === 'oval') {
            const rx = t.width / 2;
            const ry = t.shape === 'oval' ? t.height / 2 : t.width / 2;
            const cx = t.position_x + rx;
            const cy = t.position_y + ry;

            return (
              <g key={t.id}>
                <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={0.8} />
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-xs font-bold"
                  fill={isGuestTable ? '#5c3d3d' : '#7a6b6b'}
                  fontFamily="var(--font-heading, serif)"
                >
                  {t.table_number || t.name.charAt(0)}
                </text>
              </g>
            );
          }

          // Rectangular / default
          return (
            <g key={t.id}>
              <rect
                x={t.position_x}
                y={t.position_y}
                width={t.width}
                height={t.height}
                rx="4"
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={0.8}
                transform={t.rotation ? `rotate(${t.rotation} ${t.position_x + t.width / 2} ${t.position_y + t.height / 2})` : undefined}
              />
              <text
                x={t.position_x + t.width / 2}
                y={t.position_y + t.height / 2 + 1}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-xs font-bold"
                fill={isGuestTable ? '#5c3d3d' : '#7a6b6b'}
                fontFamily="var(--font-heading, serif)"
              >
                {t.table_number || t.name.charAt(0)}
              </text>
            </g>
          );
        })}

        {/* Entrance route */}
        {mapData.entrance_route && (
          <line
            x1={mapData.entrance_route.entrance_x}
            y1={mapData.entrance_route.entrance_y}
            x2={mapData.entrance_route.table_x}
            y2={mapData.entrance_route.table_y}
            stroke="#d4a88c"
            strokeWidth="2"
            strokeDasharray="6 3"
            opacity={0.6}
          />
        )}
      </svg>
    </div>
  );
}

// ── Structured text alternative ──

function MapTextAlternative({ mapData, guestTableId, tableName }: { mapData: GuestSafeMapData; guestTableId: string; tableName: string }) {
  const guestTable = mapData.tables.find((t) => t.id === guestTableId);
  const tables = mapData.tables;
  const roomObjects = mapData.room_objects.filter((o) => o.visible !== false);
  const route = mapData.entrance_route;

  return (
    <div className="sr-only" aria-live="polite">
      <h2>Room map text description</h2>
      <p>The room contains {tables.length} tables. Your table, {tableName}, is highlighted.</p>
      {guestTable && (
        <p>
          {tableName} is a {guestTable.shape} table with capacity for {guestTable.capacity} guests.
          {guestTable.zone ? ` It is located in the ${guestTable.zone} zone.` : ''}
        </p>
      )}
      {roomObjects.length > 0 && (
        <p>Room features: {roomObjects.map((o) => o.name).join(', ')}.</p>
      )}
      {route && (
        <p>From the {route.entrance_name}, head toward {tableName}.{route.written_directions}</p>
      )}
    </div>
  );
}

export default function GuestSeatingMapPage() {
  const { accessId } = useParams<{ accessId: string }>();
  const { data, loading, error } = useGuestPortal();
  const basePath = `/guest/${accessId}`;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
          <i className="ri-loader-4-line animate-spin text-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || 'Could not load the room map.'}</p>
      </div>
    );
  }

  const seating = data.seating;

  if (!seating || !seating.table) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-map-2-line text-2xl" />
        </div>
        <h2 className="font-heading text-lg text-foreground-900 mb-2">Room map not available</h2>
        <p className="text-sm text-foreground-500 mb-4">Your seating assignment hasn&rsquo;t been published yet, so the room map is not currently available.</p>
        <Link to={`${basePath}/seating`} className="inline-flex items-center gap-1.5 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to seating
        </Link>
      </div>
    );
  }

  const table = seating.table;
  const mapData = seating.map_data;
  const lookup = seating.lookup_settings;
  const tableLabel = table.table_number ? `Table ${table.table_number}` : table.name;
  const route = mapData?.entrance_route;

  // ── Map hidden ──
  if (!lookup.show_room_map || !mapData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Room map</h1>
          <p className="text-sm text-foreground-500">A visual guide to the reception room</p>
        </div>

        <div className="card-default text-center py-14">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-5">
            <i className="ri-map-pin-user-line text-2xl" />
          </div>
          <h2 className="font-heading text-xl text-foreground-900 mb-3">Room map not available</h2>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto leading-relaxed">
            The room map isn&rsquo;t available right now. Please check back closer to the wedding, or refer to the printed seating chart on the day.
          </p>
          <p className="text-sm text-foreground-600 font-medium mt-4">
            Your table: {tableLabel}
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to={`${basePath}/seating`} className="inline-flex items-center gap-1.5 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line" /> Back to seating
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Back links */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={`${basePath}/seating`} className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to seating
        </Link>
        <Link to={`${basePath}/seating/table`} className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">
          View table details
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Room map</h1>
        <p className="text-sm text-foreground-500">
          Your table ({tableLabel}) is highlighted below
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground-600 font-label">
          <span className="w-3 h-3 rounded-sm bg-[#d4a88c] border border-[#b8765a]" />
          Your table
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground-600 font-label">
          <span className="w-3 h-3 rounded-sm bg-[#e8d5d5] border border-[#d4b896]" />
          Other tables
        </span>
        {mapData.room_objects.some((o) => o.object_type === 'entrance') && (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground-600 font-label">
            <span className="w-3 h-3 rounded-sm bg-[#e8d5d5] border border-[#d4b896]" />
            Entrance
          </span>
        )}
        {mapData.room_objects.some((o) => o.object_type === 'stage') && (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground-600 font-label">
            <span className="w-3 h-3 rounded-sm bg-[#e8e0d5] border border-[#d4b896]" />
            Stage
          </span>
        )}
        {mapData.room_objects.some((o) => o.object_type === 'bar') && (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground-600 font-label">
            <span className="w-3 h-3 rounded-sm bg-[#d5e0e8] border border-[#d4b896]" />
            Bar
          </span>
        )}
        {mapData.room_objects.some((o) => o.object_type === 'dance_floor') && (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground-600 font-label">
            <span className="w-3 h-3 rounded-sm bg-[#e8d5e0] border border-[#d4b896]" />
            Dance floor
          </span>
        )}
        {mapData.room_objects.some((o) => o.object_type === 'toilet') && (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground-600 font-label">
            <span className="w-3 h-3 rounded-sm bg-[#d5d5e0] border border-[#d4b896]" />
            Toilets
          </span>
        )}
      </div>

      {/* Map */}
      <GuestRoomMap mapData={mapData} guestTableId={table.id} />

      {/* Text alternative */}
      <MapTextAlternative mapData={mapData} guestTableId={table.id} tableName={tableLabel} />

      {/* Entrance route directions */}
      {route && (
        <div className="card-default mt-6 px-6 py-5">
          <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-signpost-line text-sm" />
            </div>
            Finding your table
          </h3>
          <p className="text-sm text-foreground-600 leading-relaxed">
            From the <strong>{route.entrance_name}</strong>, you&rsquo;ll find {tableLabel} indicated on the map above.
          </p>
          {route.written_directions && (
            <p className="text-sm text-foreground-600 leading-relaxed mt-2">{route.written_directions}</p>
          )}
          {route.accessible_route && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <i className="ri-wheelchair-line" /> An accessible route is available
            </p>
          )}
        </div>
      )}

      {/* Table list (text alternative for keyboard users) */}
      <div className="card-default mt-6 px-6 py-5">
        <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-list-check-3 text-sm" />
          </div>
          Table list
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {mapData.tables.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                t.id === table.id
                  ? 'bg-primary-50 border border-primary-200 font-medium text-foreground-900'
                  : 'bg-background-50 border border-secondary-100 text-foreground-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.id === table.id ? 'bg-primary-500' : 'bg-secondary-300'}`} />
              <span className="truncate">{t.table_number ? `Table ${t.table_number}` : t.name}</span>
              {t.id === table.id && (
                <span className="text-[10px] text-primary-600 font-label ml-auto whitespace-nowrap">You</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Room features */}
      {mapData.room_objects.length > 0 && (
        <div className="card-default mt-6 px-6 py-5">
          <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-building-4-line text-sm" />
            </div>
            Room features
          </h3>
          <div className="flex flex-wrap gap-2">
            {mapData.room_objects.filter((o) => o.visible !== false).map((obj) => (
              <span key={obj.id} className="px-3 py-1.5 rounded-full bg-background-50 border border-secondary-200 text-xs text-foreground-600 font-label">
                {obj.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}