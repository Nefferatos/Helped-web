export type Money = { amount: number; currency: string }
const round = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100

export const calculateFirstMonthSalary = (input: { monthlySalary: number; daysWorked: number; daysInMonth: number; deductions?: number }) =>
  round((input.monthlySalary * Math.max(0, input.daysWorked)) / Math.max(1, input.daysInMonth) - (input.deductions ?? 0))

export const calculateRestDayCompensation = (input: { monthlySalary: number; restDaysWorked: number; multiplier?: number }) =>
  round((input.monthlySalary / 26) * Math.max(0, input.restDaysWorked) * (input.multiplier ?? 1))

export const calculatePlacementLoanBalance = (input: { principal: number; repayments: number[]; interestRatePercent?: number }) => {
  const principalWithInterest = input.principal * (1 + Math.max(0, input.interestRatePercent ?? 0) / 100)
  const repaid = input.repayments.reduce((sum, payment) => sum + Math.max(0, payment), 0)
  return round(Math.max(0, principalWithInterest - repaid))
}

export const calculateAgencyInvoice = (input: { placementFee: number; adminFee?: number; insuranceFee?: number; discounts?: number; taxRatePercent?: number }) => {
  const subtotal = Math.max(0, input.placementFee) + Math.max(0, input.adminFee ?? 0) + Math.max(0, input.insuranceFee ?? 0) - Math.max(0, input.discounts ?? 0)
  const tax = subtotal * Math.max(0, input.taxRatePercent ?? 0) / 100
  return { subtotal: round(subtotal), tax: round(tax), total: round(subtotal + tax) }
}

export const calculateRefundEligibility = (input: { startDate: string; endDate: string; guaranteeDays: number; paidFee: number }) => {
  const elapsedDays = Math.max(0, Math.floor((Date.parse(input.endDate) - Date.parse(input.startDate)) / 86_400_000))
  const eligible = elapsedDays <= Math.max(0, input.guaranteeDays)
  const refundableAmount = eligible ? round(Math.max(0, input.paidFee) * (1 - elapsedDays / Math.max(1, input.guaranteeDays))) : 0
  return { eligible, elapsedDays, refundableAmount }
}
