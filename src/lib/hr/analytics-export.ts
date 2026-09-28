import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'
import type { HRAnalyticsSummary } from '@/lib/hr/analytics'

export const HR_ANALYTICS_WORKBOOK_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type WorkbookCell = number | string | null | undefined

type WorkbookSheet = {
  columns: number[]
  headers: string[]
  name: string
  rows: WorkbookCell[][]
}

type ZipEntry = {
  content: Buffer
  name: string
}

const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/

const stripInvalidXMLChars = (value: string): string =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

const escapeXML = (value: string): string =>
  stripInvalidXMLChars(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const escapeAttribute = (value: string): string => escapeXML(value).slice(0, 31)

const safeText = (value: WorkbookCell): string => {
  const text = String(value ?? '')
  return FORMULA_PREFIX_PATTERN.test(text) ? `'${text}` : text
}

const formatDateForFilename = (value: string): string => value.slice(0, 10)

const columnName = (index: number): string => {
  let name = ''
  let current = index

  while (current > 0) {
    const remainder = (current - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - remainder) / 26)
  }

  return name
}

const cellXML = (
  value: WorkbookCell,
  rowIndex: number,
  columnIndex: number,
  isHeader = false,
): string => {
  const reference = `${columnName(columnIndex)}${rowIndex}`
  const style = isHeader ? 1 : 0

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}" s="${style}"><v>${value}</v></c>`
  }

  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXML(
    safeText(value),
  )}</t></is></c>`
}

const rowXML = (values: WorkbookCell[], rowIndex: number, isHeader = false): string =>
  `<row r="${rowIndex}">${values
    .map((value, index) => cellXML(value, rowIndex, index + 1, isHeader))
    .join('')}</row>`

const worksheetXML = (sheet: WorkbookSheet): string => {
  const columns = sheet.columns
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join('')
  const rows = [
    rowXML(sheet.headers, 1, true),
    ...sheet.rows.map((row, index) => rowXML(row, index + 2)),
  ].join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${columns}</cols>
  <sheetData>${rows}</sheetData>
</worksheet>`
}

const stylesXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="10"/><color rgb="FF0D253D"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF533AFD"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border>
      <left style="thin"><color rgb="FFE3E8EE"/></left>
      <right style="thin"><color rgb="FFE3E8EE"/></right>
      <top style="thin"><color rgb="FFE3E8EE"/></top>
      <bottom style="thin"><color rgb="FFE3E8EE"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF4434D4"/></left>
      <right style="thin"><color rgb="FF4434D4"/></right>
      <top style="thin"><color rgb="FF4434D4"/></top>
      <bottom style="thin"><color rgb="FF4434D4"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" wrapText="1"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`

const crcTable = (() => {
  const table: number[] = []

  for (let i = 0; i < 256; i += 1) {
    let value = i
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[i] = value >>> 0
  }

  return table
})()

const crc32 = (buffer: Buffer): number => {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

const getDosTimestamp = (date: Date): { date: number; time: number } => ({
  date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
})

const createZip = (entries: ZipEntry[]): Buffer => {
  const now = getDosTimestamp(new Date())
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  entries.forEach((entry) => {
    const nameBuffer = Buffer.from(entry.name, 'utf8')
    const checksum = crc32(entry.content)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(now.time, 10)
    localHeader.writeUInt16LE(now.date, 12)
    localHeader.writeUInt32LE(checksum, 14)
    localHeader.writeUInt32LE(entry.content.length, 18)
    localHeader.writeUInt32LE(entry.content.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localParts.push(localHeader, nameBuffer, entry.content)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(now.time, 12)
    centralHeader.writeUInt16LE(now.date, 14)
    centralHeader.writeUInt32LE(checksum, 16)
    centralHeader.writeUInt32LE(entry.content.length, 20)
    centralHeader.writeUInt32LE(entry.content.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, nameBuffer)

    offset += localHeader.length + nameBuffer.length + entry.content.length
  })

  const centralDirectory = Buffer.concat(centralParts)
  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0)
  endRecord.writeUInt16LE(0, 4)
  endRecord.writeUInt16LE(0, 6)
  endRecord.writeUInt16LE(entries.length, 8)
  endRecord.writeUInt16LE(entries.length, 10)
  endRecord.writeUInt32LE(centralDirectory.length, 12)
  endRecord.writeUInt32LE(offset, 16)
  endRecord.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, endRecord])
}

const toBuffer = (content: string): Buffer => Buffer.from(content, 'utf8')

export const getHRAnalyticsWorkbookFilename = (summary: HRAnalyticsSummary): string =>
  `hr-analytics-${formatDateForFilename(summary.filters.fromISO)}-to-${formatDateForFilename(summary.filters.toISO)}.xlsx`

export const buildHRAnalyticsWorkbook = (summary: HRAnalyticsSummary): Buffer => {
  const sheets: WorkbookSheet[] = [
    {
      columns: [18, 28, 22, 18, 12, 16, 16, 20, 16, 22, 20, 18, 14, 12],
      headers: [
        'Employee Code',
        'Employee Name',
        'Role',
        'State',
        'Score',
        'Attendance %',
        'Jobs Created',
        'Applications Added',
        'Stage Moves',
        'Interviews Scheduled',
        'Placements Closed',
        'Managed Clients',
        'Leave Days',
        'LOP Days',
      ],
      name: 'Employee Analytics',
      rows: summary.employeeRows.map((row) => [
        row.employeeCode,
        row.name,
        INTERNAL_ROLE_LABELS[row.role],
        row.state,
        row.score,
        row.attendancePct,
        row.jobsCreated,
        row.applicationsAdded,
        row.stageMoves,
        row.interviewsScheduled,
        row.placementsClosed,
        row.managedClients,
        row.leaveDays,
        row.lopDays,
      ]),
    },
    {
      columns: [32, 24],
      headers: ['Metric', 'Value'],
      name: 'KPI Summary',
      rows: [
        ['From', summary.filters.fromISO],
        ['To', summary.filters.toISO],
        [
          'Role Filter',
          summary.filters.role === 'all' ? 'All Roles' : INTERNAL_ROLE_LABELS[summary.filters.role],
        ],
        ['State Filter', summary.filters.state || 'All States'],
        ['Selected Employee ID', summary.filters.employeeId || 'All Employees'],
        ['Workforce', summary.kpis.workforce],
        ['Attendance Compliance %', summary.kpis.attendanceCompliancePct],
        ['Average Performance Score', summary.kpis.avgPerformanceScore],
        ['Approved Leave Days', summary.kpis.approvedLeaveDays],
        ['LOP Days', summary.kpis.lopDays],
        ['Jobs Created', summary.kpis.jobsCreated],
        ['Sourced Applications', summary.kpis.sourcedApplications],
        ['Stage Moves', summary.kpis.stageMoves],
        ['Interviews Scheduled', summary.kpis.interviewsScheduled],
        ['Active Clients', summary.kpis.totalActiveClients],
        ['Payroll Gross', summary.kpis.payrollGross],
        ['Payroll Net', summary.kpis.payrollNet],
        ['Payout Success %', summary.kpis.payoutSuccessPct],
      ],
    },
    {
      columns: [16, 14, 12, 12, 12, 12, 12, 16, 14, 14],
      headers: [
        'Date',
        'Label',
        'Present',
        'Half Day',
        'Leave',
        'Absent',
        'LOP',
        'Applications',
        'Interviews',
        'Placements',
      ],
      name: 'Daily Trend',
      rows: summary.trend.map((point) => [
        point.dateISO,
        point.label,
        point.present,
        point.halfDay,
        point.leave,
        point.absent,
        point.lop,
        point.applications,
        point.interviews,
        point.placements,
      ]),
    },
    {
      columns: [26, 14, 18],
      headers: ['Leave Type', 'Requests', 'Approved Days'],
      name: 'Leave Breakdown',
      rows: summary.leaveBreakdown.map((point) => [point.label, point.requests, point.days]),
    },
    {
      columns: [16, 20, 20],
      headers: ['Month', 'Gross Earnings', 'Net Payable'],
      name: 'Payroll Trend',
      rows: summary.payrollTrend.map((point) => [point.label, point.gross, point.net]),
    },
  ]

  const workbookRels = sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')
  const createdAt = new Date().toISOString()

  const entries: ZipEntry[] = [
    {
      content: toBuffer(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}
</Types>`),
      name: '[Content_Types].xml',
    },
    {
      content: toBuffer(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
      name: '_rels/.rels',
    },
    {
      content: toBuffer(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>ATS</dc:creator>
  <cp:lastModifiedBy>ATS</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`),
      name: 'docProps/core.xml',
    },
    {
      content: toBuffer(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>ATS</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">
      ${sheets.map((sheet) => `<vt:lpstr>${escapeXML(sheet.name)}</vt:lpstr>`).join('')}
    </vt:vector>
  </TitlesOfParts>
</Properties>`),
      name: 'docProps/app.xml',
    },
    {
      content: toBuffer(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${escapeAttribute(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join('')}
  </sheets>
</workbook>`),
      name: 'xl/workbook.xml',
    },
    {
      content: toBuffer(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
      name: 'xl/_rels/workbook.xml.rels',
    },
    {
      content: toBuffer(stylesXML),
      name: 'xl/styles.xml',
    },
    ...sheets.map((sheet, index) => ({
      content: toBuffer(worksheetXML(sheet)),
      name: `xl/worksheets/sheet${index + 1}.xml`,
    })),
  ]

  return createZip(entries)
}
