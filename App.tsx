/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Sun, 
  Settings, 
  HelpCircle, 
  Wind, 
  Activity, 
  Info, 
  TrendingUp, 
  Sliders, 
  RefreshCw,
  Award,
  Clock,
  Battery,
  ShieldCheck,
  AlertCircle,
  Download,
  Printer,
  FileSpreadsheet,
  ToggleLeft,
  ChevronRight,
  Gauge,
  Droplets,
  Zap,
  BookOpen
} from 'lucide-react';
import { 
  COOLER_MODELS, 
  calculateOperatingState, 
  getIrradianceForTime,
  calculateMinIrradianceForFullSpeed,
  TIME_IRRADIANCE_PROFILE
} from './utils/solarCalculations';
import { CoolerVisualizer } from './components/CoolerVisualizer';
import { SizingCharts } from './components/SizingCharts';
import { SizingDiagnostics } from './components/SizingDiagnostics';
import { SizingAnalytics } from './components/SizingAnalytics';
import { BatteryBufferSimulation } from './components/BatteryBufferSimulation';

export default function App() {
  // Page routing
  const [currentPage, setCurrentPage] = useState<'calculator' | 'battery'>('calculator');

  // 1. Cooler Selection
  const [selectedCoolerId, setSelectedCoolerId] = useState<string>('14-inch');
  
  // 2. Solar Panel Wattage Input
  const [panelWattage, setPanelWattage] = useState<number>(100);
  
  // 3. Irradiance state and active tracker
  const [irradiancePercent, setIrradiancePercent] = useState<number>(85);
  
  // 4. Time simulation tracker (6 am to 6 pm)
  const [simulatedHour, setSimulatedHour] = useState<number>(12); // Defaults to mid-day (12 PM)
  const [isTimeSimActive, setIsTimeSimActive] = useState<boolean>(false);

  // 5. MPPT Efficiency controller (Enabled = 95%, Disabled = 100%)
  const [mpptEnabled, setMpptEnabled] = useState<boolean>(true);
  const mpptEfficiency = useMemo(() => (mpptEnabled ? 0.95 : 1.0), [mpptEnabled]);

  // 6. Report Preview Modal
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // 7. Active Simulation Tracker
  const [isSimulationRun, setIsSimulationRun] = useState<boolean>(true);

  // Active Cooler profile
  const activeCooler = useMemo(() => {
    return COOLER_MODELS.find(m => m.id === selectedCoolerId) || COOLER_MODELS[1];
  }, [selectedCoolerId]);

  // Combined Operational calculation yields
  const calculationResult = useMemo(() => {
    return calculateOperatingState(panelWattage, irradiancePercent, activeCooler.wattage, mpptEfficiency);
  }, [panelWattage, irradiancePercent, activeCooler, mpptEfficiency]);

  // Reset all parameters to initial baseline state
  const resetToFactoryDefaults = () => {
    setSelectedCoolerId('14-inch');
    setPanelWattage(100);
    setIrradiancePercent(85);
    setSimulatedHour(12);
    setIsTimeSimActive(false);
    setMpptEnabled(true);
  };

  // Weather presets to update solar irradiance directly
  const weatherPresets = [
    { label: '☀️ Sunny', value: 100, desc: 'Clear direct sun' },
    { label: '⛅ Partly Cloudy', value: 70, desc: 'Passing high clouds' },
    { label: '☁️ Cloudy', value: 40, desc: 'Overcast skies' },
    { label: '🌫️ Heavy Cloud', value: 20, desc: 'Thick shadow cover' },
    { label: '🌧️ Rainy', value: 10, desc: 'Heavy precipitation' }
  ];

  // Helper arrays
  const panelPresets = [50, 75, 100, 120, 150, 200, 250];

  // Update irradiance of the system when time is changed
  const handleTimeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hourVal = parseInt(e.target.value);
    setSimulatedHour(hourVal);
    setIsTimeSimActive(true);
    // Auto sync irradiance to profile
    const profileIrr = getIrradianceForTime(hourVal);
    setIrradiancePercent(profileIrr);
  };

  // Disable time simulation tracking when manually overriding the irradiance slider
  const handleIrradianceSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIrradiancePercent(parseInt(e.target.value));
    setIsTimeSimActive(false);
  };

  // Convert Hour value (6 - 18) to readable display string
  const formatHourString = (hr: number) => {
    if (hr === 12) return '12:00 PM (Midday)';
    if (hr > 12) return `${hr - 12}:00 PM`;
    return `${hr}:00 AM`;
  };

  // Determine Full-Speed Feasibility Status
  const feasibilityStatus = useMemo(() => {
    const minIrr = calculateMinIrradianceForFullSpeed(panelWattage, activeCooler.wattage, mpptEfficiency);
    if (minIrr === 'unreachable') {
      return {
        label: 'Underpowered (Not Feasible)',
        style: 'bg-rose-50 border-rose-200 text-rose-700',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        desc: `Under-sized: Maximum summer sun (100%) cannot generate the ${activeCooler.wattage}W required load.`
      };
    }
    if (irradiancePercent >= minIrr) {
      return {
        label: 'Active and Stable',
        style: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        desc: `Operating at 100% capacity! Solar harvest is sufficient to run the fan and water pump on full speed.`
      };
    }
    return {
      label: 'Feasible (Requires Sun)',
      style: 'bg-amber-50 border-amber-200 text-amber-700',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      desc: `Available power is in restricted conservation mode. Requires sun levels above ${minIrr}% of irradiance to run full speed.`
    };
  }, [panelWattage, activeCooler, irradiancePercent, mpptEfficiency]);

  // Computes the dynamic engineering summary text
  const engineeringSummaryText = useMemo(() => {
    const minIrr = calculateMinIrradianceForFullSpeed(panelWattage, activeCooler.wattage, mpptEfficiency);
    const irrTerm = minIrr === 'unreachable' 
      ? 'peak 100% irradiance is insufficient (system under-sized)' 
      : `${minIrr}% irradiance`;
    return `Selected ${activeCooler.name} requires ${activeCooler.wattage}W. A ${panelWattage}W panel with ${Math.round(mpptEfficiency * 100)}% MPPT capacity can support full-speed operation above approximately ${irrTerm}. Below this level, the controller transitions dynamically into Normal, Eco, and Low-Power modes to preserve water-dispersive pump motor integrity and maximize direct-PV cooling.`;
  }, [panelWattage, activeCooler, mpptEfficiency]);

  // CSV Report Exporter
  const handleExportCSV = () => {
    const calculated = calculationResult;
    const theorMin = irradiancePercent > 0 ? Math.round(activeCooler.wattage / ((irradiancePercent / 100) * mpptEfficiency)) : 0;
    const recMin = Math.round(theorMin * 1.2);
    
    const rows = [
      ['SOLAR DIRECT MODE SIZING CALCULATOR - REPORT SHEET', ''],
      ['Timestamp Generated', new Date().toLocaleString()],
      ['User Profile Identifier', 'Engineering Export Unit'],
      [],
      ['--- CORE SYSTEM INPUTS ---', ''],
      ['Cooler Model', activeCooler.name],
      ['Cooler Constant Weight Load (Watts)', `${activeCooler.wattage} W`],
      ['Solar Panel Rated Peak (Watts)', `${panelWattage} W`],
      ['MPPT Efficiency Status', mpptEnabled ? 'Enabled (95% scaling factor)' : 'Disabled (100% rating)'],
      ['Simulated Solar Irradiance (%)', `${irradiancePercent}%`],
      ['Source Reference Time of Day', isTimeSimActive ? formatHourString(simulatedHour) : 'Manual Adjustment'],
      [],
      ['--- CONVERSION METRICS ---', ''],
      ['Instant Available Photovoltaic Power (Watts)', `${calculated.availablePower} W`],
      ['Rotor Load Criteria (Watts)', `${calculated.coolerLoad} W`],
      ['System Balance Surplus/Deficit (Watts)', `${calculated.powerBalance} W`],
      ['Mode Recommended', calculated.mode],
      ['Fan Output Speed (%)', `${calculated.fanSpeed}%`],
      ['Dampening Evaporation Pump State', calculated.pumpSpeed],
      ['Load Coverage Ratio (%)', `${calculated.percentageOfLoad}%`],
      [],
      ['--- DIRECT PANEL RE-SIZING GUIDELINES ---', ''],
      ['Theoretical Minimum Solar Capacity (Current Sun)', `${theorMin} W`],
      ['Recommended Panel Size (+20% margin, Current Sun)', `${recMin} W`],
      ['Theoretical Minimum Solar Capacity (Standard Peak Sun)', `${Math.round(activeCooler.wattage / mpptEfficiency)} W`],
      ['Recommended Panel Size at Peak (+20% margin)', `${Math.round((activeCooler.wattage / mpptEfficiency) * 1.2)} W`],
      [],
      ['--- HOURLY SOLAR SIMULATION DICTIONARY (6 AM - 6 PM) ---', ''],
      ['Hour Time', 'Irradiance Percentage (%)', 'Harvest Power (Watts)', 'Operating Control State']
    ];

    // Build values using simulation helper
    for (let hr = 6; hr <= 18; hr++) {
      const pointIrr = getIrradianceForTime(hr);
      const pointResult = calculateOperatingState(panelWattage, pointIrr, activeCooler.wattage, mpptEfficiency);
      const outputTimeLabel = hr === 12 ? '12:00 PM' : hr > 12 ? `${hr - 12}:00 PM` : `${hr}:00 AM`;
      rows.push([
        outputTimeLabel, 
        `${pointIrr}%`, 
        `${pointResult.availablePower} W`, 
        pointResult.mode
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(cell => `"${cell || ''}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Solar_DC_Cooler_Report_${activeCooler.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (currentPage === 'battery') {
    return (
      <BatteryBufferSimulation
        initialPanelWattage={panelWattage}
        initialSelectedCoolerId={selectedCoolerId}
        onBack={() => setCurrentPage('calculator')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 flex flex-col font-sans">
      
      {/* Printable Engineering Report overlay modal if opened */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:static" id="report-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 relative flex flex-col space-y-6 print:shadow-none print:border-none print:max-h-full print:p-0">
            
            {/* Modal header (hidden in print) */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 print:hidden">
              <span className="text-xs uppercase font-extrabold tracking-wide text-slate-400">Solar Direct Sizing Report Preview</span>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 py-1 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Window
              </button>
            </div>

            {/* Printable Area starts */}
            <div className="space-y-6 flex-1 text-slate-900">
              <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-5 gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Solar Direct Mode Sizing Report</h1>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">PV-Motor Sizing Certification • DC Water Coolers</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono text-left max-w-[240px]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Report Attributes</p>
                  <p className="text-xs text-slate-700 font-bold mt-1">Date: 2026-06-02</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Reference State: Stable</p>
                </div>
              </div>

              {/* Grid 1: Parameters Overview */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">1. User Parameter Inputs</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Cooler Model:</span> <span className="font-bold">{activeCooler.name}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Cooler Base Load:</span> <span className="font-mono font-bold">{activeCooler.wattage} W</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Solar Panel Rating:</span> <span className="font-mono font-bold">{panelWattage} W</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">MPPT Controller Efficiency:</span> <span className="font-mono font-bold">{mpptEnabled ? '95% Enabled' : 'Disabled (100% Raw)'}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Irradiance Index:</span> <span className="font-mono font-bold">{irradiancePercent}%</span></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">2. Sizing Math & Diagnostics</h3>
                  <div className="space-y-1.5 text-xs text-slate-800">
                    <div className="flex justify-between"><span className="text-slate-500">Available PV Power:</span> <span className="font-bold text-amber-600 font-mono">{calculationResult.availablePower} W</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Surplus/Deficit Balance:</span> <span className={`font-mono font-bold ${calculationResult.powerBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{calculationResult.powerBalance} W</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Control Mode Yield:</span> <span className="font-bold text-slate-950">{calculationResult.mode}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Fan Operational RPM:</span> <span className="font-mono font-bold">{calculationResult.fanSpeed}% Speed</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Pump Power Level:</span> <span className="font-mono font-bold">{calculationResult.pumpSpeed}</span></div>
                  </div>
                </div>
              </div>

              {/* Narrative Summary */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono mb-2">3. Recommended Sizing Diagnostics</h3>
                <p className="text-xs leading-relaxed text-slate-700">{engineeringSummaryText}</p>
              </div>

              {/* Simulation logs of the day */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono mb-3">4. Daily Micro-Grid Solar Simulation Profile (6:00 AM - 6:00 PM)</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] text-slate-500 uppercase">
                        <th className="py-2 px-3">Time Period</th>
                        <th className="py-2 px-3 text-center">Irradiance (%)</th>
                        <th className="py-2 px-3 text-center">Available Power (W)</th>
                        <th className="py-2 px-3 text-right">Controller Sizing Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[6, 8, 10, 12, 14, 16, 18].map(hr => {
                        const hrIrr = getIrradianceForTime(hr);
                        const hrResult = calculateOperatingState(panelWattage, hrIrr, activeCooler.wattage, mpptEfficiency);
                        const timeStr = hr === 12 ? '12:00 PM' : hr > 12 ? `${hr - 12}:00 PM` : `${hr}:00 AM`;
                        return (
                          <tr key={hr} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium">{timeStr}</td>
                            <td className="py-2 px-3 text-center font-mono">{hrIrr}%</td>
                            <td className="py-2 px-3 text-center font-mono">{hrResult.availablePower} W</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-900">{hrResult.mode}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signature section */}
              <div className="border-t border-slate-200 pt-8 flex justify-between text-[11px] text-slate-400 font-mono">
                <div>Solar direct-drive DC coolers behave natively under PV variation.</div>
                <div>Powered by Antigravity Automation</div>
              </div>

            </div>
            {/* Printable Area ends */}

            {/* Print Modal trigger and cancel buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Trigger Print / PDF Export
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Main Dynamic Solar-themed Top Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white border-b border-indigo-900/60 shadow-md py-4 sm:py-5 px-4 sm:px-6 sticky top-0 z-30 print:hidden" id="navbar">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 p-2 sm:p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
              <Sun className="w-5 h-5 sm:w-6 sm:h-6 animate-[spin_60s_linear_infinite]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-md sm:text-lg font-black tracking-tight text-white leading-none">
                  Solar Direct Mode Sizing Calculator
                </h1>
                <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  DC Air Coolers
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Direct-coupled photovoltaic simulation for off-grid brushless ventilation (Battery-free simulation)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetToFactoryDefaults}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all rounded-xl border border-white/10 flex items-center gap-1.5 cursor-pointer"
              title="Reset configuration settings to defaults"
              id="reset-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all rounded-xl border border-white/10 flex items-center gap-1.5 cursor-pointer"
              id="export-csv-head-btn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              id="export-pdf-head-btn"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8 print:hidden" id="main-content">
        
        {/* Prominent Battery Buffer Simulation Navigation Callout */}
        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-150/60 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs" id="battery-simulation-callout">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-md shadow-indigo-600/10">
              <Battery className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Advanced Transient Power Protection</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                Want to inspect how small Lithium elements stabilize direct motor voltage? Test our high-fidelity direct-PV boost converter simulator with active passing solar clouds.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('battery')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold uppercase tracking-widest hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-2 whitespace-nowrap self-stretch md:self-auto text-center justify-center border border-indigo-700 font-mono"
            id="open-battery-sim-btn"
          >
            Open Battery Buffer Simulation
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Warning Alert on load constraints */}
        <div className={`border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-colors duration-300 ${feasibilityStatus.style}`} id="feasibility-feeder">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {feasibilityStatus.badge.includes('emerald') ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest font-mono">Performance Assessment</p>
              <h4 className="text-sm font-bold mt-0.5">{feasibilityStatus.label}</h4>
              <p className="text-xs text-slate-600 mt-1 leading-normal">{feasibilityStatus.desc}</p>
            </div>
          </div>
          <div>
            <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-extrabold border uppercase tracking-wider ${feasibilityStatus.badge}`}>
              {calculationResult.mode}
            </span>
          </div>
        </div>

        {/* Enhanced Dashboard Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-metric-cards-row">
          
          {/* Panel Wattage Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100/40 text-indigo-600">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">Selected Solar Panel</span>
              <span className="text-lg font-black text-slate-800 font-mono leading-none">{panelWattage} W</span>
              <span className="text-[10px] text-slate-500 block leading-tight mt-1">Rated standard PV</span>
            </div>
          </div>

          {/* Cooler Core Load Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="bg-sky-50 p-3 rounded-xl border border-sky-100/40 text-sky-600">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">Cooler Constant Load</span>
              <span className="text-lg font-black text-rose-500 font-mono leading-none">{activeCooler.wattage} W</span>
              <span className="text-[10px] text-slate-500 block leading-tight mt-1">{activeCooler.size}&quot; Diameter turbine</span>
            </div>
          </div>

          {/* Irradiance Percentage Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100/40 text-amber-500">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">Sun Irradiance Factor</span>
              <span className="text-lg font-black text-amber-600 font-mono leading-none">{irradiancePercent}%</span>
              <span className="text-[10px] text-slate-500 block leading-tight mt-1">
                {isTimeSimActive ? `Time of day: ${simulatedHour}:00` : 'Manual override'}
              </span>
            </div>
          </div>

          {/* Operating Speed Efficiency Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100/40 text-emerald-600">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">Available Solar Power</span>
              <span className="text-lg font-black text-emerald-600 font-mono leading-none">{calculationResult.availablePower} W</span>
              <span className="text-[10px] text-slate-500 block leading-tight mt-1">
                {mpptEnabled ? '95% MPPT Eff. verified' : '100% Direct connected'}
              </span>
            </div>
          </div>

        </div>

        {/* Diagnostic Sizing Summary (Requested dynamic output layout) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden" id="dynamic-summary-strip">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <BookOpen className="w-32 h-32" />
          </div>
          <div className="flex items-start gap-4 z-10 relative">
            <div className="bg-indigo-500/20 text-indigo-300 p-2 rounded-xl border border-indigo-500/30">
              <Award className="w-5 h-5 text-indigo-300" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">Engineering Narrative & Logic Summary</h3>
              <p className="text-sm font-medium text-slate-200 leading-relaxed md:max-w-4xl">
                {engineeringSummaryText}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Feasibility Limit: {calculateMinIrradianceForFullSpeed(panelWattage, activeCooler.wattage, mpptEfficiency) === 'unreachable' ? 'Not feasible at 100%' : `${calculateMinIrradianceForFullSpeed(panelWattage, activeCooler.wattage, mpptEfficiency)}% sun brightness`}
                </span>
                <span>•</span>
                <span>Direct-coupled DC motors skip conversion loss & solar battery storage maintenance costs.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Column */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="controls-panel-container">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-md font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                Calculator Options
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Iterate parameters to size your off-grid hardware setup</p>
            </div>

            {/* Selector: Cooler Model */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                <span>Select DC Cooler Model</span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-mono lowercase">Determines constant load criteria</span>
              </label>
              
              <div className="grid grid-cols-1 gap-2" id="cooler-group-selector">
                {COOLER_MODELS.map((model) => {
                  const isSelected = model.id === selectedCoolerId;
                  return (
                    <button
                      key={model.id}
                      onClick={() => setSelectedCoolerId(model.id)}
                      className={`w-full p-3.5 text-left border rounded-xl transition-all duration-200 flex items-center justify-between relative overflow-hidden cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/10 shadow-xs' 
                          : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-1 h-1 bg-white rounded-full" />}
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                            {model.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">Constant Load: {model.size}&quot; fan</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black font-mono ${isSelected ? 'text-indigo-600' : 'text-slate-700'}`}>
                          {model.wattage} W
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider: Solar Panel Wattage */}
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Solar Panel peak Capacity
                </label>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <input
                    type="number"
                    value={panelWattage}
                    min="10"
                    max="1000"
                    onChange={(e) => setPanelWattage(Math.max(10, parseInt(e.target.value) || 0))}
                    className="w-14 p-1 border border-slate-200 rounded text-center font-bold text-indigo-750 focus:outline-none focus:border-indigo-500 uppercase"
                    id="panel-wattage-input"
                  />
                  <span className="text-[11px] text-slate-400 font-bold">W</span>
                </div>
              </div>

              <input
                type="range"
                min="30"
                max="300"
                step="5"
                value={panelWattage}
                onChange={(e) => setPanelWattage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 accent-indigo-600 rounded-lg appearance-none cursor-pointer"
                id="panel-range"
              />

              {/* Presets Grid */}
              <div className="flex flex-wrap gap-1">
                {panelPresets.map((size) => (
                  <button
                    key={size}
                    onClick={() => setPanelWattage(size)}
                    className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                      panelWattage === size
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {size}W
                  </button>
                ))}
              </div>
            </div>

            {/* MPPT Controller Efficiency Toggle (Requested) */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5 text-indigo-500" />
                  Solar MPPT Controller
                </label>
                <p className="text-[10px] text-slate-400 max-w-[200px] leading-snug">
                  Enabling adds standard MPPT efficiency scale factor of 95% to total yield calculations.
                </p>
              </div>
              <button
                onClick={() => setMpptEnabled(!mpptEnabled)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer outline-none flex items-center gap-1.5 capitalize ${
                  mpptEnabled
                    ? 'bg-indigo-600/15 border-indigo-400 text-indigo-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
                id="mppt-toggle-btn"
              >
                <span className={`w-2 h-2 rounded-full ${mpptEnabled ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
                {mpptEnabled ? '95% MPPT Enabled' : 'No Controller Loss'}
              </button>
            </div>

            {/* Selector: Custom Weather Presets (Requested) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Quick Weather Presets (Auto-update Irradiance)
              </label>
              
              <div className="grid grid-cols-2 gap-1.5" id="weather-selector-grid">
                {weatherPresets.map((preset) => {
                  const isActive = irradiancePercent === preset.value;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setIrradiancePercent(preset.value);
                        setIsTimeSimActive(false); // Overrides simulation
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-400 text-amber-900 font-bold'
                          : 'bg-slate-50 border-slate-200/50 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs font-medium">{preset.label}</span>
                      <span className="text-[10px] font-bold font-mono text-slate-500">{preset.value}% Sun</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider: Time-of-Day Simulation (Requested) */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Time-of-Day Simulation
                </label>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono border ${
                  isTimeSimActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                  {isTimeSimActive ? 'Active Profile' : 'Paused / Manual'}
                </span>
              </div>

              {/* Slider for simulated time (Hour 6 = 6 AM to Hour 18 = 6 PM) */}
              <input
                type="range"
                min="6"
                max="18"
                step="1"
                value={simulatedHour}
                onChange={handleTimeSliderChange}
                className="w-full h-1.5 bg-slate-100 accent-indigo-600 rounded-lg appearance-none cursor-pointer"
                id="time-range-slider"
              />

              <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                <span>Sunrise (6 AM)</span>
                <span className="text-indigo-600">{formatHourString(simulatedHour)}</span>
                <span>Sunset (6 PM)</span>
              </div>

              {/* Live Solar Arc Profile Info */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Simulated Environment:</span>
                  <span className="font-bold text-slate-800">{formatHourString(simulatedHour)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Irradiance Coefficient:</span>
                  <span className="font-black text-amber-600">{getIrradianceForTime(simulatedHour)}% Sun</span>
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1 leading-normal block">
                  Solar Arc Logic: Irradiance peaks at 12 PM (100%) and reduces to 10% during early morning and late evenings.
                </p>
              </div>
            </div>

            {/* Slider: Manual Sun Irradiance Intensity override */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Manual Adjust Irradiance
                </label>
                <span className="text-xs font-black font-mono text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {irradiancePercent}% Irradiance
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={irradiancePercent}
                onChange={handleIrradianceSliderChange}
                className="w-full h-1.5 bg-slate-100 accent-amber-500 rounded-lg appearance-none cursor-pointer"
                id="manual-irradiance-slider"
              />
            </div>

          </section>

          {/* Visualizer & Dynamic Sizing output right-side column */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Cooler Visualizer showing active motor speed animation */}
            <CoolerVisualizer stats={calculationResult} coolerName={activeCooler.name} />

            {/* Daily Operational Simulation log section (Requested) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="daily-simulation-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Daily Solar Simulation Log (6 AM - 6 PM)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modulation logs showing operations state through sunrise-to-sunset peak curve.
                  </p>
                </div>
                
                {/* Simulation control elements */}
                <button
                  onClick={() => setIsSimulationRun(!isSimulationRun)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
                  id="toggle-simulation-btn"
                >
                  <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                  {isSimulationRun ? 'Hide Simulation Data' : 'Run Daily Simulation'}
                </button>
              </div>

              {isSimulationRun ? (
                <div className="overflow-x-auto rounded-xl border border-slate-150">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 font-mono text-[10px] text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Simulated Time</th>
                        <th className="py-2.5 px-3 text-center">Irradiance (%)</th>
                        <th className="py-2.5 px-3 text-center">Available Power</th>
                        <th className="py-2.5 px-3 text-right">Controller Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hr => {
                        const hrIrr = getIrradianceForTime(hr);
                        const hrResult = calculateOperatingState(panelWattage, hrIrr, activeCooler.wattage, mpptEfficiency);
                        
                        // Check if item is currently simulated hour
                        const isCurrentActive = isTimeSimActive && simulatedHour === hr;
                        const formattedTimeLabel = hr === 12 ? '12:00 PM' : hr > 12 ? `${hr - 12}:00 PM` : `${hr}:00 AM`;

                        return (
                          <tr 
                            key={hr} 
                            onClick={() => {
                              setSimulatedHour(hr);
                              setIrradiancePercent(hrIrr);
                              setIsTimeSimActive(true);
                            }}
                            className={`transition-colors text-xs cursor-pointer ${
                              isCurrentActive 
                                ? 'bg-indigo-50/80 font-bold border-l-2 border-indigo-600' 
                                : 'hover:bg-slate-50/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-slate-900 font-medium">
                              <span className="flex items-center gap-1.5">
                                {isCurrentActive && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />}
                                {formattedTimeLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{hrIrr}%</td>
                            <td className="py-2.5 px-3 text-center font-medium font-mono text-emerald-600">{hrResult.availablePower} W</td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                hrResult.mode === 'Full Speed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                hrResult.mode === 'Normal Mode' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                                hrResult.mode === 'Eco Mode' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                hrResult.mode === 'Low Mode' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-rose-50 text-rose-600 border border-rose-100/50'
                              }`}>
                                {hrResult.mode}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="p-3 bg-slate-50 text-[10px] text-slate-400 italic font-sans text-center border-t border-slate-100">
                    💡 Click any simulated row time slot above to instantly lock and sync the system's operational dials to that hour of day.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-6 text-center text-slate-500 text-xs">
                  <p className="font-medium">The comprehensive time-modulation simulation is currently hidden.</p>
                  <button 
                    onClick={() => setIsSimulationRun(true)}
                    className="mt-3 text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                  >
                    Click to load hour-by-hour operational records.
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Charts & Diagnostics Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Charts Container */}
          <SizingCharts 
            panelWattage={panelWattage}
            currentIrradiance={irradiancePercent}
            coolerWattage={activeCooler.wattage}
            availablePower={calculationResult.availablePower}
            mpptEfficiency={mpptEfficiency}
            simulatedHour={simulatedHour}
            setSimulatedHour={setSimulatedHour}
            setIrradiancePercent={setIrradiancePercent}
            setIsTimeSimActive={setIsTimeSimActive}
          />

          {/* Sizing Diagnostics advice component */}
          <SizingDiagnostics 
            panelWattage={panelWattage}
            cooler={activeCooler}
            irradiance={irradiancePercent}
            mpptEfficiency={mpptEfficiency}
          />

        </div>

        {/* Sizing Analytics Component */}
        <SizingAnalytics 
          panelWattage={panelWattage}
          currentIrradiance={irradiancePercent}
          coolerWattage={activeCooler.wattage}
          activeCooler={activeCooler}
          availablePower={calculationResult.availablePower}
          mpptEfficiency={mpptEfficiency}
          simulatedHour={simulatedHour}
          setSimulatedHour={setSimulatedHour}
          setIrradiancePercent={setIrradiancePercent}
          setIsTimeSimActive={setIsTimeSimActive}
        />

        {/* Dynamic educational science panel */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-white text-xs space-y-4" id="educational-panel">
          <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-sm mb-1">
            <Info className="w-5 h-5 text-amber-500" />
            Solar Direct-Coupled DC Air Cooler Science
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 leading-relaxed">
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-200 text-sm">How it Operates without Batteries</h4>
              <p className="text-slate-300 font-normal">
                Unlike traditional AC air conditioners that rely on steady high-voltage grids, Direct-DC air coolers couple their internal fan motors and water pump controls directly to the DC output of solar panels. When solar irradiance changes, motor voltage changes proportionately.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-200 text-sm">The 20-75% Efficiency Drop</h4>
              <p className="text-slate-300 font-normal">
                As sunlight clouds over, we recommend modulating speeds (Full &rarr; Normal &rarr; Eco &rarr; Low) rather than immediately shutting off. Modulating prevents standard DC water pumps from stalling, protecting internal copper windings while maximizing cool water vaporization.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-200 text-sm">Over-Sizing: A Wise Design Choice</h4>
              <p className="text-slate-300 font-normal">
                For a 70W cooler, installing a 100W or 150W solar panel provides a safety margin. This allows the system to reach the full fan speed of 100% at only 70% or 47% sun strength, allowing your cooler to run at high speed even during cloudy weather!
              </p>
            </div>
          </div>
        </div>

      </main>

      <footer className="mt-auto pt-8 text-center text-slate-450 text-[11px] font-mono border-t border-slate-200 max-w-7xl mx-auto w-full print:hidden">
        <p>Solar Direct Mode Sizing Calculator for DC Air Coolers &copy; 2026. Designed for sustainable off-grid housing.</p>
      </footer>
    </div>
  );
}
