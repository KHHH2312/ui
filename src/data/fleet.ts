import type { PresetId } from '../lib/types.ts'
import type { Tone } from '../lib/format.ts'
import type { ModuleId } from './nav.ts'

export interface FleetKpi {
  label: string
  value: string
  unit?: string
  delta: string
  deltaTone: Tone
  tone: Tone
  footnote: string
  spark: number[]
}

export const FLEET_KPIS: FleetKpi[] = [
  { label: 'Monitored assets', value: '148', delta: '+4 this week', deltaTone: 'nv', tone: 'neutral', footnote: '3 plants', spark: [138, 139, 141, 141, 143, 144, 144, 146, 148] },
  { label: 'Active anomalies', value: '3', delta: '1 critical', deltaTone: 'crit', tone: 'warn', footnote: '2 under mitigation', spark: [1, 1, 2, 1, 2, 2, 3, 2, 3] },
  { label: 'Interventions today', value: '7', delta: '7/7 gate-validated', deltaTone: 'nv', tone: 'nv', footnote: '0 overrides', spark: [2, 3, 3, 4, 4, 5, 6, 6, 7] },
  { label: 'Production preserved', value: '96.4', unit: '%', delta: '+25.1 pts vs trip', deltaTone: 'nv', tone: 'nv', footnote: 'rolling 24 h', spark: [93, 94, 95, 94, 96, 95, 96, 97, 96.4] },
  { label: 'Avoided downtime', value: '41.5', unit: 'h', delta: '$1.28M saved MTD', deltaTone: 'nv', tone: 'neutral', footnote: 'month to date', spark: [4, 9, 12, 18, 22, 27, 31, 36, 41.5] },
  { label: 'Plant OEE', value: '87.2', unit: '%', delta: '+1.8 pts WoW', deltaTone: 'nv', tone: 'neutral', footnote: 'world-class ≥ 85%', spark: [84, 85, 84.6, 85.4, 86, 85.8, 86.6, 87, 87.2] },
]

export interface MachineCard {
  id: string
  name: string
  type: 'turbine' | 'pump' | 'compressor'
  location: string
  health: number
  status: string
  tone: Tone
  preset: PresetId
  vibration: number
  vibrationUnit: string
  rul: string
  trend: number[]
}

export const MACHINES: MachineCard[] = [
  {
    id: 'P-204',
    name: 'Cooling Water Pump',
    type: 'pump',
    location: 'Cooling Loop 2',
    health: 48,
    status: 'Cavitation risk',
    tone: 'crit',
    preset: 'pump_cavitation',
    vibration: 6.1,
    vibrationUnit: 'mm/s',
    rul: '96 h',
    trend: [2.0, 2.1, 2.0, 2.2, 2.4, 2.9, 3.6, 4.4, 5.1, 5.7, 6.1],
  },
  {
    id: 'C-310',
    name: 'Compressor Train B',
    type: 'compressor',
    location: 'Compression Bay 3',
    health: 61,
    status: 'Bearing degradation',
    tone: 'warn',
    preset: 'bearing_degradation',
    vibration: 5.8,
    vibrationUnit: 'mm/s',
    rul: '216 h',
    trend: [2.1, 2.2, 2.2, 2.4, 2.8, 3.3, 3.9, 4.5, 5.0, 5.4, 5.8],
  },
  {
    id: 'GT-101',
    name: 'Gas Turbine Generator 1',
    type: 'turbine',
    location: 'Turbine Hall',
    health: 96,
    status: 'Nominal',
    tone: 'nv',
    preset: 'healthy_baseline',
    vibration: 1.4,
    vibrationUnit: 'mm/s',
    rul: '11.8k h',
    trend: [1.4, 1.35, 1.42, 1.38, 1.4, 1.36, 1.41, 1.39, 1.37, 1.4, 1.4],
  },
]

export const FLEET_MIX = [
  { id: 'P-205', label: 'Standby pump · Loop 2', health: 91, tone: 'nv' as Tone },
  { id: 'K-118', label: 'Air compressor · Utilities', health: 88, tone: 'nv' as Tone },
  { id: 'ST-202', label: 'Steam turbine · CHP', health: 84, tone: 'nv' as Tone },
  { id: 'P-311', label: 'Feed pump · Boiler 3', health: 73, tone: 'warn' as Tone },
]

export interface FleetEvent {
  id: string
  time: string
  tone: Tone
  asset: string
  title: string
  detail: string
}

export const INITIAL_EVENTS: FleetEvent[] = [
  { id: 'ev-1', time: '14:32:08', tone: 'crit', asset: 'P-204', title: 'Cavitation signature detected', detail: 'Neural score 0.95 · NPSH margin 0.93 — triage recommended' },
  { id: 'ev-2', time: '14:30:17', tone: 'warn', asset: 'C-310', title: 'Speed reduced 12% (validated)', detail: 'CMD-C310-0927-0412 acknowledged · WO-48213 created' },
  { id: 'ev-3', time: '14:18:44', tone: 'nv', asset: 'K-118', title: 'Gate PASS · setpoint restored', detail: 'Post-maintenance verification complete' },
  { id: 'ev-4', time: '14:02:10', tone: 'info', asset: 'ST-202', title: 'Model v3.2 rollout', detail: 'Temporal transformer promoted on Brev A100 pool' },
  { id: 'ev-5', time: '13:47:55', tone: 'nv', asset: 'GT-101', title: 'Health check nominal', detail: 'ISO 10816-3 zone A · no action required' },
]

/** Rotating pool used to keep the live stream moving during a demo. */
export const EVENT_POOL: Array<Omit<FleetEvent, 'id' | 'time'>> = [
  { tone: 'nv', asset: 'P-205', title: 'Standby readiness verified', detail: 'Lead-lag test passed · 0.4 s switchover' },
  { tone: 'info', asset: 'Brev', title: 'Inference batch complete', detail: '148 assets scored · p50 38 ms on A100-80GB' },
  { tone: 'warn', asset: 'P-311', title: 'Seal temperature trending', detail: '+3.1 °C / 6 h · watchlist, no action' },
  { tone: 'nv', asset: 'ST-202', title: 'Gate PASS', detail: 'Vibration 2.1 mm/s · zone A/B boundary respected' },
  { tone: 'info', asset: 'CMMS', title: 'Work order synced', detail: 'WO-48213 parts kitted · Crew B notified' },
]

export interface ModuleHealth {
  id: ModuleId
  status: string
  tone: Tone
  metric: string
}

export const MODULE_HEALTH: ModuleHealth[] = [
  { id: 'manufacturing', status: 'Attention', tone: 'warn', metric: 'OEE 87.2%' },
  { id: 'inventory', status: 'Healthy', tone: 'nv', metric: '99.2% accuracy' },
  { id: 'procurement', status: 'Healthy', tone: 'nv', metric: '214 open POs' },
  { id: 'warehousing', status: 'Healthy', tone: 'nv', metric: '78% capacity' },
  { id: 'distribution', status: 'Healthy', tone: 'nv', metric: '97.3% fill rate' },
  { id: 'transportation', status: 'Watch', tone: 'warn', metric: '94.8% on-time' },
  { id: 'crm', status: 'Healthy', tone: 'nv', metric: 'CSAT 4.6' },
  { id: 'it', status: 'Healthy', tone: 'nv', metric: '99.98% uptime' },
]
