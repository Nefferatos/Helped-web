import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import {
  WorkflowAutomationLogRecord,
  WorkflowContractRecord,
  WorkflowInquiryRecord,
  WorkflowLeadRecord,
  WorkflowMakeDeliveryRecord,
  WorkflowMatchRecord,
  WorkflowNotificationRecord,
  WorkflowScheduleRecord,
} from '../types/workflow'

interface WorkflowData {
  leads: WorkflowLeadRecord[]
  inquiries: WorkflowInquiryRecord[]
  matches: WorkflowMatchRecord[]
  schedules: WorkflowScheduleRecord[]
  contracts: WorkflowContractRecord[]
  notifications: WorkflowNotificationRecord[]
  automationLogs: WorkflowAutomationLogRecord[]
  makeDeliveries: WorkflowMakeDeliveryRecord[]
  counters: {
    leads: number
    inquiries: number
    matches: number
    schedules: number
    contracts: number
    notifications: number
    automationLogs: number
    makeDeliveries: number
  }
}

const now = () => new Date().toISOString()
const dataDir = path.resolve(__dirname, '../../data')
const dataFile = path.join(dataDir, 'workflow-data.json')

const defaultData = (): WorkflowData => ({
  leads: [],
  inquiries: [],
  matches: [],
  schedules: [],
  contracts: [],
  notifications: [],
  automationLogs: [],
  makeDeliveries: [],
  counters: {
    leads: 1,
    inquiries: 1,
    matches: 1,
    schedules: 1,
    contracts: 1,
    notifications: 1,
    automationLogs: 1,
    makeDeliveries: 1,
  },
})

let cache: WorkflowData | null = null

const ensureDataFile = async () => {
  await mkdir(dataDir, { recursive: true })

  try {
    await readFile(dataFile, 'utf8')
  } catch {
    await writeFile(dataFile, JSON.stringify(defaultData(), null, 2), 'utf8')
  }
}

const loadData = async (): Promise<WorkflowData> => {
  if (cache) {
    return cache
  }

  await ensureDataFile()
  const raw = await readFile(dataFile, 'utf8')
  const parsed = JSON.parse(raw) as Partial<WorkflowData>
  cache = {
    ...defaultData(),
    ...parsed,
    leads: parsed.leads ?? [],
    inquiries: parsed.inquiries ?? [],
    matches: parsed.matches ?? [],
    schedules: parsed.schedules ?? [],
    contracts: parsed.contracts ?? [],
    notifications: parsed.notifications ?? [],
    automationLogs: parsed.automationLogs ?? [],
    makeDeliveries: parsed.makeDeliveries ?? [],
    counters: {
      ...defaultData().counters,
      ...parsed.counters,
    },
  }
  await writeFile(dataFile, JSON.stringify(cache, null, 2), 'utf8')
  return cache
}

const saveData = async (data: WorkflowData) => {
  cache = data
  await writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8')
}

export const initializeWorkflowStore = async () => {
  await ensureDataFile()
  await loadData()
}

export const listWorkflowLeadsStore = async () => {
  const data = await loadData()
  return [...data.leads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const createWorkflowLeadStore = async (
  payload: Omit<WorkflowLeadRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>
) => {
  const data = await loadData()
  const record: WorkflowLeadRecord = {
    id: data.counters.leads++,
    status: payload.classification === 'HIGH' ? 'qualified' : 'new',
    createdAt: now(),
    updatedAt: now(),
    ...payload,
  }

  data.leads.unshift(record)
  await saveData(data)
  return record
}

export const createWorkflowInquiryStore = async (
  payload: Omit<WorkflowInquiryRecord, 'id' | 'createdAt'>
) => {
  const data = await loadData()
  const record: WorkflowInquiryRecord = {
    id: data.counters.inquiries++,
    createdAt: now(),
    ...payload,
  }

  data.inquiries.unshift(record)
  await saveData(data)
  return record
}

export const createWorkflowMatchRecordsStore = async (
  payloads: Array<Omit<WorkflowMatchRecord, 'id' | 'createdAt'>>
) => {
  const data = await loadData()
  const createdAt = now()
  const records = payloads.map<WorkflowMatchRecord>((payload) => ({
    id: data.counters.matches++,
    createdAt,
    ...payload,
  }))

  data.matches.unshift(...records)
  await saveData(data)
  return records
}

export const createWorkflowScheduleStore = async (
  payload: Omit<WorkflowScheduleRecord, 'id' | 'status' | 'createdAt'>
) => {
  const data = await loadData()
  const record: WorkflowScheduleRecord = {
    id: data.counters.schedules++,
    status: 'scheduled',
    createdAt: now(),
    ...payload,
  }

  data.schedules.unshift(record)
  await saveData(data)
  return record
}

export const createWorkflowContractStore = async (
  payload: Omit<WorkflowContractRecord, 'id' | 'status' | 'createdAt'>
) => {
  const data = await loadData()
  const record: WorkflowContractRecord = {
    id: data.counters.contracts++,
    status: 'draft',
    createdAt: now(),
    ...payload,
  }

  data.contracts.unshift(record)
  await saveData(data)
  return record
}

export const createWorkflowNotificationStore = async (
  payload: Omit<WorkflowNotificationRecord, 'id' | 'status' | 'createdAt'>
) => {
  const data = await loadData()
  const record: WorkflowNotificationRecord = {
    id: data.counters.notifications++,
    status: 'sent',
    createdAt: now(),
    ...payload,
  }

  data.notifications.unshift(record)
  await saveData(data)
  return record
}

export const createWorkflowAutomationLogStore = async (
  payload: Omit<WorkflowAutomationLogRecord, 'id' | 'createdAt'>
) => {
  const data = await loadData()
  const record: WorkflowAutomationLogRecord = {
    id: data.counters.automationLogs++,
    createdAt: now(),
    ...payload,
  }

  data.automationLogs.unshift(record)
  await saveData(data)
  return record
}

export const createWorkflowMakeDeliveryStore = async (
  payload: Omit<WorkflowMakeDeliveryRecord, 'id' | 'createdAt'>
) => {
  const data = await loadData()
  const record: WorkflowMakeDeliveryRecord = {
    id: data.counters.makeDeliveries++,
    createdAt: now(),
    ...payload,
  }

  data.makeDeliveries.unshift(record)
  await saveData(data)
  return record
}

export const getWorkflowSnapshotStore = async () => {
  return await loadData()
}
