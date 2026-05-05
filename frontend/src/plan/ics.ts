// plan/ics.ts — .ics 日历文件生成与导出

import type { DayPlan } from './storage'

/** 获取当前 UTC 时间的 ICS 格式 (YYYYMMDDTHHMMSSZ) */
function nowICS(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  const s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${day}T${h}${min}${s}Z`
}

/** 格式化 ICS 日期 (UTC) */
function toICSDate(dateStr: string, withTime: boolean): string {
  const d = dateStr.replace(/-/g, '')
  return withTime ? `${d}T080000Z` : d
}

/** 转义 ICS 文本（RFC 5545） */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/** 生成单个 VEVENT */
function makeEvent(day: DayPlan): string {
  const uid = `fitpacer-${day.date}-${Date.now()}@fitpacer`
  const dtStart = toICSDate(day.date, true)
  const dtEnd = toICSDate(day.date, true).replace('080000', '090000') // 1 hour

  let summary: string
  let description: string

  if (day.type === 'strength') {
    summary = '💪 力量训练'
    description = day.details
  } else {
    summary = '🏃 有氧训练'
    description = day.details
  }

  const lines = [
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `UID:${uid}`,
    `DTSTAMP:${nowICS()}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    'TRANSP:OPAQUE',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(summary)} 即将开始`,
    'END:VALARM',
    'END:VEVENT'
  ]
  return lines.join('\r\n')
}

/** 生成完整的 .ics 文件内容 */
export function generateICS(plan: DayPlan[]): string {
  const events = plan
    .filter(d => d.type !== 'rest' && !d.missed)
    .map(makeEvent)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FitPacer//Training Calendar//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:FitPacer 训练计划',
    'X-WR-TIMEZONE:Asia/Shanghai',
    ...events,
    'END:VCALENDAR',
    ''  // trailing CRLF required by some parsers
  ]
  return lines.join('\r\n')
}

/** 导出 .ics 文件并触发下载 */
export function exportICS(plan: DayPlan[]): void {
  const content = generateICS(plan)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `FitPacer_训练计划_${new Date().toISOString().slice(0, 10)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 获取 ICS 的 Blob URL（用于直接打开系统日历） */
export function getICSBlobUrl(plan: DayPlan[]): string {
  const content = generateICS(plan)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  return URL.createObjectURL(blob)
}

/** 获取 ICS 的 File 对象（用于 navigator.share） */
export function getICSFile(plan: DayPlan[]): File {
  const content = generateICS(plan)
  const filename = `FitPacer_训练计划_${new Date().toISOString().slice(0, 10)}.ics`
  return new File([content], filename, { type: 'text/calendar;charset=utf-8' })
}
