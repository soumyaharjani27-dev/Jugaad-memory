// High-fidelity SVG schematics for appliance components in repair workshops

export const SAMPLE_IMAGES = {
  SAMSUNG_VALVE: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#242B35"/>
      <rect x="20" y="20" width="560" height="410" rx="8" fill="#1C2128" stroke="#374151" stroke-width="2"/>
      
      <!-- Washing Machine Rear Cabinet -->
      <path d="M 60 70 L 540 70 L 540 390 L 60 390 Z" fill="#2F3642" stroke="#4B5563" stroke-width="3"/>
      <text x="75" y="100" fill="#9CA3AF" font-family="sans-serif" font-size="14" font-weight="bold">SAMSUNG DIAMOND DRUM - REAR PANEL (WATER INTAKE)</text>
      
      <!-- Water Inlet Valve Assembly -->
      <rect x="330" y="80" width="160" height="130" rx="6" fill="#3D4554" stroke="#60A5FA" stroke-width="2"/>
      <circle cx="390" cy="130" r="34" fill="#1E293B" stroke="#93C5FD" stroke-width="3"/>
      
      <!-- Threaded Brass / Plastic Collar -->
      <circle cx="390" cy="130" r="24" fill="#3B82F6" opacity="0.3"/>
      <!-- Mesh Filter Screen inside -->
      <circle cx="390" cy="130" r="16" fill="#F59E0B" stroke="#D97706" stroke-dasharray="2 2" stroke-width="2"/>
      <path d="M 374 130 L 406 130 M 390 114 L 390 146" stroke="#FEF3C7" stroke-width="1.5"/>
      <text x="390" y="172" fill="#FCD34D" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">CALCIUM MESH FILTER</text>
      
      <!-- Solenoid Coils -->
      <rect x="430" y="105" width="45" height="50" rx="4" fill="#475569" stroke="#94A3B8"/>
      <line x1="475" y1="120" x2="510" y2="120" stroke="#F87171" stroke-width="3"/>
      <line x1="475" y1="140" x2="510" y2="140" stroke="#60A5FA" stroke-width="3"/>
      <text x="515" y="134" fill="#E2E8F0" font-family="monospace" font-size="11">220V AC COIL</text>
      
      <!-- Cold Water Hose Connection -->
      <path d="M 300 130 L 356 130" stroke="#38BDF8" stroke-width="14" stroke-linecap="round"/>
      <text x="210" y="135" fill="#38BDF8" font-family="sans-serif" font-size="12" font-weight="bold">COLD WATER HOSE →</text>
      
      <!-- Power Cable & Ground -->
      <path d="M 120 300 L 120 390" stroke="#EAB308" stroke-width="8" stroke-dasharray="10 5"/>
      <text x="140" y="350" fill="#EAB308" font-family="sans-serif" font-size="12">Mains Earth Ground</text>

      <!-- Drum Motor Section Below -->
      <rect x="180" y="240" width="240" height="120" rx="10" fill="#1F2937" stroke="#4B5563" stroke-width="2"/>
      <circle cx="300" cy="300" r="40" fill="#374151" stroke="#6B7280" stroke-width="3"/>
      <text x="300" y="305" fill="#9CA3AF" font-family="sans-serif" font-size="12" text-anchor="middle">Direct Inverter Drive</text>
    </svg>
  `) }`,

  WHIRLPOOL_MOTOR: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#242B35"/>
      <rect x="20" y="20" width="560" height="410" rx="8" fill="#1A202C" stroke="#4A5568" stroke-width="2"/>
      
      <text x="40" y="60" fill="#E2E8F0" font-family="sans-serif" font-size="14" font-weight="bold">WHIRLPOOL FRONT LOAD - LOWER MOTOR BRACKET</text>
      <text x="40" y="80" fill="#94A3B8" font-family="sans-serif" font-size="12">Under Tub Inspection View (Rear Service Cover Removed)</text>

      <!-- Washing Tub Base -->
      <path d="M 80 100 Q 300 160 520 100" fill="none" stroke="#64748B" stroke-width="6"/>
      <text x="300" y="135" fill="#94A3B8" font-family="sans-serif" font-size="12" text-anchor="middle">Outer Tub Polypropylene Casing</text>

      <!-- Main Motor Casing -->
      <rect x="160" y="180" width="280" height="170" rx="16" fill="#2D3748" stroke="#4A5568" stroke-width="3"/>
      <circle cx="230" cy="265" r="45" fill="#1A202C" stroke="#718096" stroke-width="4"/>
      <circle cx="230" cy="265" r="18" fill="#A0AEC0"/>

      <!-- Stator Windings -->
      <circle cx="230" cy="265" r="32" stroke="#ED8936" stroke-width="4" stroke-dasharray="4 4" fill="none"/>
      <text x="230" y="325" fill="#CBD5E0" font-family="sans-serif" font-size="11" text-anchor="middle">Motor Armature / Tacho</text>

      <!-- The Critical 6-Pin Wiring Harness Connector -->
      <rect x="340" y="235" width="85" height="60" rx="4" fill="#D97706" stroke="#F59E0B" stroke-width="2"/>
      <!-- Individual Pins -->
      <circle cx="355" cy="255" r="4" fill="#FEF3C7"/>
      <circle cx="370" cy="255" r="4" fill="#FEF3C7"/>
      <circle cx="385" cy="255" r="4" fill="#FEF3C7"/>
      <circle cx="355" cy="275" r="4" fill="#FEF3C7"/>
      <circle cx="370" cy="275" r="4" fill="#FEF3C7"/>
      <circle cx="385" cy="275" r="4" fill="#FEF3C7"/>

      <line x1="425" y1="265" x2="520" y2="265" stroke="#FBBF24" stroke-width="6"/>
      <text x="440" y="245" fill="#FCD34D" font-family="sans-serif" font-size="11" font-weight="bold">6-PIN CLIP</text>
      <text x="440" y="300" fill="#CBD5E0" font-family="sans-serif" font-size="10">To PCB Relay</text>

      <!-- Drive Belt -->
      <path d="M 230 265 L 120 180" stroke="#1A202C" stroke-width="12"/>
      <text x="110" y="220" fill="#718096" font-family="sans-serif" font-size="11">Ribbed Drive Belt</text>
    </svg>
  `) }`,

  LG_DRAIN_FILTER: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#242B35"/>
      <rect x="20" y="20" width="560" height="410" rx="8" fill="#1E293B" stroke="#334155" stroke-width="2"/>
      
      <text x="40" y="55" fill="#F1F5F9" font-family="sans-serif" font-size="14" font-weight="bold">LG DIRECT DRIVE - FRONT BOTTOM DRAIN ASSEMBLY</text>
      <text x="40" y="75" fill="#94A3B8" font-family="sans-serif" font-size="12">Emergency Drain & Coin Trap Service Chamber (Hatch Open)</text>

      <!-- Washing Machine Front Lower Trim -->
      <rect x="50" y="100" width="500" height="280" rx="6" fill="#0F172A" stroke="#334155" stroke-width="3"/>
      
      <!-- Open Service Flap -->
      <rect x="360" y="130" width="170" height="220" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="3"/>
      <text x="445" y="160" fill="#34D399" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">COIN TRAP CHAMBER</text>

      <!-- Coin Filter Knob & Impeller Chamber -->
      <circle cx="445" cy="245" r="50" fill="#0284C7" stroke="#38BDF8" stroke-width="3"/>
      <rect x="425" y="220" width="40" height="50" rx="4" fill="#0369A1"/>
      <line x1="445" y1="210" x2="445" y2="280" stroke="#BAE6FD" stroke-width="5" stroke-linecap="round"/>
      
      <!-- Jammed Coin / Pin representation -->
      <circle cx="470" cy="235" r="10" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
      <text x="470" y="239" fill="#FFFFFF" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">₹5</text>
      
      <text x="445" y="320" fill="#E2E8F0" font-family="sans-serif" font-size="11" text-anchor="middle">Turn Left ↺ to Unscrew</text>

      <!-- Emergency Drain Rubber Hose -->
      <rect x="385" y="180" width="18" height="60" rx="4" fill="#111827" stroke="#475569"/>
      <circle cx="394" cy="240" r="7" fill="#EF4444"/>
      <text x="340" y="210" fill="#F87171" font-family="sans-serif" font-size="10">Rubber Hose Plug</text>

      <!-- Main Wash Tub Drain Sump Section -->
      <circle cx="180" cy="240" r="70" fill="#1E293B" stroke="#475569" stroke-width="4"/>
      <text x="180" y="245" fill="#94A3B8" font-family="sans-serif" font-size="12" text-anchor="middle">Wash Tub Sump</text>
      <path d="M 250 240 L 360 245" stroke="#334155" stroke-width="18"/>
    </svg>
  `) }`,

  BOSCH_PUMP: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#242B35"/>
      <rect x="20" y="20" width="560" height="410" rx="8" fill="#1B2430" stroke="#3B4856" stroke-width="2"/>
      <text x="40" y="55" fill="#F8FAFC" font-family="sans-serif" font-size="14" font-weight="bold">BOSCH SERIE 4 - DRAIN SUMP & ECO-BALL CHAMBER</text>
      <text x="40" y="75" fill="#94A3B8" font-family="sans-serif" font-size="12">Lower Tub Base (E18 Drain Timeout Inspection)</text>

      <!-- Outer Tub Drain Outlet -->
      <path d="M 120 100 L 260 100 L 230 180 L 150 180 Z" fill="#334155" stroke="#64748B" stroke-width="3"/>
      
      <!-- Corrugated Accordion Sump Hose -->
      <path d="M 190 180 Q 200 240 280 260" fill="none" stroke="#0F172A" stroke-width="42" stroke-linecap="round"/>
      <path d="M 190 180 Q 200 240 280 260" fill="none" stroke="#475569" stroke-width="38" stroke-dasharray="6 4" stroke-linecap="round"/>

      <!-- Eco-Ball Inside Hose -->
      <circle cx="215" cy="225" r="16" fill="#F1F5F9" stroke="#94A3B8" stroke-width="2"/>
      <text x="215" y="229" fill="#0F172A" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">BALL</text>

      <!-- Drain Pump Motor Housing -->
      <rect x="280" y="220" width="190" height="130" rx="8" fill="#334155" stroke="#38BDF8" stroke-width="2"/>
      <circle cx="340" cy="285" r="38" fill="#0284C7" stroke="#7DD3FC" stroke-width="3"/>
      <!-- Impeller 3-blade -->
      <line x1="340" y1="285" x2="340" y2="255" stroke="#FFFFFF" stroke-width="4"/>
      <line x1="340" y1="285" x2="365" y2="300" stroke="#FFFFFF" stroke-width="4"/>
      <line x1="340" y1="285" x2="315" y2="300" stroke="#FFFFFF" stroke-width="4"/>

      <!-- Sludge buildup indicator -->
      <path d="M 235 245 Q 260 270 290 265" stroke="#B45309" stroke-width="12" stroke-linecap="round" opacity="0.8"/>
      <text x="240" y="320" fill="#FBBF24" font-family="sans-serif" font-size="11" font-weight="bold">DETERGENT SLUDGE</text>
      
      <!-- Drain Outlet Pipe to waste -->
      <path d="M 440 260 L 530 220" stroke="#64748B" stroke-width="16" stroke-linecap="round"/>
      <text x="460" y="200" fill="#94A3B8" font-family="sans-serif" font-size="11">Drain Hose Out →</text>
    </svg>
  `) }`,

  CONTROL_PANEL: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#1E232A"/>
      <rect x="20" y="40" width="560" height="370" rx="12" fill="#2A303C" stroke="#3E4756" stroke-width="3"/>
      
      <!-- Panel Header & Brand -->
      <text x="60" y="85" fill="#E2E8F0" font-family="sans-serif" font-size="18" font-weight="bold" letter-spacing="1">SAMSUNG</text>
      <text x="175" y="85" fill="#94A3B8" font-family="sans-serif" font-size="13">EcoBubble / Digital Inverter</text>

      <!-- Digital 7-Segment LED Error Display -->
      <rect x="360" y="65" width="170" height="80" rx="8" fill="#0A0D12" stroke="#EF4444" stroke-width="2"/>
      <text x="445" y="125" fill="#EF4444" font-family="monospace" font-size="48" font-weight="bold" text-anchor="middle" letter-spacing="4">4C</text>
      
      <circle cx="380" cy="85" r="4" fill="#10B981"/>
      <circle cx="380" cy="100" r="4" fill="#3B82F6"/>
      <circle cx="380" cy="115" r="4" fill="#F59E0B"/>
      <text x="390" y="88" fill="#9CA3AF" font-family="sans-serif" font-size="9">WASH</text>
      <text x="390" y="103" fill="#9CA3AF" font-family="sans-serif" font-size="9">RINSE</text>
      <text x="390" y="118" fill="#EF4444" font-family="sans-serif" font-size="9">CHECK TAP</text>

      <!-- Rotary Cycle Selector Knob -->
      <circle cx="160" cy="240" r="65" fill="#1E2430" stroke="#64748B" stroke-width="5"/>
      <circle cx="160" cy="240" r="50" fill="#334155" stroke="#94A3B8" stroke-width="2"/>
      <line x1="160" y1="240" x2="160" y2="195" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
      <circle cx="160" cy="195" r="3" fill="#38BDF8"/>
      
      <text x="160" y="165" fill="#E2E8F0" font-family="sans-serif" font-size="11" text-anchor="middle">Daily Wash</text>
      <text x="240" y="245" fill="#94A3B8" font-family="sans-serif" font-size="11">Cotton</text>
      <text x="80" y="245" fill="#94A3B8" font-family="sans-serif" font-size="11">Spin</text>

      <!-- Control Buttons -->
      <rect x="300" y="190" width="80" height="40" rx="6" fill="#374151" stroke="#4B5563"/>
      <text x="340" y="215" fill="#E5E7EB" font-family="sans-serif" font-size="12" text-anchor="middle">Temp</text>

      <rect x="400" y="190" width="80" height="40" rx="6" fill="#374151" stroke="#4B5563"/>
      <text x="440" y="215" fill="#E5E7EB" font-family="sans-serif" font-size="12" text-anchor="middle">Rinse</text>

      <!-- Start / Pause Button -->
      <rect x="340" y="260" width="140" height="55" rx="8" fill="#059669" stroke="#10B981" stroke-width="2"/>
      <text x="410" y="294" fill="#FFFFFF" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">▶‖ START / PAUSE</text>
      
      <!-- Warning Note at Bottom -->
      <text x="60" y="375" fill="#F59E0B" font-family="sans-serif" font-size="12">⚠️ Beeps continuously · Water intake timeout reached</text>
    </svg>
  `) }`,

  IPHONE_BATTERY: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#0F172A"/>
      <!-- iPhone Outer Chassis -->
      <rect x="180" y="30" width="240" height="390" rx="36" fill="#1E293B" stroke="#475569" stroke-width="4"/>
      <!-- Screen Bezel -->
      <rect x="195" y="45" width="210" height="360" rx="26" fill="#000000"/>
      <!-- Dynamic Island / Top Notch -->
      <rect x="260" y="55" width="80" height="20" rx="10" fill="#1E293B"/>
      <!-- Battery Warning Icon -->
      <rect x="270" y="140" width="60" height="30" rx="6" fill="none" stroke="#EF4444" stroke-width="3"/>
      <rect x="330" y="150" width="4" height="10" rx="2" fill="#EF4444"/>
      <rect x="275" y="145" width="15" height="20" rx="3" fill="#EF4444"/>
      <!-- Text on screen -->
      <text x="300" y="210" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">Battery Service</text>
      <text x="300" y="235" fill="#94A3B8" font-family="-apple-system, sans-serif" font-size="12" text-anchor="middle">Important Battery Message</text>
      <text x="300" y="260" fill="#EF4444" font-family="-apple-system, sans-serif" font-size="11" text-anchor="middle">Service Recommended (74% Health)</text>
      <text x="300" y="300" fill="#38BDF8" font-family="-apple-system, sans-serif" font-size="12" font-weight="500" text-anchor="middle">iPhone 16 Pro · iOS 18</text>
      <text x="300" y="370" fill="#10B981" font-family="sans-serif" font-size="10" text-anchor="middle">✓ Supported Device · Workshop Memory</text>
    </svg>
  `) }`,

  LAPTOP_CHARGING: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#0F172A"/>
      <!-- Laptop Base / Lower Chassis -->
      <path d="M 60 220 L 540 220 L 500 410 L 100 410 Z" fill="#1E293B" stroke="#475569" stroke-width="3"/>
      <!-- Screen Lid open at angle -->
      <path d="M 100 50 L 500 50 L 540 220 L 60 220 Z" fill="#0F172A" stroke="#334155" stroke-width="3"/>
      <rect x="120" y="70" width="360" height="130" rx="4" fill="#020617"/>
      <text x="300" y="140" fill="#94A3B8" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">DELL INSPIRON 15 — POWER INLET</text>
      <text x="300" y="165" fill="#EF4444" font-family="sans-serif" font-size="11" text-anchor="middle">⚠️ Battery Not Charging · Amber LED Flashing</text>

      <!-- Keyboard area -->
      <rect x="140" y="240" width="320" height="110" rx="6" fill="#0F172A" stroke="#334155"/>
      <!-- DC Power Jack side view -->
      <rect x="55" y="235" width="25" height="40" rx="4" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
      <circle cx="67" cy="255" r="5" fill="#1E293B" stroke="#FFFFFF" stroke-width="1.5"/>
      <text x="75" y="225" fill="#F59E0B" font-family="monospace" font-size="11" font-weight="bold">DC POWER JACK</text>
      <line x1="75" y1="240" x2="130" y2="215" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="3 3"/>

      <!-- LED Indicator -->
      <circle cx="95" cy="255" r="4" fill="#F59E0B" stroke="#FEF3C7"/>
      <text x="105" y="259" fill="#94A3B8" font-family="sans-serif" font-size="9">Charge LED</text>

      <!-- Trackpad -->
      <rect x="240" y="360" width="120" height="40" rx="4" fill="#0F172A" stroke="#334155"/>
    </svg>
  `) }`,

  REFRIGERATOR_DEFROST: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#1E293B"/>
      <!-- Refrigerator Freezer Compartment -->
      <rect x="80" y="30" width="440" height="390" rx="12" fill="#0F172A" stroke="#475569" stroke-width="3"/>
      <text x="100" y="65" fill="#94A3B8" font-family="sans-serif" font-size="13" font-weight="bold">LG INVERTER NO-FROST — EVAPORATOR SECTION</text>

      <!-- Evaporator Aluminum Coils with Frost -->
      <g stroke="#38BDF8" stroke-width="8" stroke-linecap="round" fill="none">
        <path d="M 140 120 L 460 120 L 460 160 L 140 160 L 140 200 L 460 200 L 460 240 L 140 240 L 140 280 L 460 280" />
      </g>
      <!-- Heavy Frost Clumps -->
      <circle cx="200" cy="140" r="14" fill="#E0F2FE" opacity="0.8"/>
      <circle cx="340" cy="180" r="16" fill="#E0F2FE" opacity="0.8"/>
      <circle cx="260" cy="220" r="15" fill="#E0F2FE" opacity="0.8"/>
      <circle cx="420" cy="260" r="16" fill="#E0F2FE" opacity="0.8"/>
      <text x="300" y="165" fill="#0284C7" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">EXCESSIVE ICE / FROST BUILDUP</text>

      <!-- Defrost Bimetal Thermostat Sensor -->
      <rect x="430" y="95" width="45" height="30" rx="6" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
      <text x="452" y="114" fill="#1E293B" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">BIMETAL</text>
      <text x="430" y="85" fill="#F59E0B" font-family="sans-serif" font-size="10" font-weight="bold">Defrost Sensor</text>

      <!-- Defrost Glass Tube Heater below -->
      <rect x="130" y="320" width="340" height="20" rx="4" fill="#334155" stroke="#F97316" stroke-width="2"/>
      <text x="300" y="335" fill="#F97316" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Defrost Heater Element (Glass Tube)</text>

      <text x="300" y="390" fill="#94A3B8" font-family="sans-serif" font-size="11" text-anchor="middle">Freezer Cold (-18°C) but Lower Refrigerator Cabinet Warm (18°C)</text>
    </svg>
  `) }`,

  ELECTRONIC_PCB: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
      <rect width="600" height="450" fill="#064E3B"/>
      <!-- PCB Substrate -->
      <rect x="40" y="30" width="520" height="390" rx="10" fill="#047857" stroke="#10B981" stroke-width="3"/>
      <!-- Copper traces -->
      <path d="M 60 80 L 180 80 L 220 120 L 340 120 M 120 160 L 280 160 L 320 200 M 80 240 L 160 240 L 200 320 L 460 320" stroke="#059669" stroke-width="3" fill="none"/>
      <!-- Microcontroller / IC -->
      <rect x="220" y="160" width="120" height="100" rx="4" fill="#0F172A" stroke="#475569" stroke-width="2"/>
      <circle cx="235" cy="175" r="4" fill="#94A3B8"/>
      <text x="280" y="215" fill="#E2E8F0" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">MCU / SOC</text>
      <!-- SMD Capacitors & Resistors -->
      <rect x="120" y="90" width="24" height="12" fill="#D97706" rx="2"/>
      <rect x="160" y="90" width="20" height="10" fill="#64748B" rx="1"/>
      <rect x="360" y="130" width="28" height="14" fill="#D97706" rx="2"/>
      <!-- Power Rail Capacitors -->
      <circle cx="440" cy="180" r="22" fill="#1E293B" stroke="#CBD5E1" stroke-width="2"/>
      <text x="440" y="184" fill="#F8FAFC" font-family="monospace" font-size="9" text-anchor="middle">470μF</text>
      <circle cx="440" cy="240" r="22" fill="#1E293B" stroke="#CBD5E1" stroke-width="2"/>
      <text x="440" y="244" fill="#F8FAFC" font-family="monospace" font-size="9" text-anchor="middle">470μF</text>
      <!-- Header Pins -->
      <rect x="60" y="340" width="140" height="30" fill="#18181B" stroke="#71717A"/>
      <circle cx="80" cy="355" r="4" fill="#F59E0B"/>
      <circle cx="100" cy="355" r="4" fill="#F59E0B"/>
      <circle cx="120" cy="355" r="4" fill="#F59E0B"/>
      <circle cx="140" cy="355" r="4" fill="#F59E0B"/>
      <circle cx="160" cy="355" r="4" fill="#F59E0B"/>
      <circle cx="180" cy="355" r="4" fill="#F59E0B"/>
      <text x="300" y="65" fill="#A7F3D0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">ELECTRONIC CONTROL BOARD / CONTROLLER PCB</text>
      <text x="300" y="405" fill="#6EE7B7" font-family="sans-serif" font-size="11" text-anchor="middle">Awaiting symptom description from technician</text>
    </svg>
  `) }`,
};
